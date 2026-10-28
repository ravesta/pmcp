/**
 * Pembantu bersama use case kanban: hak PIC pemilik, penerjemah masalah domain menjadi pesan, penguraian isian,
 * dan pembatal transaksi.
 */
import type { Actor } from '@/modules/auth';
import { can } from '@/modules/auth';
import { MESSAGES } from '@/platform/messages';
import { isIsoDate, type IsoDate } from '@/shared/iso-date';
import { AppError, fail, type ErrorInfo, type Result } from '@/shared/result';
import type {
  CancelIssue,
  CardIssue,
  CardTargetIssue,
  ProgressIssue,
  RescheduleIssue,
} from '../domain/card-rules';
import type { CardState } from '../domain/card-types';
import type { LogIssue } from '../domain/work-log-rules';
import type { CardRecord } from './ports';

/**
 * Memeriksa bahwa pelaku adalah PIC pemilik kartu (Manager dan PIC lain hanya baca, BL-29).
 * Masukan: pelaku dan kartu. Keluaran: hasil gagal FORBIDDEN, atau null bila boleh.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-16-01 butir 5, FR-16-02 butir 1; AC: Manager tidak melihat tombol buat atau pindah.
 */
export function ownerGuard(actor: Actor, card: CardRecord): ErrorInfo | null {
  if (!can(actor, 'card.manage')) return { code: 'FORBIDDEN', message: MESSAGES.CARD_PIC_ONLY };
  if (card.ownerPicId !== actor.picId) return { code: 'FORBIDDEN', message: MESSAGES.CARD_NOT_OWNER };
  return null;
}

/**
 * Mengambil keadaan kartu yang dinilai aturan domain dari catatan kartu.
 * Masukan: kartu tersimpan. Keluaran: `CardState`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-16, FR-21.
 */
export function toCardState(card: CardRecord): CardState {
  return {
    column: card.column,
    progress: card.progress,
    progressNeedsInput: card.progressNeedsInput,
    planStart: card.planStart,
    planEnd: card.planEnd,
    doneOn: card.doneOn,
    cancelled: card.cancelledAt !== null,
  };
}

/**
 * Membaca tanggal `YYYY-MM-DD` dari isian; kosong atau tidak valid menjadi null.
 * Masukan: teks. Keluaran: `IsoDate` atau null.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-03, Security Design §7 (input tidak tepercaya).
 */
export function parseDateField(text: string): IsoDate | null {
  const value = text.trim();
  return isIsoDate(value) ? value : null;
}

/**
 * Membaca estimasi jam desimal dari isian (koma atau titik); kosong = tidak diisi.
 * Masukan: teks. Keluaran: angka, null bila kosong, atau NaN bila bukan angka.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-01 butir 3.
 */
export function parseHoursField(text: string): number | null {
  const value = text.trim().replace(',', '.');
  return value === '' ? null : /^\d{1,3}(\.\d{1,2})?$/.test(value) ? Number(value) : Number.NaN;
}

/**
 * Menerjemahkan masalah isian kartu baru menjadi pesan per isian.
 * Masukan: daftar masalah. Keluaran: peta isian ke pesan (`title`, `plan`, `estimate`).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-01 butir 3.
 */
export function cardIssueMessages(issues: ReadonlyArray<CardIssue>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    if (issue === 'TITLE_TOO_SHORT' || issue === 'TITLE_TOO_LONG') fields.title = MESSAGES.CARD_TITLE_RANGE;
    else if (issue === 'PLAN_REQUIRED') fields.plan = MESSAGES.CARD_PLAN_REQUIRED;
    else if (issue === 'PLAN_END_BEFORE_START') fields.plan = MESSAGES.CARD_PLAN_ORDER;
    else fields.estimate = MESSAGES.CARD_ESTIMATE_RANGE;
  }
  return fields;
}

/**
 * Menerjemahkan penolakan project sasaran kartu menjadi pesan.
 * Masukan: masalah sasaran. Keluaran: pesan Indonesia.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-01 butir 1 dan 4, FR-13-05 butir 6.
 */
export function targetIssueMessage(issue: CardTargetIssue): string {
  if (issue === 'NOT_ASSIGNED') return MESSAGES.CARD_PROJECT_NOT_ASSIGNED;
  if (issue === 'PROJECT_CLOSED') return MESSAGES.CARD_PROJECT_CLOSED;
  return MESSAGES.CARD_STAGE_DONE;
}

/**
 * Menerjemahkan masalah pengisian progres menjadi pesan.
 * Masukan: masalah. Keluaran: pesan Indonesia.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-16-03.
 */
export function progressIssueMessage(issue: ProgressIssue): string {
  if (issue === 'CANCELLED') return MESSAGES.CARD_CANCELLED;
  if (issue === 'NOT_IN_PROGRESS') return MESSAGES.CARD_PROGRESS_NOT_IN_PROGRESS;
  return MESSAGES.CARD_PROGRESS_INVALID;
}

/**
 * Menerjemahkan masalah jadwal ulang menjadi pesan per isian (`plan`, `reason`, `note`, atau umum).
 * Masukan: daftar masalah. Keluaran: peta isian ke pesan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-21-03.
 */
export function rescheduleIssueMessages(issues: ReadonlyArray<RescheduleIssue>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    if (issue === 'CANCELLED') fields.card = MESSAGES.CARD_CANCELLED;
    else if (issue === 'CARD_DONE') fields.card = MESSAGES.CARD_RESCHEDULE_DONE;
    else if (issue === 'DATES_REQUIRED') fields.plan = MESSAGES.CARD_PLAN_REQUIRED;
    else if (issue === 'END_BEFORE_START') fields.plan = MESSAGES.CARD_PLAN_ORDER;
    else if (issue === 'SAME_AS_CURRENT') fields.plan = MESSAGES.CARD_RESCHEDULE_SAME;
    else if (issue === 'REASON_REQUIRED') fields.reason = MESSAGES.CARD_RESCHEDULE_REASON_REQUIRED;
    else fields.note = 'Catatan maksimal 200 karakter.';
  }
  return fields;
}

/**
 * Menerjemahkan masalah pembatalan menjadi pesan.
 * Masukan: masalah. Keluaran: pesan Indonesia.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-21-04.
 */
export function cancelIssueMessage(issue: CancelIssue): string {
  if (issue === 'CARD_DONE') return MESSAGES.CARD_CANCEL_DONE;
  if (issue === 'ALREADY_CANCELLED') return MESSAGES.CARD_CANCELLED;
  if (issue === 'REASON_TOO_LONG') return 'Alasan maksimal 200 karakter.';
  return MESSAGES.CARD_CANCEL_REASON_REQUIRED;
}

/**
 * Menerjemahkan masalah log menjadi pesan per isian (`date`, `time`, `description`, `step`).
 * Masukan: daftar masalah. Keluaran: peta isian ke pesan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 2 dan 6.
 */
export function logIssueMessages(issues: ReadonlyArray<LogIssue>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    if (issue === 'DATE_REQUIRED') fields.date = MESSAGES.LOG_DATE_REQUIRED;
    else if (issue === 'DATE_IN_FUTURE') fields.date = MESSAGES.LOG_DATE_FUTURE;
    else if (issue === 'TIME_INVALID') fields.time = MESSAGES.LOG_TIME_INVALID;
    else if (issue === 'END_NOT_AFTER_START') fields.time = MESSAGES.LOG_TIME_ORDER;
    else if (issue === 'OVERLAP') fields.time = MESSAGES.LOG_OVERLAP;
    else if (issue === 'DESCRIPTION_REQUIRED') fields.description = MESSAGES.LOG_DESCRIPTION_REQUIRED;
    else if (issue === 'DESCRIPTION_TOO_LONG') fields.description = 'Uraian maksimal 300 karakter.';
    else if (issue === 'STEP_REQUIRED') fields.step = MESSAGES.LOG_STEP_REQUIRED;
    else if (issue === 'STEP_UNKNOWN') fields.step = MESSAGES.LOG_STEP_UNKNOWN;
    else fields.step = MESSAGES.LOG_NO_ACTIVE_STEP;
  }
  return fields;
}

/**
 * Membuat hasil gagal VALIDATION dari peta isian.
 * Masukan: peta isian ke pesan (tidak kosong). Keluaran: `Result` gagal dengan pesan isian pertama.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Technical Design §12.
 */
export function validationFailure<T>(fields: Record<string, string>): Result<T> {
  return fail({ code: 'VALIDATION', message: Object.values(fields)[0] ?? MESSAGES.UNEXPECTED, fields });
}

/**
 * Membuka hasil sebuah langkah di dalam transaksi; melempar `AppError` bila gagal sehingga seluruh transaksi
 * dibatalkan (semua atau tidak sama sekali). Dipakai bersama `catchAbort` di luar transaksi.
 * Masukan: hasil langkah. Keluaran: data bila berhasil.
 * Efek samping: melempar `AppError` bila gagal.
 * Rujukan: Technical Design §12 dan §7.3.
 */
export function must<T>(result: Result<T>): T {
  if (result.ok) return result.data;
  throw new AppError(result.error);
}

/**
 * Menjalankan pekerjaan transaksi dan mengubah `AppError` yang dilempar `must` menjadi hasil gagal.
 * Masukan: pekerjaan asinkron. Keluaran: hasil pekerjaan, atau hasil gagal dari `AppError`.
 * Efek samping: sama dengan pekerjaan; galat lain dilempar ulang.
 * Rujukan: Technical Design §12.
 */
export async function catchAbort<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof AppError) return fail(error.info);
    throw error;
  }
}
