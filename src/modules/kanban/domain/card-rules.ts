/**
 * Aturan kartu Kanban: validasi kartu baru, hak PIC, perpindahan kolom, progres, jadwal ulang, pembatalan, dan
 * penanda rencana (FR-16, FR-17, FR-21; BL-24, BL-25, BL-27 sampai BL-37, BL-40a).
 *
 * Seluruh fungsi murni; "hari ini" dan pelaku diberikan pemanggil (Security Design §2, NFR-16).
 */
import { calendarDaysBetween } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import { roundHalfUp } from '@/shared/rounding';
import { CARD_PROGRESS_CHOICES, type CardColumn, type CardState } from './card-types';

/** Batas isian kartu (FR-17-01 butir 3, FR-21-03, FR-21-04). */
export const CARD_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  /** Estimasi jam maksimum 80 jam, disimpan dalam menit (FR-07-05 butir 2). */
  maxEstimateMinutes: 4800,
  reasonMax: 200,
  noteMax: 200,
} as const;

/** Masalah isian kartu baru. */
export type CardIssue = 'TITLE_TOO_SHORT' | 'TITLE_TOO_LONG' | 'PLAN_REQUIRED' | 'PLAN_END_BEFORE_START' | 'ESTIMATE_INVALID';

/** Isian kartu baru yang divalidasi. */
export interface NewCardFields {
  readonly title: string;
  readonly planStart: IsoDate | null;
  readonly planEnd: IsoDate | null;
  /** Estimasi jam desimal; null bila tidak diisi. */
  readonly estimateHours: number | null;
}

/**
 * Memvalidasi isian kartu baru dan mengubah estimasi jam menjadi menit.
 * Masukan: isian kartu. Keluaran: daftar masalah dan estimasi menit (dibulatkan ke menit terdekat, null bila kosong).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-01 butir 3, FR-21-01 butir 2; AC: estimasi jam 0 ditolak.
 */
export function checkNewCard(fields: NewCardFields): { issues: CardIssue[]; estimateMinutes: number | null } {
  const issues: CardIssue[] = [];
  const title = fields.title.trim();
  if (title.length < CARD_LIMITS.titleMin) issues.push('TITLE_TOO_SHORT');
  if (title.length > CARD_LIMITS.titleMax) issues.push('TITLE_TOO_LONG');
  if (!fields.planStart || !fields.planEnd) issues.push('PLAN_REQUIRED');
  else if (fields.planEnd < fields.planStart) issues.push('PLAN_END_BEFORE_START');
  let estimateMinutes: number | null = null;
  if (fields.estimateHours !== null) {
    estimateMinutes = roundHalfUp(fields.estimateHours * 60);
    if (!Number.isFinite(fields.estimateHours) || estimateMinutes <= 0 || estimateMinutes > CARD_LIMITS.maxEstimateMinutes) {
      issues.push('ESTIMATE_INVALID');
      estimateMinutes = null;
    }
  }
  return { issues, estimateMinutes };
}

/** Status project yang masih boleh dibuatkan kartu baru (BL-25). */
const CARD_ELIGIBLE_PROJECT_STATUSES = ['BACKLOG', 'RUNNING', 'DEFERRED'] as const;

/** Alasan sebuah project dan tahapan tidak dapat dibuatkan kartu. */
export type CardTargetIssue = 'NOT_ASSIGNED' | 'PROJECT_CLOSED' | 'STAGE_DONE';

/** Fakta project dan tahapan sasaran kartu. */
export interface CardTarget {
  readonly projectStatus: string;
  readonly stageStatus: string;
  /** True bila PIC pembuat ditugaskan pada tahapan itu (tahapan tetap PIC, BA atau QA). */
  readonly isAssigned: boolean;
}

/**
 * Menilai apakah PIC boleh membuat kartu pada project dan tahapan itu.
 * Masukan: fakta sasaran. Keluaran: masalah, atau null bila boleh. Dipaksa di server (BL-24, BL-25).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-01 butir 1 dan 4, FR-13-05 butir 6; AC: project Batal tidak muncul dan ditolak.
 */
export function checkCardTarget(target: CardTarget): CardTargetIssue | null {
  if (!target.isAssigned) return 'NOT_ASSIGNED';
  if (!(CARD_ELIGIBLE_PROJECT_STATUSES as ReadonlyArray<string>).includes(target.projectStatus)) return 'PROJECT_CLOSED';
  if (target.stageStatus === 'DONE') return 'STAGE_DONE';
  return null;
}

/**
 * Menentukan apakah status project perlu dikonfirmasi PIC saat membuat kartu (Backlog atau Ditunda).
 * Masukan: status project. Keluaran: true bila konfirmasi wajib dijawab.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-02 butir 1, 2 dan 5.
 */
export function needsStatusConfirmation(projectStatus: string): boolean {
  return projectStatus === 'BACKLOG' || projectStatus === 'DEFERRED';
}

/**
 * Progres kartu yang berlaku: Planned 0, Done 100, In Progress sesuai pilihan (belum diisi dianggap 0).
 * Masukan: keadaan kartu. Keluaran: 0 sampai 100.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-16-03 butir 1 dan 2, BL-40a.
 */
export function effectiveCardProgress(card: Pick<CardState, 'column' | 'progress'>): number {
  if (card.column === 'DONE') return 100;
  if (card.column === 'PLANNED') return 0;
  return card.progress;
}

/** Hasil pemindahan kolom: perubahan yang harus disimpan, atau penolakan. */
export type MovePlan =
  | { readonly ok: false; readonly issue: 'CANCELLED' | 'SAME_COLUMN' }
  | {
      readonly ok: true;
      readonly column: CardColumn;
      readonly doneOn: IsoDate | null;
      readonly progress: number;
      readonly progressNeedsInput: boolean;
      /** Perubahan progres yang berlaku untuk riwayat (nilai lama dan baru), null bila tidak berubah. */
      readonly progressChange: { readonly from: number; readonly to: number } | null;
    };

/**
 * Merencanakan pemindahan kartu ke kolom lain: ke Done mengisi tanggal selesai hari ini dan progres 100; kembali dari
 * Done mengosongkan tanggal selesai dan, bila ke In Progress, mereset progres ke 0 dengan "Progres perlu diisi"; ke
 * Planned mereset progres ke 0.
 * Masukan: keadaan kartu, kolom tujuan, hari ini. Keluaran: `MovePlan`. Tidak mengubah status tahapan maupun project.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-16-02 butir 2 sampai 5, BL-27, BL-37; AC: ke Done mencatat tanggal selesai hari ini.
 */
export function planMove(card: CardState, target: CardColumn, today: IsoDate): MovePlan {
  if (card.cancelled) return { ok: false, issue: 'CANCELLED' };
  if (card.column === target) return { ok: false, issue: 'SAME_COLUMN' };
  const before = effectiveCardProgress(card);
  const wasDone = card.column === 'DONE';
  const after = target === 'DONE' ? 100 : 0;
  return {
    ok: true,
    column: target,
    doneOn: target === 'DONE' ? today : null,
    progress: 0,
    progressNeedsInput: wasDone && target === 'IN_PROGRESS',
    progressChange: before === after ? null : { from: before, to: after },
  };
}

/** Masalah pengisian progres kartu. */
export type ProgressIssue = 'CANCELLED' | 'NOT_IN_PROGRESS' | 'INVALID_VALUE';

/**
 * Memeriksa pengisian progres kartu: hanya saat In Progress dan hanya 0, 25, 50, atau 75.
 * Masukan: keadaan kartu dan nilai. Keluaran: masalah, atau null bila boleh.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-16-03 butir 1 dan 2; AC: kartu Planned tidak menyediakan pilihan progres.
 */
export function checkCardProgress(card: CardState, value: number): ProgressIssue | null {
  if (card.cancelled) return 'CANCELLED';
  if (card.column !== 'IN_PROGRESS') return 'NOT_IN_PROGRESS';
  if (!(CARD_PROGRESS_CHOICES as ReadonlyArray<number>).includes(value)) return 'INVALID_VALUE';
  return null;
}

/** Masalah jadwal ulang. */
export type RescheduleIssue =
  | 'CARD_DONE'
  | 'CANCELLED'
  | 'DATES_REQUIRED'
  | 'END_BEFORE_START'
  | 'SAME_AS_CURRENT'
  | 'REASON_REQUIRED'
  | 'NOTE_TOO_LONG';

/**
 * Memeriksa jadwal ulang: kartu belum Done dan tidak dibatalkan, rencana baru valid dan berbeda dari yang berlaku,
 * alasan master terpilih, catatan maksimum 200.
 * Masukan: keadaan kartu, rencana baru (boleh null), apakah alasan terpilih, dan catatan. Keluaran: daftar masalah.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-21-03 butir 1 sampai 3; AC: jadwal ulang tanpa alasan ditolak.
 */
export function checkReschedule(
  card: CardState,
  next: { start: IsoDate | null; end: IsoDate | null },
  hasReason: boolean,
  note: string,
): RescheduleIssue[] {
  if (card.cancelled) return ['CANCELLED'];
  if (card.column === 'DONE') return ['CARD_DONE'];
  const issues: RescheduleIssue[] = [];
  if (!next.start || !next.end) issues.push('DATES_REQUIRED');
  else if (next.end < next.start) issues.push('END_BEFORE_START');
  else if (next.start === card.planStart && next.end === card.planEnd) issues.push('SAME_AS_CURRENT');
  if (!hasReason) issues.push('REASON_REQUIRED');
  if (note.trim().length > CARD_LIMITS.noteMax) issues.push('NOTE_TOO_LONG');
  return issues;
}

/** Peringatan batas jadwal ulang (tidak memblokir). */
export interface RescheduleWarning {
  readonly reached: boolean;
  /** Jumlah jadwal ulang termasuk yang baru disimpan. */
  readonly count: number;
  readonly threshold: number;
}

/**
 * Menilai peringatan batas jadwal ulang: muncul bila jumlah (termasuk yang baru) mencapai atau melewati batas master.
 * Masukan: jumlah jadwal ulang sesudah disimpan dan batas peringatan. Keluaran: `RescheduleWarning`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-21-03 butir 4, FR-08-05; AC: jadwal ulang ketiga pada batas 3 memberi peringatan dan tetap tersimpan.
 */
export function rescheduleWarning(count: number, threshold: number): RescheduleWarning {
  return { reached: count >= threshold, count, threshold };
}

/** Masalah pembatalan kartu. */
export type CancelIssue = 'CARD_DONE' | 'ALREADY_CANCELLED' | 'REASON_REQUIRED' | 'REASON_TOO_LONG';

/**
 * Memeriksa pembatalan kartu: belum Done, belum dibatalkan, alasan wajib maksimum 200 (spasi saja dianggap kosong).
 * Masukan: keadaan kartu dan alasan. Keluaran: masalah, atau null bila boleh.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-21-04 butir 1; EC-13-01.06; AC: pembatalan tanpa alasan ditolak.
 */
export function checkCancel(card: CardState, reason: string): CancelIssue | null {
  if (card.cancelled) return 'ALREADY_CANCELLED';
  if (card.column === 'DONE') return 'CARD_DONE';
  const trimmed = reason.trim();
  if (trimmed.length === 0) return 'REASON_REQUIRED';
  if (trimmed.length > CARD_LIMITS.reasonMax) return 'REASON_TOO_LONG';
  return null;
}

/** Penanda rencana yang dihitung server setiap tampil (FR-21-02 butir 2). */
export type PlanMarker =
  | { readonly kind: 'NOT_STARTED' }
  | { readonly kind: 'PAST_PLAN'; readonly days: number }
  | { readonly kind: 'ON_PLAN' }
  | { readonly kind: 'LATE_DONE'; readonly days: number }
  | { readonly kind: 'ADHOC' }
  | { readonly kind: 'OVER_ESTIMATE' }
  | { readonly kind: 'RESCHEDULED'; readonly count: number; readonly warn: boolean }
  | { readonly kind: 'EXTENDS_STAGE'; readonly workdays: number }
  | { readonly kind: 'PROGRESS_NEEDED' };

/** Fakta kartu untuk menghitung penanda. */
export interface MarkerInput extends CardState {
  readonly isAdhoc: boolean;
  readonly loggedMinutes: number;
  readonly estimateMinutes: number | null;
  readonly rescheduleCount: number;
  readonly rescheduleThreshold: number;
  /** Hari kerja kartu project memperpanjang estimasi tahapan; 0 bila tidak. */
  readonly extendsStageWorkdays: number;
  readonly today: IsoDate;
}

/**
 * Menghitung penanda rencana kartu: Belum dimulai, Melewati rencana, Sesuai rencana, Terlambat, Dadakan, Melebihi
 * estimasi jam, Jadwal ulang, Di luar estimasi tahapan, dan Progres perlu diisi. Memakai rencana terkini.
 * Masukan: `MarkerInput`. Keluaran: daftar penanda berurutan tetap.
 * Efek samping: tidak ada (fungsi murni). Penanda tidak pernah diisi pengguna.
 * Rujukan: FR-21-02 butir 1 sampai 3; AC: Planned dengan rencana mulai kemarin = Belum dimulai; Done dua hari
 * setelah rencana selesai = Terlambat 2 hr.
 */
export function computeMarkers(input: MarkerInput): PlanMarker[] {
  const markers: PlanMarker[] = [];
  if (input.column === 'PLANNED' && input.planStart < input.today) markers.push({ kind: 'NOT_STARTED' });
  if (input.column !== 'DONE' && input.planEnd < input.today) {
    markers.push({ kind: 'PAST_PLAN', days: calendarDaysBetween(input.planEnd, input.today) });
  }
  if (input.column === 'DONE' && input.doneOn) {
    if (input.doneOn <= input.planEnd) markers.push({ kind: 'ON_PLAN' });
    else markers.push({ kind: 'LATE_DONE', days: calendarDaysBetween(input.planEnd, input.doneOn) });
  }
  if (input.isAdhoc) markers.push({ kind: 'ADHOC' });
  if (input.estimateMinutes !== null && input.loggedMinutes > input.estimateMinutes) markers.push({ kind: 'OVER_ESTIMATE' });
  if (input.rescheduleCount > 0) {
    markers.push({ kind: 'RESCHEDULED', count: input.rescheduleCount, warn: input.rescheduleCount >= input.rescheduleThreshold });
  }
  if (input.extendsStageWorkdays > 0) markers.push({ kind: 'EXTENDS_STAGE', workdays: input.extendsStageWorkdays });
  if (input.column === 'IN_PROGRESS' && input.progressNeedsInput) markers.push({ kind: 'PROGRESS_NEEDED' });
  return markers;
}
