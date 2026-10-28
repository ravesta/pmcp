/**
 * Implementasi Prisma untuk penulisan kartu, riwayat, dan log (FR-16 sampai FR-21).
 *
 * Seluruh metode ber-`tx` berjalan di dalam transaksi use case. Pengendalian konkurensi memakai kolom `version`
 * (optimistis) ditambah kunci baris saat membaca untuk diubah (NFR-10).
 */
import type { PrismaClient } from '@/generated/prisma/client';
import { MESSAGES } from '@/platform/messages';
import { fromDbDate, fromDbTime, toDbDate, toDbTime } from '@/shared/db-date';
import type { IsoDate } from '@/shared/iso-date';
import { AppError } from '@/shared/result';
import type { TxContext } from '@/shared/transaction';
import type { CardColumn } from '../domain/card-types';
import type { CardRecord, CardRepository, WorkLogRow } from '../application/ports';

/** Klien atau transaksi Prisma yang dipakai operasi. */
type Db = PrismaClient;

/** Baris kartu beserta pemilik dan project seperti dibaca dari database. */
export const CARD_INCLUDE = { pic: { select: { name: true } }, project: { select: { code: true, name: true } } } as const;

/**
 * Mengubah baris database menjadi `CardRecord`.
 * Masukan: baris kartu dengan relasi `CARD_INCLUDE`. Keluaran: `CardRecord`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-03, BL-09.
 */
export function toCardRecord(row: {
  id: bigint;
  code: string;
  kind: 'PROJECT' | 'ACTIVITY';
  owner_pic_id: bigint;
  project_id: bigint | null;
  stage: 'BA' | 'DEV' | 'QA' | null;
  step_name: string | null;
  category_name: string | null;
  title: string;
  board_column: CardColumn;
  progress: number;
  progress_needs_input: boolean;
  plan_start: Date;
  plan_end: Date;
  plan_baseline_start: Date;
  plan_baseline_end: Date;
  est_minutes: number | null;
  is_adhoc: boolean;
  done_on: Date | null;
  cancelled_at: Date | null;
  cancel_reason: string | null;
  extends_stage: boolean;
  extension_note: string | null;
  version: number;
  created_at: Date;
  pic: { name: string };
  project: { code: string; name: string } | null;
}): CardRecord {
  return {
    id: Number(row.id),
    code: row.code,
    kind: row.kind,
    ownerPicId: Number(row.owner_pic_id),
    ownerName: row.pic.name,
    projectId: row.project_id === null ? null : Number(row.project_id),
    projectCode: row.project?.code ?? null,
    projectName: row.project?.name ?? null,
    stage: row.stage,
    stepName: row.step_name,
    categoryName: row.category_name,
    title: row.title,
    column: row.board_column,
    progress: row.progress,
    progressNeedsInput: row.progress_needs_input,
    planStart: fromDbDate(row.plan_start) as IsoDate,
    planEnd: fromDbDate(row.plan_end) as IsoDate,
    baselineStart: fromDbDate(row.plan_baseline_start) as IsoDate,
    baselineEnd: fromDbDate(row.plan_baseline_end) as IsoDate,
    estimateMinutes: row.est_minutes,
    isAdhoc: row.is_adhoc,
    doneOn: fromDbDate(row.done_on),
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    extendsStage: row.extends_stage,
    extensionNote: row.extension_note,
    version: row.version,
    createdAt: row.created_at,
  };
}

/** Kode galat PostgreSQL untuk pelanggaran pengecualian (trigger bentrok waktu log). */
const EXCLUSION_VIOLATION = '23P01';

/**
 * Memeriksa apakah galat berasal dari trigger bentrok waktu log (permintaan yang berlomba).
 * Masukan: galat apa pun. Keluaran: true bila bentrok waktu log.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-28, TD-15.
 */
function isOverlapViolation(error: unknown): boolean {
  const text = error instanceof Error ? `${error.message} ${JSON.stringify((error as { meta?: unknown }).meta ?? '')} ${String((error as { code?: unknown }).code ?? '')}` : '';
  return text.includes('work_log_overlap') || text.includes(EXCLUSION_VIOLATION);
}

/**
 * Membuat repository penulisan kartu di atas klien Prisma.
 * Masukan: klien Prisma. Keluaran: `CardRepository`.
 * Efek samping: tidak ada pada pembuatan; metode yang dikembalikan menulis tabel kartu dan log.
 * Rujukan: Technical Design §6.1, database-design §6.
 */
export function createPrismaCardRepository(prisma: PrismaClient): CardRepository {
  const inTx = (tx: TxContext): Db => tx as unknown as Db;

  return {
    /** Menyimpan kartu baru; kode `KB-nnnnn` dari sequence. Efek samping: INSERT `card`. */
    async insertCard(tx, card) {
      const created = await inTx(tx).card.create({
        data: {
          kind: card.kind,
          owner_pic_id: BigInt(card.ownerPicId),
          project_id: card.projectId === null ? null : BigInt(card.projectId),
          stage: card.stage,
          step_name: card.stepName,
          category_name: card.categoryName,
          title: card.title,
          board_column: card.column,
          plan_start: toDbDate(card.planStart) as Date,
          plan_end: toDbDate(card.planEnd) as Date,
          plan_baseline_start: toDbDate(card.planStart) as Date,
          plan_baseline_end: toDbDate(card.planEnd) as Date,
          est_minutes: card.estimateMinutes,
          is_adhoc: card.isAdhoc,
        },
        select: { id: true, code: true },
      });
      return { id: Number(created.id), code: created.code };
    },

    /** Mengunci dan membaca kartu. Efek samping: mengunci baris kartu sampai transaksi selesai. */
    async lockCard(tx, cardId) {
      const db = inTx(tx);
      await db.$queryRawUnsafe('SELECT id FROM card WHERE id = $1 FOR UPDATE', cardId);
      const row = await db.card.findUnique({ where: { id: BigInt(cardId) }, include: CARD_INCLUDE });
      return row ? toCardRecord(row) : null;
    },

    /** Menyimpan kolom dan progres dengan syarat versi. Efek samping: UPDATE `card`. */
    async saveState(tx, cardId, expectedVersion, patch) {
      const result = await inTx(tx).card.updateMany({
        where: { id: BigInt(cardId), version: expectedVersion },
        data: {
          board_column: patch.column,
          progress: patch.progress,
          progress_needs_input: patch.progressNeedsInput,
          done_on: toDbDate(patch.doneOn),
          version: { increment: 1 },
        },
      });
      return result.count === 1;
    },

    /** Menyimpan rencana terkini dengan syarat versi (rencana awal tetap). Efek samping: UPDATE `card`. */
    async savePlan(tx, cardId, expectedVersion, plan) {
      const result = await inTx(tx).card.updateMany({
        where: { id: BigInt(cardId), version: expectedVersion },
        data: { plan_start: toDbDate(plan.planStart) as Date, plan_end: toDbDate(plan.planEnd) as Date, version: { increment: 1 } },
      });
      return result.count === 1;
    },

    /** Membatalkan kartu dengan syarat versi. Efek samping: UPDATE `card`. */
    async cancel(tx, cardId, expectedVersion, cancel) {
      const result = await inTx(tx).card.updateMany({
        where: { id: BigInt(cardId), version: expectedVersion },
        data: { cancelled_at: cancel.at, cancel_reason: cancel.reason, version: { increment: 1 } },
      });
      return result.count === 1;
    },

    /** Menandai kartu sebagai asal perpanjangan estimasi. Efek samping: UPDATE `card`. */
    async markExtendsStage(tx, cardId, note) {
      await inTx(tx).card.update({ where: { id: BigInt(cardId) }, data: { extends_stage: true, extension_note: note.slice(0, 300) } });
    },

    /** Mencatat perubahan progres. Efek samping: INSERT `card_progress_event`. */
    async appendProgressEvent(tx, event) {
      await inTx(tx).card_progress_event.create({
        data: { card_id: BigInt(event.cardId), old_value: event.oldValue, new_value: event.newValue, source: event.source, created_by: BigInt(event.createdBy) },
      });
    },

    /** Mencatat jadwal ulang dan menghitung jumlahnya. Efek samping: INSERT `card_reschedule`. */
    async appendReschedule(tx, row) {
      const db = inTx(tx);
      await db.card_reschedule.create({
        data: {
          card_id: BigInt(row.cardId),
          old_start: toDbDate(row.oldStart) as Date,
          old_end: toDbDate(row.oldEnd) as Date,
          new_start: toDbDate(row.newStart) as Date,
          new_end: toDbDate(row.newEnd) as Date,
          reason_name: row.reasonName,
          note: row.note,
          created_by: BigInt(row.createdBy),
        },
      });
      return db.card_reschedule.count({ where: { card_id: BigInt(row.cardId) } });
    },

    /** Menyimpan log; bentrok yang lolos pemeriksaan (permintaan berlomba) ditolak trigger. Efek samping: INSERT `work_log`. */
    async insertLog(tx, log) {
      try {
        const created = await inTx(tx).work_log.create({
          data: {
            card_id: BigInt(log.cardId),
            owner_pic_id: BigInt(log.ownerPicId),
            work_date: toDbDate(log.workDate) as Date,
            start_time: toDbTime(log.span.start),
            end_time: toDbTime(log.span.end),
            step_name: log.stepName,
            description: log.description,
          },
          select: { id: true },
        });
        return Number(created.id);
      } catch (error) {
        if (isOverlapViolation(error)) {
          throw new AppError({ code: 'VALIDATION', message: MESSAGES.LOG_OVERLAP, fields: { time: MESSAGES.LOG_OVERLAP } });
        }
        throw error;
      }
    },

    /** Membaca satu log. Efek samping: tidak ada (hanya baca). */
    async findLog(tx, logId): Promise<WorkLogRow | null> {
      const row = await inTx(tx).work_log.findUnique({ where: { id: BigInt(logId) } });
      return row ? toWorkLogRow(row) : null;
    },

    /** Menghapus log. Efek samping: DELETE `work_log`. */
    async deleteLog(tx, logId) {
      await inTx(tx).work_log.delete({ where: { id: BigInt(logId) } });
    },

    /** Interval log PIC pada satu tanggal. Efek samping: tidak ada (hanya baca). */
    async daySpans(tx, picId, date) {
      const rows = await inTx(tx).work_log.findMany({ where: { owner_pic_id: BigInt(picId), work_date: toDbDate(date) as Date }, select: { start_time: true, end_time: true } });
      return rows.map((row) => ({ start: fromDbTime(row.start_time), end: fromDbTime(row.end_time) }));
    },
  };
}

/**
 * Mengubah baris log database menjadi `WorkLogRow`.
 * Masukan: baris `work_log`. Keluaran: `WorkLogRow`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01.
 */
export function toWorkLogRow(row: {
  id: bigint;
  card_id: bigint;
  owner_pic_id: bigint;
  work_date: Date;
  start_time: Date;
  end_time: Date;
  step_name: string | null;
  description: string;
}): WorkLogRow {
  return {
    id: Number(row.id),
    cardId: Number(row.card_id),
    ownerPicId: Number(row.owner_pic_id),
    workDate: fromDbDate(row.work_date) as IsoDate,
    span: { start: fromDbTime(row.start_time), end: fromDbTime(row.end_time) },
    stepName: row.step_name,
    description: row.description,
  };
}
