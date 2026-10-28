/**
 * Keterlambatan tahapan dan status tampilan turunan (FR-13-03, FR-05-01 butir 7, BL-04, BL-14, BL-22).
 *
 * "n hari" pada penanda keterlambatan adalah hari KALENDER; sesuatu terlambat bila estimasi selesainya sebelum
 * hari ini (estimasi selesai hari ini belum terlambat), NFR-16 butir 4.
 */
import { calendarDaysBetween } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import type { Estimate, ProjectStatus, StageStatus } from './stage-types';

/** Data tahapan yang dibutuhkan untuk menilai keterlambatan. */
export interface LatenessInput {
  readonly stageStatus: StageStatus;
  readonly projectStatus: ProjectStatus;
  /** Estimasi terkini; null bila belum ada timeline. */
  readonly estimate: Estimate | null;
  /** Estimasi awal; null bila belum ada timeline. */
  readonly baseline: Estimate | null;
  readonly today: IsoDate;
}

/** Hasil penilaian keterlambatan tahapan yang belum selesai. */
export interface Lateness {
  readonly isLate: boolean;
  /** Hari kalender melewati estimasi terkini; 0 bila tidak terlambat. */
  readonly daysPastCurrent: number;
  /** Hari kalender melewati estimasi awal; 0 bila tidak terlambat. */
  readonly daysPastBaseline: number;
}

/**
 * Menilai apakah tahapan terlambat: estimasi terkini terlewati, belum Selesai, tidak Ditahan, dan project Berjalan.
 * Masukan: status tahapan dan project, estimasi terkini dan awal, hari ini. Keluaran: `Lateness`.
 * Efek samping: tidak ada (fungsi murni). Sistem tidak pernah mengubah tanggal otomatis.
 * Rujukan: FR-13-03 butir 1 dan 4, BL-14, BL-22; AC: hari ini Rabu 28/10/2026, estimasi selesai Jumat 23/10 = 5 hari.
 */
export function stageLateness(input: LatenessInput): Lateness {
  const notLate: Lateness = { isLate: false, daysPastCurrent: 0, daysPastBaseline: 0 };
  if (input.projectStatus !== 'RUNNING') return notLate;
  if (input.stageStatus === 'DONE' || input.stageStatus === 'HELD') return notLate;
  if (!input.estimate || input.estimate.end >= input.today) return notLate;
  const baselineEnd = input.baseline?.end ?? input.estimate.end;
  return {
    isLate: true,
    daysPastCurrent: calendarDaysBetween(input.estimate.end, input.today),
    daysPastBaseline: calendarDaysBetween(baselineEnd, input.today),
  };
}

/** Hasil penilaian tahapan yang sudah selesai terhadap estimasinya (CL-026). */
export type CompletionVerdict =
  | { readonly kind: 'ON_TIME' }
  | { readonly kind: 'LATE'; readonly days: number }
  | { readonly kind: 'PAST_BASELINE'; readonly days: number };

/**
 * Menilai tahapan Selesai: "Telat +n hari" bila selesai setelah estimasi terkini, "Lewat estimasi awal +n hari"
 * bila tepat waktu terhadap estimasi terkini tetapi melewati estimasi awal, selain itu tepat waktu.
 * Masukan: tanggal selesai aktual, estimasi terkini, estimasi awal (boleh null). Keluaran: `CompletionVerdict`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-02 butir 4, BL-17, CL-026; AC: selesai 3 hari setelah estimasi terkini = "Telat +3 hari".
 */
export function completionVerdict(actualEnd: IsoDate, estimate: Estimate, baseline: Estimate | null): CompletionVerdict {
  if (actualEnd > estimate.end) return { kind: 'LATE', days: calendarDaysBetween(estimate.end, actualEnd) };
  if (baseline && actualEnd > baseline.end) {
    return { kind: 'PAST_BASELINE', days: calendarDaysBetween(baseline.end, actualEnd) };
  }
  return { kind: 'ON_TIME' };
}

/** Status tampilan turunan sebuah tahapan (FR-05-01 butir 7). */
export type DisplayStatus =
  | { readonly kind: 'DONE' }
  | { readonly kind: 'HELD'; readonly since: IsoDate }
  | { readonly kind: 'LATE'; readonly days: number }
  | { readonly kind: 'RUNNING' }
  | { readonly kind: 'UNSCHEDULED' }
  | { readonly kind: 'SHOULD_HAVE_STARTED' }
  | { readonly kind: 'NOT_STARTED' };

/** Masukan status tampilan: data tahapan ditambah tanggal mulai hold bila Ditahan. */
export interface DisplayStatusInput extends LatenessInput {
  /** Tanggal mulai hold berjalan; wajib terisi bila status Ditahan. */
  readonly holdSince: IsoDate | null;
}

/**
 * Menurunkan status tampilan; kondisi dievaluasi berurutan dan yang pertama cocok dipakai: Selesai, Ditahan,
 * Terlambat, Berjalan, Belum dijadwalkan (tanpa timeline), Seharusnya sudah mulai, Belum mulai.
 * Masukan: data tahapan, tanggal hold, hari ini. Keluaran: `DisplayStatus`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-01 butir 7; AC: Berjalan tanpa timeline tetap tampil "Berjalan" (bukan "Belum dijadwalkan").
 */
export function displayStatus(input: DisplayStatusInput): DisplayStatus {
  if (input.stageStatus === 'DONE') return { kind: 'DONE' };
  if (input.stageStatus === 'HELD' && input.holdSince) return { kind: 'HELD', since: input.holdSince };
  const lateness = stageLateness(input);
  if (lateness.isLate) return { kind: 'LATE', days: lateness.daysPastCurrent };
  if (input.stageStatus === 'RUNNING') return { kind: 'RUNNING' };
  if (!input.estimate) return { kind: 'UNSCHEDULED' };
  if (input.estimate.start <= input.today) return { kind: 'SHOULD_HAVE_STARTED' };
  return { kind: 'NOT_STARTED' };
}
