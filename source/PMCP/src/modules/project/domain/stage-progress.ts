/**
 * Progres tahapan: hitungan sistem dari kartu, angka yang berlaku, progres diharapkan, dan penanda
 * "Tertinggal dari laju" (FR-05-02, BL-40, NFR-16).
 */
import { addDays, workdaysInclusive } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import { percentRounded, roundHalfUp } from '@/shared/rounding';
import type { Estimate, HoldPeriod, ProjectStatus, StageStatus } from './stage-types';

/** Batas selisih (poin persen) yang ditoleransi sebelum tahapan ditandai Tertinggal (BL-40e). */
export const LAGGING_THRESHOLD_POINTS = 20;

/** Batas progres tahapan selama belum Selesai (FR-05-02 butir 1). */
export const MAX_OPEN_STAGE_PROGRESS = 99;

/** Kartu aktif (tidak dibatalkan) yang ikut dihitung pada progres tahapan. */
export interface ProgressCard {
  /** Progres kartu 0 sampai 100 (Planned 0, Done 100, In Progress 0/25/50/75, BL-40a). */
  readonly progress: number;
  readonly plannedStart: IsoDate;
  readonly plannedEnd: IsoDate;
}

/**
 * Menghitung bobot kartu: jumlah hari kerja rencana, minimal 1.
 * Masukan: kartu. Keluaran: bilangan bulat >= 1.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 1, BL-40(b).
 */
export function cardWeight(card: ProgressCard): number {
  return Math.max(1, workdaysInclusive(card.plannedStart, card.plannedEnd));
}

/**
 * Menghitung progres tahapan hitungan sistem: rata-rata progres kartu aktif semua PIC, dibobot hari kerja
 * rencana, dibulatkan setengah naik, dan dibatasi 99% selama tahapan belum Selesai.
 * Masukan: kartu aktif tahapan (tanpa kartu dibatalkan) dan apakah tahapan sudah Selesai.
 * Keluaran: bilangan bulat 0..99 (atau 100 bila Selesai); null bila tidak ada kartu (isi manual).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 1 dan 4, NFR-16 butir 5, BL-40(b); AC: bobot 5 dan 5 hari kerja berprogres 100% dan 0% = 50%.
 */
export function stageSystemProgress(cards: ReadonlyArray<ProgressCard>, stageDone = false): number | null {
  if (cards.length === 0) return null;
  let weighted = 0;
  let totalWeight = 0;
  for (const card of cards) {
    const weight = cardWeight(card);
    weighted += card.progress * weight;
    totalWeight += weight;
  }
  const rounded = roundHalfUp(weighted / totalWeight);
  return stageDone ? 100 : Math.min(rounded, MAX_OPEN_STAGE_PROGRESS);
}

/** Masukan untuk menentukan progres tahapan yang berlaku. */
export interface EffectiveProgressInput {
  readonly status: StageStatus;
  /** Hasil `stageSystemProgress`; null bila tidak ada kartu. */
  readonly systemProgress: number | null;
  /** Angka manual terakhir (0..99); null bila tidak ada penyesuaian. */
  readonly manualProgress: number | null;
}

/**
 * Menentukan angka progres tahapan yang berlaku: 100 bila Selesai, angka manual bila ada, selain itu hitungan
 * sistem, dan 0 bila belum ada keduanya.
 * Masukan: status, hitungan sistem, angka manual. Keluaran: bilangan bulat 0..100.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 3 sampai 5 (angka manual tetap berlaku walau kartu berubah, CL-056).
 */
export function effectiveStageProgress(input: EffectiveProgressInput): number {
  if (input.status === 'DONE') return 100;
  if (input.manualProgress !== null) return Math.min(input.manualProgress, MAX_OPEN_STAGE_PROGRESS);
  return input.systemProgress ?? 0;
}

/**
 * Irisan dua rentang tanggal inklusif.
 * Masukan: dua rentang (mulai dan selesai). Keluaran: rentang irisan, atau null bila tidak beririsan.
 * Efek samping: tidak ada (fungsi murni). Perbandingan string aman karena format `YYYY-MM-DD`.
 * Rujukan: FR-05-02 butir 6 (hari kerja hold dikeluarkan dari perhitungan laju).
 */
function intersect(a: Estimate, b: Estimate): Estimate | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return end >= start ? { start, end } : null;
}

/**
 * Mengubah daftar periode hold menjadi rentang tanggal hold yang sudah dipotong oleh `today`: hold selesai
 * berlaku sampai hari sebelum dilanjutkan, hold berjalan sampai kemarin.
 * Masukan: periode hold dan hari ini. Keluaran: rentang hold (dapat kosong).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 6, CL-056.
 */
function holdRanges(holds: ReadonlyArray<HoldPeriod>, today: IsoDate): Estimate[] {
  const yesterday = addDays(today, -1);
  const ranges: Estimate[] = [];
  for (const hold of holds) {
    const end = hold.resumedOn === null ? yesterday : addDays(hold.resumedOn, -1);
    const clippedEnd = end > yesterday ? yesterday : end;
    if (clippedEnd >= hold.since) ranges.push({ start: hold.since, end: clippedEnd });
  }
  return ranges;
}

/**
 * Menghitung hari kerja hold yang jatuh di dalam sebuah rentang.
 * Masukan: rentang dan rentang hold. Keluaran: jumlah hari kerja hold dalam rentang.
 * Efek samping: tidak ada (fungsi murni). Periode hold tidak saling tumpang tindih (dijaga use case).
 * Rujukan: FR-05-02 butir 6.
 */
function holdWorkdaysWithin(window: Estimate, holds: ReadonlyArray<Estimate>): number {
  let total = 0;
  for (const hold of holds) {
    const overlap = intersect(window, hold);
    if (overlap) total += workdaysInclusive(overlap.start, overlap.end);
  }
  return total;
}

/**
 * Menghitung progres diharapkan (laju): hari kerja dari estimasi mulai sampai KEMARIN dibagi total hari kerja
 * estimasi, dengan hari kerja hold dikeluarkan dari pembilang dan penyebut, maksimum 100, dibulatkan.
 * Masukan: estimasi terkini, periode hold, dan hari ini. Keluaran: bilangan bulat 0..100.
 * Bernilai 0 bila estimasi mulai hari ini atau belum tiba, atau penyebut nol; bila estimasi selesai sudah lewat,
 * dihitung sampai estimasi selesai.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 6, BL-40(e), NFR-16 butir 6; AC: (6 - 3) / (10 - 3) = 43%.
 */
export function expectedProgress(estimate: Estimate, holds: ReadonlyArray<HoldPeriod>, today: IsoDate): number {
  const yesterday = addDays(today, -1);
  const upTo = estimate.end < yesterday ? estimate.end : yesterday;
  if (upTo < estimate.start) return 0;
  const ranges = holdRanges(holds, today);
  const total = workdaysInclusive(estimate.start, estimate.end) - holdWorkdaysWithin(estimate, ranges);
  if (total <= 0) return 0;
  const elapsed =
    workdaysInclusive(estimate.start, upTo) - holdWorkdaysWithin({ start: estimate.start, end: upTo }, ranges);
  return Math.min(100, percentRounded(Math.max(0, elapsed), total));
}

/** Masukan untuk menentukan penanda Tertinggal. */
export interface LaggingInput {
  readonly stageStatus: StageStatus;
  readonly projectStatus: ProjectStatus;
  /** Progres yang berlaku (`effectiveStageProgress`). */
  readonly progress: number;
  /** Progres diharapkan (`expectedProgress`). */
  readonly expected: number;
}

/**
 * Menentukan apakah tahapan ditandai "Tertinggal dari laju": Berjalan pada project Berjalan dengan progres
 * lebih rendah dari progres diharapkan lebih dari 20 poin persen.
 * Masukan: status tahapan dan project, progres berlaku, progres diharapkan. Keluaran: true bila tertinggal.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 6, BL-40(e); AC: selisih tepat 20 poin tidak ditandai, 21 poin ditandai.
 */
export function isLagging(input: LaggingInput): boolean {
  if (input.stageStatus !== 'RUNNING' || input.projectStatus !== 'RUNNING') return false;
  return input.expected - input.progress > LAGGING_THRESHOLD_POINTS;
}
