/**
 * Implementasi Prisma untuk PIC dan akun PIC.
 */
import type { PrismaClient } from '@/generated/prisma/client';
import type { TxContext } from '@/shared/transaction';
import type { OpenAssignment, PicRepository, PicRow } from '../application/ports';

/** Klien Prisma atau transaksi Prisma. */
type Db = PrismaClient;

/** Baris PIC dengan akunnya (relasi `app_user` pada model `pic`). */
interface PicWithAccount {
  id: bigint;
  name: string;
  stage: 'BA' | 'DEV' | 'QA';
  is_active: boolean;
  app_user: { id: bigint; username: string; is_active: boolean } | null;
}

/**
 * Mengubah baris PIC beserta akun menjadi `PicRow`.
 * Masukan: baris. Keluaran: `PicRow`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-08-01 butir 1.
 */
function toPicRow(row: PicWithAccount): PicRow {
  return {
    id: Number(row.id),
    name: row.name,
    stage: row.stage,
    isActive: row.is_active,
    username: row.app_user ? row.app_user.username : null,
    accountActive: row.app_user ? row.app_user.is_active : false,
  };
}

/**
 * Membuat repository PIC di atas klien Prisma.
 * Masukan: klien Prisma. Keluaran: `PicRepository`.
 * Efek samping: tidak ada pada pembuatan; metode yang dikembalikan membaca dan menulis `pic` dan `app_user`.
 * Rujukan: Technical Design §6.1, database-design §3.
 */
export function createPrismaPicRepository(prisma: PrismaClient): PicRepository {
  const inTx = (tx: TxContext): Db => tx as unknown as Db;

  return {
    /** Daftar PIC terurut menurut id beserta akun. Efek samping: tidak ada. */
    async list() {
      const rows = await prisma.pic.findMany({ include: { app_user: true }, orderBy: { id: 'asc' } });
      return (rows as unknown as PicWithAccount[]).map(toPicRow);
    },

    /** Mengunci dan membaca satu PIC. Efek samping: mengunci baris sampai transaksi selesai. */
    async findForUpdate(tx, picId) {
      const db = inTx(tx);
      await db.$queryRawUnsafe('SELECT id FROM pic WHERE id = $1 FOR UPDATE', picId);
      const row = await db.pic.findUnique({ where: { id: BigInt(picId) }, include: { app_user: true } });
      return row ? toPicRow(row as unknown as PicWithAccount) : null;
    },

    /** Memeriksa username sudah dipakai. Efek samping: mengambil kunci per username agar dua pembuatan serentak berurutan. Rujukan: EC-08-01.01. */
    async usernameExists(tx, username) {
      const db = inTx(tx);
      await db.$executeRawUnsafe('SELECT pg_advisory_xact_lock(7002, hashtext($1))', username); // serialkan username sama
      return (await db.app_user.findUnique({ where: { username } })) !== null;
    },

    /** Membuat PIC. Efek samping: INSERT `pic`. */
    async create(tx, input) {
      const created = await inTx(tx).pic.create({ data: { name: input.name, stage: input.stage } });
      return Number(created.id);
    },

    /** Membuat akun PIC dengan password sementara (wajib ganti). Efek samping: INSERT `app_user`. */
    async createAccount(tx, input) {
      const created = await inTx(tx).app_user.create({
        data: {
          username: input.username,
          role: 'PIC',
          pic_id: BigInt(input.picId),
          password_hash: input.passwordHash,
          must_change_password: true,
          password_changed_at: input.now,
        },
      });
      return Number(created.id);
    },

    /** Mengubah nama PIC. Efek samping: UPDATE `pic`. */
    async rename(tx, picId, name) {
      await inTx(tx).pic.update({ where: { id: BigInt(picId) }, data: { name } });
    },

    /** Mengubah status PIC dan akunnya. Efek samping: UPDATE `pic` dan `app_user`. Mengembalikan id akun bila ada. */
    async setActive(tx, picId, active) {
      const db = inTx(tx);
      await db.pic.update({ where: { id: BigInt(picId) }, data: { is_active: active } });
      const account = await db.app_user.findUnique({ where: { pic_id: BigInt(picId) } });
      if (!account) return null;
      await db.app_user.update({ where: { id: account.id }, data: { is_active: active } });
      return Number(account.id);
    },

    /** Mencari id akun PIC. Efek samping: tidak ada. */
    async findAccountId(tx, picId) {
      const account = await inTx(tx).app_user.findUnique({ where: { pic_id: BigInt(picId) } });
      return account ? Number(account.id) : null;
    },

    /** Daftar tahapan belum Selesai yang masih menugaskan PIC. Efek samping: tidak ada. Rujukan: EC-08-01.03. */
    async listOpenAssignments(picId): Promise<OpenAssignment[]> {
      const rows = await prisma.stage_assignment.findMany({
        where: { pic_id: BigInt(picId), project_stage: { status: { not: 'DONE' } } },
        include: { project_stage: { include: { project: true } } },
        orderBy: { stage_id: 'asc' },
      });
      return rows.map((row) => ({
        projectCode: row.project_stage.project.code,
        projectName: row.project_stage.project.name,
        stage: row.project_stage.stage,
      }));
    },
  };
}
