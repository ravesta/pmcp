/**
 * Model bar Gantt sebuah tahapan: lapisan tanggal yang digambar UI (estimasi terkini, estimasi awal, aktual,
 * hold, tambahan hasil revisi, telat murni) beserta penanda teksnya (FR-12-02, BL-17).
 *
 * Model hanya memuat tanggal dan penanda; pemetaan ke piksel dan warna dilakukan komponen UI.
 */
import { addDays, calendarDaysBetween } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import { completionVerdict, type CompletionVerdict } from './stage-lateness';
import type { Estimate, HoldPeriod, ProjectStatus, StageStatus } from './stage-types';

/** Data tahapan untuk membentuk bar. */
export interface GanttStageInput {
  readonly stageStatus: StageStatus;
  readonly projectStatus: ProjectStatus;
  readonly estimate: Estimate | null;
  readonly baseline: Estimate | null;
  readonly actualStart: IsoDate | null;
  readonly actualEnd: IsoDate | null;
  /** Hold selesai dan hold berjalan (resumedOn null). */
  readonly holds: ReadonlyArray<HoldPeriod>;
  readonly revisionCount: number;
  readonly revisionWarnThreshold: number;
  readonly today: IsoDate;
}

/** Bar tahapan siap gambar. Null bila tahapan belum punya timeline (baris tetap tampil tanpa bar). */
export interface GanttBar {
  /** Estimasi terkini (badan bar). */
  readonly estimate: Estimate;
  /** Estimasi awal bila berbeda dari terkini (garis putus-putus). */
  readonly baseline: Estimate | null;
  /** Garis aktual di bawah bar; `end` null berarti masih berjalan sampai hari ini. */
  readonly actual: { readonly start: IsoDate; readonly end: IsoDate } | null;
  /** Segmen aktual yang dijeda hold (garis aktual berjeda). */
  readonly holdSegments: ReadonlyArray<Estimate>;
  /** Bagian estimasi terkini yang melewati estimasi awal (kuning bergaris di dalam bar). */
  readonly extension: Estimate | null;
  /** Bagian aktual yang melewati estimasi terkini (merah bergaris setelah ujung bar). */
  readonly overrun: (Estimate & { readonly days: number }) | null;
  /** Jumlah revisi (penanda R n); 0 berarti tanpa revisi. */
  readonly revisionCount: number;
  /** Bar diberi garis tepi merah (terlambat, atau selesai telat). */
  readonly lateOutline: boolean;
  /** Peringatan revisi berulang pada bar (FR-13-04). */
  readonly repeatedRevision: boolean;
  /** Hasil penilaian untuk tahapan yang sudah selesai; null bila belum selesai. */
  readonly completion: CompletionVerdict | null;
}

/**
 * Membentuk model bar Gantt dari data tahapan.
 * Masukan: `GanttStageInput`. Keluaran: `GanttBar`, atau null bila tahapan tanpa timeline (tidak digambar).
 * Aturan: tambahan = bagian estimasi terkini setelah akhir estimasi awal; telat murni = hari setelah estimasi
 * terkini sampai selesai aktual (atau sampai hari ini bila belum selesai, hanya pada project Berjalan dan tidak
 * Ditahan); hold ditampilkan sebagai jeda pada garis aktual.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 1 (tahapan tanpa timeline tidak digambar), FR-12-02 butir 1 sampai 7, BL-17, CL-026, CL-027.
 */
export function ganttBarModel(input: GanttStageInput): GanttBar | null {
  const { estimate } = input;
  if (!estimate) return null;

  const baselineDiffers =
    input.baseline !== null && (input.baseline.start !== estimate.start || input.baseline.end !== estimate.end);
  const baseline = baselineDiffers ? input.baseline : null;

  const extensionStart = input.baseline ? addDays(input.baseline.end, 1) : null;
  const extension =
    input.baseline && extensionStart && estimate.end > input.baseline.end
      ? { start: extensionStart > estimate.start ? extensionStart : estimate.start, end: estimate.end }
      : null;

  const actualEnd = input.stageStatus === 'DONE' ? input.actualEnd : input.today;
  const actual = input.actualStart && actualEnd ? { start: input.actualStart, end: actualEnd } : null;

  const holdSegments: Estimate[] = [];
  for (const hold of input.holds) {
    const end = hold.resumedOn === null ? input.today : addDays(hold.resumedOn, -1);
    if (end >= hold.since) holdSegments.push({ start: hold.since, end });
  }

  let overrun: GanttBar['overrun'] = null;
  let completion: CompletionVerdict | null = null;
  let lateOutline = false;
  if (input.stageStatus === 'DONE' && input.actualEnd) {
    completion = completionVerdict(input.actualEnd, estimate, input.baseline);
    if (completion.kind === 'LATE') {
      lateOutline = true;
      overrun = { start: addDays(estimate.end, 1), end: input.actualEnd, days: completion.days };
    }
  } else if (input.projectStatus === 'RUNNING' && input.stageStatus !== 'HELD' && estimate.end < input.today) {
    lateOutline = true;
    overrun = {
      start: addDays(estimate.end, 1),
      end: input.today,
      days: calendarDaysBetween(estimate.end, input.today),
    };
  }

  return {
    estimate,
    baseline,
    actual,
    holdSegments,
    extension,
    overrun,
    revisionCount: input.revisionCount,
    lateOutline,
    repeatedRevision: input.revisionCount >= input.revisionWarnThreshold,
    completion,
  };
}
