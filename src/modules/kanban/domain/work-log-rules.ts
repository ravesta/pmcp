/**
 * Aturan log activity pada kartu: validasi, bentrok waktu, peringatan 8 jam, dan total waktu (FR-18-01; BL-28, BL-30,
 * CL-005).
 *
 * Waktu ditulis "HH:MM" dan dihitung dalam menit. Seluruh fungsi murni.
 */
import type { IsoDate } from '@/shared/iso-date';

/** Batas uraian log (FR-18-01 butir 2). */
export const LOG_DESCRIPTION_MAX = 300;

/** Total waktu satu PIC per hari yang memicu peringatan, dalam menit (8 jam). */
export const DAY_WARNING_MINUTES = 480;

/** Interval waktu log pada satu tanggal, dalam menit sejak 00:00. */
export interface TimeSpan {
  readonly start: number;
  readonly end: number;
}

/** Masalah isian log. */
export type LogIssue =
  | 'DATE_REQUIRED'
  | 'DATE_IN_FUTURE'
  | 'TIME_INVALID'
  | 'END_NOT_AFTER_START'
  | 'DESCRIPTION_REQUIRED'
  | 'DESCRIPTION_TOO_LONG'
  | 'STEP_REQUIRED'
  | 'STEP_UNKNOWN'
  | 'NO_ACTIVE_STEP'
  | 'OVERLAP';

/**
 * Mengubah teks "HH:MM" menjadi menit sejak 00:00.
 * Masukan: teks. Keluaran: menit 0 sampai 1439, atau null bila bukan jam valid.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 1.
 */
export function parseClockMinutes(text: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Masukan validasi log baru. */
export interface NewLogFields {
  readonly date: IsoDate | null;
  readonly start: string;
  readonly end: string;
  readonly description: string;
  /** Step terpilih; null untuk kartu activity atau belum dipilih. */
  readonly stepName: string | null;
  /** True untuk kartu project (step wajib dari master aktif). */
  readonly isProjectCard: boolean;
  /** Nama step aktif pada tahapan kartu. */
  readonly activeSteps: ReadonlyArray<string>;
  readonly today: IsoDate;
  /** Log PIC yang sama pada tanggal yang sama (lintas kartu). */
  readonly sameDaySpans: ReadonlyArray<TimeSpan>;
}

/**
 * Memvalidasi log baru: tanggal tidak di masa depan, jam selesai setelah jam mulai, uraian wajib, step wajib dari
 * master aktif untuk kartu project, dan tidak bentrok dengan log lain PIC itu pada tanggal yang sama (log yang
 * berimpit tepat tidak bentrok).
 * Masukan: `NewLogFields`. Keluaran: daftar masalah dan interval waktu bila jam valid.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 1, 2, 6; BL-28; AC: log 09:00-11:00 dan 10:00-12:00 bentrok; tanggal esok hari ditolak.
 */
export function checkNewLog(fields: NewLogFields): { issues: LogIssue[]; span: TimeSpan | null } {
  const issues: LogIssue[] = [];
  if (!fields.date) issues.push('DATE_REQUIRED');
  else if (fields.date > fields.today) issues.push('DATE_IN_FUTURE');

  const start = parseClockMinutes(fields.start);
  const end = parseClockMinutes(fields.end);
  let span: TimeSpan | null = null;
  if (start === null || end === null) issues.push('TIME_INVALID');
  else if (end <= start) issues.push('END_NOT_AFTER_START');
  else span = { start, end };

  const description = fields.description.trim();
  if (description.length === 0) issues.push('DESCRIPTION_REQUIRED');
  if (description.length > LOG_DESCRIPTION_MAX) issues.push('DESCRIPTION_TOO_LONG');

  if (fields.isProjectCard) {
    if (fields.activeSteps.length === 0) issues.push('NO_ACTIVE_STEP');
    else if (!fields.stepName) issues.push('STEP_REQUIRED');
    else if (!fields.activeSteps.includes(fields.stepName)) issues.push('STEP_UNKNOWN');
  }

  if (span && fields.sameDaySpans.some((other) => other.start < span.end && other.end > span.start)) issues.push('OVERLAP');
  return { issues, span };
}

/**
 * Menghitung durasi sebuah interval.
 * Masukan: interval. Keluaran: menit.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 1 dan 8 (durasi dalam menit).
 */
export function spanMinutes(span: TimeSpan): number {
  return span.end - span.start;
}

/**
 * Menilai apakah total waktu PIC pada satu hari, termasuk log baru, melebihi 8 jam (peringatan, tidak memblokir).
 * Masukan: menit log yang sudah ada pada hari itu dan menit log baru. Keluaran: true bila melebihi 8 jam.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 2, CL-005; AC: log ke-2 yang menjadikan total 9 jam disimpan dengan peringatan.
 */
export function exceedsDayWarning(existingMinutes: number, addedMinutes: number): boolean {
  return existingMinutes + addedMinutes > DAY_WARNING_MINUTES;
}

/** Ringkasan waktu tercatat. */
export interface LogTotals {
  readonly totalMinutes: number;
  readonly count: number;
  /** Total per nama step (kartu activity tidak punya step). */
  readonly perStep: ReadonlyArray<{ readonly stepName: string; readonly minutes: number }>;
}

/**
 * Menjumlahkan waktu log sebuah kartu: total, jumlah log, dan total per step (urut menurut kemunculan pertama).
 * Masukan: log dengan menit dan step. Keluaran: `LogTotals`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 5.
 */
export function totalLogs(logs: ReadonlyArray<{ minutes: number; stepName: string | null }>): LogTotals {
  const perStep = new Map<string, number>();
  let totalMinutes = 0;
  for (const log of logs) {
    totalMinutes += log.minutes;
    if (log.stepName) perStep.set(log.stepName, (perStep.get(log.stepName) ?? 0) + log.minutes);
  }
  return { totalMinutes, count: logs.length, perStep: [...perStep].map(([stepName, minutes]) => ({ stepName, minutes })) };
}
