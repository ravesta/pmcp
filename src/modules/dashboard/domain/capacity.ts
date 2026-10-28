/**
 * Kapasitas PIC: tersedia, terencana, aktual, utilisasi, status, dan rincian per hari atau per minggu kerja
 * (FR-07-05, FR-04-04; CL-005, CL-005a, CL-042c, CL-044).
 *
 * Kapasitas hanya menghitung hari kerja (Senin sampai Jumat); cuti dan libur nasional belum dihitung. Estimasi jam
 * disimpan dalam menit. Seluruh fungsi murni.
 */
import { addDays, dayOfWeek, workdaysInclusive, type DateRange } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import { percentRounded, roundHalfUp } from '@/shared/rounding';

/** Jam kerja per hari kerja dalam menit (8 jam). */
export const WORKDAY_MINUTES = 480;

/** Ambang status utilisasi dalam persen (setelah pembulatan): di bawah 98 tersedia, sampai 102 mendekati, di atas 102 lebih. */
export const UTILIZATION_NEAR = 98;
export const UTILIZATION_OVER = 102;

/** Status kapasitas (CL-005a). */
export type CapacityStatus = 'AVAILABLE' | 'NEAR' | 'OVER';

/** Kartu yang menyumbang jam terencana. */
export interface CapacityCard {
  readonly planStart: IsoDate;
  readonly planEnd: IsoDate;
  /** Estimasi dalam menit; null = tidak dihitung (ditampilkan sebagai jumlah kartu tanpa estimasi). */
  readonly estimateMinutes: number | null;
}

/** Hasil hitung kapasitas satu PIC pada satu periode. */
export interface Capacity {
  readonly availableMinutes: number;
  readonly plannedMinutes: number;
  readonly actualMinutes: number;
  /** Utilisasi dibulatkan ke bilangan bulat (dasar status). */
  readonly utilizationPercent: number;
  readonly status: CapacityStatus;
  readonly remainingMinutes: number;
  /** Jumlah kartu beririsan dengan periode yang tidak punya estimasi jam. */
  readonly cardsWithoutEstimate: number;
}

/**
 * Menentukan status dari utilisasi yang sudah dibulatkan.
 * Masukan: persen utilisasi bulat. Keluaran: status.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-05 butir 5; AC: 98% Mendekati kapasitas; 97,6% dibulatkan 98%; 102,4% dibulatkan 102% tetap Mendekati.
 */
export function capacityStatus(utilizationPercent: number): CapacityStatus {
  if (utilizationPercent < UTILIZATION_NEAR) return 'AVAILABLE';
  return utilizationPercent <= UTILIZATION_OVER ? 'NEAR' : 'OVER';
}

/**
 * Menghitung irisan dua rentang tanggal inklusif.
 * Masukan: dua rentang. Keluaran: irisan, atau null bila tidak beririsan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-05 butir 2.
 */
export function intersect(a: DateRange, b: DateRange): DateRange | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  return start <= end ? { start, end } : null;
}

/**
 * Menghitung menit terencana sebuah kartu pada periode: estimasi dibagi rata per hari kerja rencana kartu (minimal 1),
 * dikali hari kerja rencana yang berada pada periode. Rentang rencana yang seluruhnya akhir pekan tidak menyumbang.
 * Masukan: kartu dan periode. Keluaran: menit (bilangan desimal; pembulatan dilakukan pada total).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-05 butir 2; AC: kartu 8 jam yang rencananya 2 hari kerja menyumbang 4 jam per hari.
 */
export function plannedMinutesIn(card: CapacityCard, period: DateRange): number {
  if (card.estimateMinutes === null) return 0;
  const overlap = intersect({ start: card.planStart, end: card.planEnd }, period);
  if (!overlap) return 0;
  const inPeriod = workdaysInclusive(overlap.start, overlap.end);
  const total = Math.max(1, workdaysInclusive(card.planStart, card.planEnd));
  return (card.estimateMinutes * inPeriod) / total;
}

/**
 * Menghitung kapasitas satu PIC pada satu periode.
 * Masukan: kartu PIC (tidak dibatalkan), total menit log pada periode, dan periode. Keluaran: `Capacity`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-05 butir 1 sampai 5; AC: 40 jam tersedia dan 24 jam terencana = 60% dan sisa 16 jam.
 */
export function computeCapacity(cards: ReadonlyArray<CapacityCard>, actualMinutes: number, period: DateRange): Capacity {
  const availableMinutes = workdaysInclusive(period.start, period.end) * WORKDAY_MINUTES;
  const overlapping = cards.filter((card) => intersect({ start: card.planStart, end: card.planEnd }, period) !== null);
  const plannedMinutes = roundHalfUp(overlapping.reduce((sum, card) => sum + plannedMinutesIn(card, period), 0));
  const utilizationPercent = availableMinutes === 0 ? 0 : percentRounded(plannedMinutes, availableMinutes);
  return {
    availableMinutes,
    plannedMinutes,
    actualMinutes,
    utilizationPercent,
    status: capacityStatus(utilizationPercent),
    remainingMinutes: Math.max(0, availableMinutes - plannedMinutes),
    cardsWithoutEstimate: overlapping.filter((card) => card.estimateMinutes === null).length,
  };
}

/**
 * Membagi periode menjadi irisan rincian: satu per hari kerja (periode pendek) atau satu per minggu kerja (periode
 * bulan; minggu yang melintasi batas dipotong pada batas periode). Hari akhir pekan dilewati pada rincian harian.
 * Masukan: periode dan mode (`DAY` atau `WEEK`). Keluaran: daftar rentang berurutan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-05 (rincian per hari kerja atau per minggu kerja), AC: minggu melintasi akhir bulan dipotong.
 */
export function breakdownSlices(period: DateRange, mode: 'DAY' | 'WEEK'): DateRange[] {
  const slices: DateRange[] = [];
  if (mode === 'DAY') {
    for (let day = period.start; day <= period.end; day = addDays(day, 1)) {
      const weekday = dayOfWeek(day);
      if (weekday >= 1 && weekday <= 5) slices.push({ start: day, end: day });
    }
    return slices;
  }
  let cursor = period.start;
  while (cursor <= period.end) {
    const sundayOffset = (7 - dayOfWeek(cursor)) % 7;
    const weekEnd = addDays(cursor, sundayOffset);
    const end = weekEnd < period.end ? weekEnd : period.end;
    if (workdaysInclusive(cursor, end) > 0) slices.push({ start: cursor, end });
    cursor = addDays(end, 1);
  }
  return slices;
}
