/**
 * Tampilan kapasitas PIC bersama untuk Dashboard Head (tabel semua PIC) dan Dashboard PIC (pribadi): pilihan periode
 * Minggu atau Bulan dengan pergeseran, ringkasan, dan rincian per hari atau per minggu kerja (FR-07-05, FR-04-04).
 */
import { monthRange, weekRange, type DateRange } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import { breakdownSlices, computeCapacity, type Capacity } from '../domain/capacity';
import type { DashCard } from './ports';

/** Mode periode kapasitas. */
export type CapacityMode = 'WEEK' | 'MONTH';

/**
 * Menentukan rentang periode kapasitas dari mode dan pergeseran terhadap hari ini.
 * Masukan: mode, pergeseran (minggu atau bulan; negatif ke masa lalu), dan hari ini. Keluaran: rentang inklusif.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-05 (tombol sebelumnya, berikutnya, "Minggu ini/Bulan ini"), FR-04-04 butir 3.
 */
export function capacityRange(mode: CapacityMode, offset: number, today: IsoDate): DateRange {
  return mode === 'WEEK' ? weekRange(today, offset) : monthRange(today, offset);
}

/** Satu irisan rincian kapasitas. */
export interface CapacitySlice {
  readonly range: DateRange;
  readonly capacity: Capacity;
}

/** Kapasitas satu PIC: ringkasan periode dan rincian. */
export interface PicCapacity {
  readonly summary: Capacity;
  readonly slices: ReadonlyArray<CapacitySlice>;
}

/**
 * Menghitung kapasitas satu PIC pada periode beserta rinciannya. Jam aktual per irisan dihitung dari log pada
 * irisan itu.
 * Masukan: kartu PIC, rentang periode, mode, dan fungsi yang memberi menit log pada rentang tertentu.
 * Keluaran: `PicCapacity`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-05 butir 1 sampai 5; rincian per hari (Minggu) atau per minggu kerja (Bulan).
 */
export function picCapacity(cards: ReadonlyArray<DashCard>, range: DateRange, mode: CapacityMode, actualIn: (range: DateRange) => number): PicCapacity {
  const capacityCards = cards.map((card) => ({ planStart: card.planStart, planEnd: card.planEnd, estimateMinutes: card.estimateMinutes }));
  return {
    summary: computeCapacity(capacityCards, actualIn(range), range),
    slices: breakdownSlices(range, mode === 'WEEK' ? 'DAY' : 'WEEK').map((slice) => ({ range: slice, capacity: computeCapacity(capacityCards, actualIn(slice), slice) })),
  };
}
