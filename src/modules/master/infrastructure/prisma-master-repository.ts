/**
 * Implementasi Prisma untuk master pilihan dan pengaturan ambang.
 */
import type { PrismaClient } from '@/generated/prisma/client';
import type { TxContext } from '@/shared/transaction';
import type { MasterKind } from '../domain/master-rules';
import type { MasterItem, MasterRepository, ThresholdKey } from '../application/ports';

/** Klien Prisma atau transaksi Prisma. */
type Db = PrismaClient;

/** Nama tabel tetap per jenis master (dipakai untuk `SELECT ... FOR UPDATE`; bukan masukan pengguna). */
const TABLE: Readonly<Record<MasterKind, string>> = {
  application: 'affected_application',
  revision_category: 'revision_category',
  activity_category: 'activity_category',
  reschedule_reason: 'reschedule_reason',
  stage_step: 'stage_step',
};

/** Urutan jenis master; dipakai sebagai kunci advisory lock per jenis. */
const KIND_ORDER: ReadonlyArray<MasterKind> = ['application', 'revision_category', 'activity_category', 'reschedule_reason', 'stage_step'];

/**
 * Mengambil satu kunci advisory per jenis master sampai transaksi selesai, sehingga semua perubahan pada
 * satu master berjalan berurutan. Satu kunci per jenis (bukan kunci baris berurutan) mencegah deadlock
 * dan membuat dua penambahan nama sama atau dua penonaktifan serentak aman.
 * Masukan: klien transaksi dan jenis master. Keluaran: janji selesai.
 * Efek samping: menunggu bila transaksi lain sedang mengubah master yang sama.
 * Rujukan: EC-08-02.06, NFR-10, TD-07.
 */
async function lockKind(db: Db, kind: MasterKind): Promise<void> {
  await db.$executeRawUnsafe('SELECT pg_advisory_xact_lock(7004, $1::int)', KIND_ORDER.indexOf(kind));
}

/** Baris master mentah: kolom bersama semua tabel master, kolom lain opsional. */
interface RawRow {
  id: bigint;
  name: string;
  is_active: boolean;
  system_key?: string | null;
  stage?: 'BA' | 'QA' | null;
  sort_order?: number | null;
}

/**
 * Delegasi model minimal yang dimiliki semua tabel master. Dideklarasikan longgar karena tipe delegasi
 * Prisma berbeda per model; pemanggilan selalu memakai field yang ada di semua tabel master.
 */
interface MasterDelegate {
  findMany(args: object): Promise<RawRow[]>;
  findUnique(args: object): Promise<RawRow | null>;
  findFirst(args: object): Promise<RawRow | null>;
  create(args: object): Promise<RawRow>;
  update(args: object): Promise<RawRow>;
}

/**
 * Mengambil delegasi model untuk sebuah jenis master.
 * Masukan: klien atau transaksi dan jenis master. Keluaran: delegasi model.
 * Efek samping: tidak ada.
 * Rujukan: FR-08-02 (aturan umum satu implementasi untuk semua master).
 */
function delegateFor(db: Db, kind: MasterKind): MasterDelegate {
  const delegates: Record<MasterKind, unknown> = {
    application: db.affected_application,
    revision_category: db.revision_category,
    activity_category: db.activity_category,
    reschedule_reason: db.reschedule_reason,
    stage_step: db.stage_step,
  };
  return delegates[kind] as MasterDelegate;
}

/**
 * Menghitung jumlah pemakaian sebuah item pada data transaksi (kolom "Dipakai").
 * Masukan: klien, jenis, dan baris master. Keluaran: jumlah pemakaian.
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: FR-08-02 butir e. Pemakaian oleh project, kartu, dan log baru terisi pada irisan berikutnya.
 */
async function usageCount(db: Db, kind: MasterKind, row: RawRow): Promise<number> {
  switch (kind) {
    case 'application':
      return db.project_application.count({ where: { application_id: row.id } });
    case 'revision_category':
      return db.stage_revision.count({ where: { category_name: row.name } });
    case 'activity_category':
      return db.card.count({ where: { category_name: row.name } });
    case 'reschedule_reason':
      return db.card_reschedule.count({ where: { reason_name: row.name } });
    case 'stage_step':
      return db.work_log.count({ where: { step_name: row.name, card: { stage: row.stage as 'BA' | 'QA' } } });
  }
}

/**
 * Mengubah baris mentah menjadi `MasterItem`.
 * Masukan: baris, jumlah pemakaian. Keluaran: `MasterItem` (id sebagai number).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-08-02.
 */
function toItem(row: RawRow, usedCount: number): MasterItem {
  return {
    id: Number(row.id),
    name: row.name,
    isActive: row.is_active,
    usedCount,
    systemKey: row.system_key ?? null,
    stage: row.stage ?? null,
    sortOrder: row.sort_order ?? null,
  };
}

/**
 * Membuat repository master di atas klien Prisma.
 * Masukan: klien Prisma. Keluaran: `MasterRepository`.
 * Efek samping: tidak ada pada pembuatan; metode yang dikembalikan membaca dan menulis tabel master.
 * Rujukan: Technical Design §6.1, database-design §4.
 */
export function createPrismaMasterRepository(prisma: PrismaClient): MasterRepository {
  const inTx = (tx: TxContext): Db => tx as unknown as Db;

  return {
    /** Daftar item (step terurut menurut urutan, lainnya menurut id) beserta pemakaian. Efek samping: tidak ada. */
    async list(kind, stage) {
      const where = kind === 'stage_step' && stage ? { stage } : {};
      const orderBy = kind === 'stage_step' ? [{ sort_order: 'asc' }, { id: 'asc' }] : [{ id: 'asc' }];
      const rows = await delegateFor(prisma, kind).findMany({ where, orderBy });
      return Promise.all(rows.map(async (row) => toItem(row, await usageCount(prisma, kind, row))));
    },

    /** Mengunci dan membaca satu item (FOR UPDATE). Efek samping: mengunci baris sampai transaksi selesai. */
    async findForUpdate(tx, kind, id) {
      const db = inTx(tx);
      await lockKind(db, kind);
      await db.$queryRawUnsafe(`SELECT id FROM ${TABLE[kind]} WHERE id = $1 FOR UPDATE`, id);
      const row = await delegateFor(db, kind).findUnique({ where: { id: BigInt(id) } });
      return row ? toItem(row, 0) : null;
    },

    /** Memeriksa nama sudah ada (tanpa membedakan huruf besar kecil; per tahapan untuk step). Efek samping: mengambil kunci jenis master. */
    async nameExists(tx, kind, name, stage, exceptId) {
      await lockKind(inTx(tx), kind);
      const row = await delegateFor(inTx(tx), kind).findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          ...(kind === 'stage_step' && stage ? { stage } : {}),
          ...(exceptId !== undefined ? { NOT: { id: BigInt(exceptId) } } : {}),
        },
      });
      return row !== null;
    },

    /** Mengunci dan menghitung item aktif sejenis. Efek samping: mengunci baris aktif sampai transaksi selesai. */
    async countActiveForUpdate(tx, kind, stage) {
      const db = inTx(tx);
      const rows =
        kind === 'stage_step' && stage
          ? await db.$queryRawUnsafe<{ id: bigint }[]>(`SELECT id FROM ${TABLE[kind]} WHERE is_active AND stage = $1::stage_t FOR UPDATE`, stage)
          : await db.$queryRawUnsafe<{ id: bigint }[]>(`SELECT id FROM ${TABLE[kind]} WHERE is_active FOR UPDATE`);
      return rows.length;
    },

    /** Menambah item baru; step mendapat urutan terakhir. Efek samping: INSERT satu baris. */
    async add(tx, kind, name, stage) {
      const db = inTx(tx);
      if (kind === 'stage_step' && stage) {
        const last = await db.stage_step.aggregate({ where: { stage }, _max: { sort_order: true } });
        const created = await db.stage_step.create({ data: { stage, name, sort_order: (last._max.sort_order ?? 0) + 1 } });
        return Number(created.id);
      }
      const created = await delegateFor(db, kind).create({ data: { name } });
      return Number(created.id);
    },

    /** Mengubah nama item. Efek samping: UPDATE satu baris. */
    async rename(tx, kind, id, name) {
      await delegateFor(inTx(tx), kind).update({ where: { id: BigInt(id) }, data: { name } });
    },

    /** Mengubah status aktif item. Efek samping: UPDATE satu baris. */
    async setActive(tx, kind, id, active) {
      await delegateFor(inTx(tx), kind).update({ where: { id: BigInt(id) }, data: { is_active: active } });
    },

    /** Menukar urutan step dengan tetangga. Efek samping: UPDATE dua baris. Mengembalikan false bila di ujung. */
    async swapOrder(tx, id, direction) {
      const db = inTx(tx);
      const current = await db.stage_step.findUnique({ where: { id: BigInt(id) } });
      if (!current) return false;
      const neighbour = await db.stage_step.findFirst({
        where: { stage: current.stage, sort_order: direction === 'up' ? { lt: current.sort_order } : { gt: current.sort_order } },
        orderBy: { sort_order: direction === 'up' ? 'desc' : 'asc' },
      });
      if (!neighbour) return false;
      await db.stage_step.update({ where: { id: current.id }, data: { sort_order: neighbour.sort_order } });
      await db.stage_step.update({ where: { id: neighbour.id }, data: { sort_order: current.sort_order } });
      return true;
    },

    /** Membaca ambang peringatan. Efek samping: tidak ada. */
    async getThreshold(key: ThresholdKey) {
      const row = await prisma.app_setting.findUniqueOrThrow({ where: { key } });
      return row.int_value;
    },

    /** Menyimpan ambang peringatan. Efek samping: UPDATE satu baris. */
    async setThreshold(tx, key: ThresholdKey, value) {
      await inTx(tx).app_setting.update({ where: { key }, data: { int_value: value } });
    },
  };
}
