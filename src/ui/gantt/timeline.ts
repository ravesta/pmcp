/**
 * Skala waktu Gantt: jendela bulan, kolom header menurut zoom, posisi bar (persen), akhir pekan, dan garis hari ini.
 *
 * Murni dan tidak bergantung pada React sehingga dapat diuji. Posisi dinyatakan dalam persen dari lebar jalur
 * sehingga bar mengikuti lebar apa pun; lebar minimum jalur (piksel) menentukan keterbacaan menurut zoom.
 */
import { addDays, calendarDaysBetween, dayOfWeek, monthRange, startOfWeek } from '@/shared/calendar';
import { isIsoDate, toIsoDate, type IsoDate } from '@/shared/iso-date';

/** Pilihan zoom Gantt (FR-12-01 butir 3). */
export type Zoom = 'DAY' | 'WEEK' | 'MONTH';

/** Jendela waktu dalam bulan, kunci `YYYY-MM`. */
export interface MonthWindow {
  readonly from: string;
  readonly to: string;
}

/** Satu kolom header (hari, minggu, atau bulan). */
export interface TimelineColumn {
  readonly key: string;
  readonly label: string;
  readonly leftPercent: number;
  readonly widthPercent: number;
}

/** Area yang diarsir (akhir pekan). */
export interface Span {
  readonly leftPercent: number;
  readonly widthPercent: number;
}

/** Skala waktu siap pakai. */
export interface Timeline {
  readonly start: IsoDate;
  readonly end: IsoDate;
  readonly totalDays: number;
  /** Lebar minimum jalur (piksel) menurut zoom. */
  readonly minWidthPx: number;
  readonly columns: ReadonlyArray<TimelineColumn>;
  readonly weekends: ReadonlyArray<Span>;
  /** Posisi garis hari ini (persen), atau null bila di luar jendela. */
  readonly todayPercent: number | null;
}

/** Piksel per hari menurut zoom. */
const PX_PER_DAY: Readonly<Record<Zoom, number>> = { DAY: 28, WEEK: 11, MONTH: 4 };

/** Batas panjang jendela agar halaman tetap ringan (FR-12-01 butir 2: bulan ke bulan). */
export const MAX_WINDOW_MONTHS = 12;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Mengambil kunci bulan `YYYY-MM` dari sebuah tanggal.
 * Masukan: tanggal bisnis. Keluaran: kunci bulan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 2.
 */
export function monthKeyOf(date: IsoDate): string {
  return date.slice(0, 7);
}

/**
 * Memeriksa dan memecah kunci bulan `YYYY-MM`.
 * Masukan: teks. Keluaran: tahun dan bulan, atau null bila tidak valid.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §7 (parameter URL tidak tepercaya).
 */
export function parseMonthKey(value: string | undefined): { year: number; month: number } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number) as [number, number];
  return month >= 1 && month <= 12 ? { year, month } : null;
}

/**
 * Menggeser kunci bulan sejumlah bulan.
 * Masukan: kunci bulan dan jumlah bulan (boleh negatif). Keluaran: kunci bulan baru.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 2 (geser per bulan).
 */
export function shiftMonthKey(key: string, months: number): string {
  const parsed = parseMonthKey(key) ?? { year: 1970, month: 1 };
  const index = parsed.year * 12 + (parsed.month - 1) + months;
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/**
 * Jendela bawaan: bulan ini sampai dua bulan ke depan.
 * Masukan: hari ini. Keluaran: `MonthWindow`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 2.
 */
export function defaultWindow(today: IsoDate): MonthWindow {
  const current = monthKeyOf(today);
  return { from: current, to: shiftMonthKey(current, 2) };
}

/**
 * Menormalkan jendela dari parameter URL: nilai tidak valid memakai bawaan, `to` tidak sebelum `from`, dan
 * panjangnya dibatasi.
 * Masukan: `from` dan `to` mentah serta hari ini. Keluaran: `MonthWindow` yang aman.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 2.
 */
export function normalizeWindow(from: string | undefined, to: string | undefined, today: IsoDate): MonthWindow {
  const fallback = defaultWindow(today);
  const start = parseMonthKey(from) ? (from as string) : fallback.from;
  let end = parseMonthKey(to) ? (to as string) : shiftMonthKey(start, 2);
  if (end < start) end = start;
  const maxEnd = shiftMonthKey(start, MAX_WINDOW_MONTHS - 1);
  if (end > maxEnd) end = maxEnd;
  return { from: start, to: end };
}

/**
 * Persen posisi sebuah hari terhadap jendela.
 * Masukan: awal jendela, jumlah hari, dan tanggal. Keluaran: persen (dapat di luar 0..100).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-02.
 */
function percentOf(start: IsoDate, totalDays: number, date: IsoDate): number {
  return (calendarDaysBetween(start, date) / totalDays) * 100;
}

/**
 * Membangun kolom header menurut zoom: hari, awal minggu (Senin), atau bulan.
 * Masukan: awal dan akhir jendela, jumlah hari, dan zoom. Keluaran: daftar kolom.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 3.
 */
function buildColumns(start: IsoDate, end: IsoDate, totalDays: number, zoom: Zoom): TimelineColumn[] {
  const columns: TimelineColumn[] = [];
  const push = (key: string, label: string, from: IsoDate, to: IsoDate): void => {
    const clippedFrom = from < start ? start : from;
    const clippedTo = to > end ? end : to;
    columns.push({
      key,
      label,
      leftPercent: percentOf(start, totalDays, clippedFrom),
      widthPercent: ((calendarDaysBetween(clippedFrom, clippedTo) + 1) / totalDays) * 100,
    });
  };
  if (zoom === 'DAY') {
    for (let day = start; day <= end; day = addDays(day, 1)) push(day, String(Number(day.slice(8, 10))), day, day);
  } else if (zoom === 'WEEK') {
    for (let monday = startOfWeek(start); monday <= end; monday = addDays(monday, 7)) {
      push(monday, `${monday.slice(8, 10)}/${monday.slice(5, 7)}`, monday, addDays(monday, 6));
    }
  } else {
    for (let cursor = start; cursor <= end; ) {
      const range = monthRange(cursor);
      push(range.start, `${MONTH_NAMES[Number(range.start.slice(5, 7)) - 1]} ${range.start.slice(0, 4)}`, range.start, range.end);
      cursor = addDays(range.end, 1);
    }
  }
  return columns;
}

/**
 * Membangun skala waktu untuk jendela bulan dan zoom tertentu.
 * Masukan: jendela bulan, zoom, dan hari ini. Keluaran: `Timeline`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 2 sampai 4 (akhir pekan diarsir, garis hari ini).
 */
export function buildTimeline(window: MonthWindow, zoom: Zoom, today: IsoDate): Timeline {
  const start = monthRange(toIsoDate(`${window.from}-01`)).start;
  const end = monthRange(toIsoDate(`${window.to}-01`)).end;
  const totalDays = calendarDaysBetween(start, end) + 1;
  const weekends: Span[] = [];
  if (zoom !== 'MONTH') {
    for (let day = start; day <= end; day = addDays(day, 1)) {
      if (dayOfWeek(day) === 6) {
        const spanEnd = addDays(day, 1) > end ? day : addDays(day, 1);
        weekends.push({ leftPercent: percentOf(start, totalDays, day), widthPercent: ((calendarDaysBetween(day, spanEnd) + 1) / totalDays) * 100 });
      } else if (dayOfWeek(day) === 0 && day === start) {
        weekends.push({ leftPercent: 0, widthPercent: (1 / totalDays) * 100 });
      }
    }
  }
  return {
    start,
    end,
    totalDays,
    minWidthPx: Math.max(640, totalDays * PX_PER_DAY[zoom]),
    columns: buildColumns(start, end, totalDays, zoom),
    weekends,
    todayPercent: today >= start && today <= end ? percentOf(start, totalDays, today) + (0.5 / totalDays) * 100 : null,
  };
}

/**
 * Menghitung posisi dan lebar sebuah rentang tanggal pada jalur, dipotong ke jendela.
 * Masukan: skala waktu dan rentang (kedua ujung inklusif). Keluaran: persen kiri dan lebar, atau null bila rentang
 * seluruhnya di luar jendela.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-02 (bar, estimasi awal, aktual, hold, tambahan, telat).
 */
export function placeRange(timeline: Timeline, range: { start: IsoDate; end: IsoDate }): Span | null {
  if (range.end < timeline.start || range.start > timeline.end) return null;
  const from = range.start < timeline.start ? timeline.start : range.start;
  const to = range.end > timeline.end ? timeline.end : range.end;
  return {
    leftPercent: percentOf(timeline.start, timeline.totalDays, from),
    widthPercent: ((calendarDaysBetween(from, to) + 1) / timeline.totalDays) * 100,
  };
}

/**
 * Memeriksa nilai zoom dari parameter URL.
 * Masukan: teks. Keluaran: zoom yang valid (bawaan Minggu).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 3.
 */
export function parseZoom(value: string | undefined): Zoom {
  return value === 'DAY' || value === 'MONTH' ? value : 'WEEK';
}

/**
 * Memeriksa apakah teks adalah tanggal bisnis valid (dipakai pembaca parameter URL).
 * Masukan: teks. Keluaran: true bila `YYYY-MM-DD` valid.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §7.
 */
export function isValidDateParam(value: string | undefined): value is IsoDate {
  return value !== undefined && isIsoDate(value);
}
