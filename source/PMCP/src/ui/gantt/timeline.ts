/**
 * Skala waktu Gantt: jendela bulan, kolom header menurut zoom, posisi bar (persen), akhir pekan, dan garis hari ini.
 *
 * Murni dan tidak bergantung pada React sehingga dapat diuji. Posisi dinyatakan dalam persen dari lebar jalur
 * sehingga bar mengikuti lebar apa pun; lebar minimum jalur (piksel) menentukan keterbacaan menurut zoom.
 */
import { addDays, calendarDaysBetween, dayOfWeek, monthRange } from '@/shared/calendar';
import { isIsoDate, toIsoDate, type IsoDate } from '@/shared/iso-date';

/** Pilihan zoom Gantt (FR-12-01 butir 3). */
export type Zoom = 'DAY' | 'WEEK' | 'MONTH';

/** Jendela waktu dalam bulan, kunci `YYYY-MM`. */
export interface MonthWindow {
  readonly from: string;
  readonly to: string;
}

/** Satu penanda pada header tanggal (Senin, awal bulan, atau nomor hari). */
export interface TimelineTick {
  readonly key: string;
  readonly label: string;
  /** Posisi kiri dalam piksel dari awal jalur. */
  readonly leftPx: number;
}

/** Area yang diarsir atau digambar pada jalur, dalam piksel. */
export interface Span {
  readonly leftPx: number;
  readonly widthPx: number;
}

/** Skala waktu siap pakai. */
export interface Timeline {
  readonly start: IsoDate;
  readonly end: IsoDate;
  readonly totalDays: number;
  readonly zoom: Zoom;
  /** Lebar satu hari (piksel) menurut zoom. */
  readonly pxPerDay: number;
  /** Lebar seluruh jalur (piksel). */
  readonly widthPx: number;
  /** Penanda baris atas header: Senin (dd/mm) pada zoom Hari dan Minggu, awal bulan pada zoom Bulan. */
  readonly ticks: ReadonlyArray<TimelineTick>;
  /** Nomor hari pada baris bawah header (hanya zoom Hari). */
  readonly dayNumbers: ReadonlyArray<TimelineTick>;
  readonly weekends: ReadonlyArray<Span>;
  /** Posisi garis hari ini (piksel), atau null bila di luar jendela. */
  readonly todayPx: number | null;
}

/** Piksel per hari menurut zoom: Hari 24, Minggu 10, Bulan 4 (sama dengan mockup v0.2). */
export const PX_PER_DAY: Readonly<Record<Zoom, number>> = { DAY: 24, WEEK: 10, MONTH: 4 };

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
 * Menulis kunci bulan sebagai "Okt 2026".
 * Masukan: kunci bulan `YYYY-MM`. Keluaran: label bulan singkat dan tahun.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 2, mockup v0.2 (fungsi ymLabel).
 */
export function monthLabel(key: string): string {
  const parsed = parseMonthKey(key);
  return parsed ? `${MONTH_NAMES[parsed.month - 1]} ${parsed.year}` : key;
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
 * Daftar bulan yang dapat dipilih pada pemilih periode: tiga bulan ke belakang sampai enam bulan ke depan.
 * Masukan: hari ini. Keluaran: pilihan (kunci dan label).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 2 (Dari dan Sampai bulan), mockup v0.2.
 */
export function monthOptions(today: IsoDate): Array<{ value: string; label: string }> {
  const current = monthKeyOf(today);
  const options: Array<{ value: string; label: string }> = [];
  for (let offset = -3; offset <= 6; offset += 1) {
    const key = shiftMonthKey(current, offset);
    options.push({ value: key, label: monthLabel(key) });
  }
  return options;
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
 * Membangun penanda baris atas header: Senin (dd/mm) untuk zoom Hari dan Minggu, awal bulan untuk zoom Bulan.
 * Masukan: awal dan akhir jendela, piksel per hari, dan zoom. Keluaran: daftar penanda.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 3, mockup v0.2 (fungsi ganttHtml).
 */
function buildTicks(start: IsoDate, end: IsoDate, pxPerDay: number, zoom: Zoom): TimelineTick[] {
  const ticks: TimelineTick[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const leftPx = calendarDaysBetween(start, day) * pxPerDay;
    if (zoom === 'MONTH') {
      if (day === start || day.slice(8, 10) === '01') ticks.push({ key: day, label: monthLabel(monthKeyOf(day)), leftPx });
    } else if (dayOfWeek(day) === 1) {
      ticks.push({ key: day, label: `${day.slice(8, 10)}/${day.slice(5, 7)}`, leftPx });
    }
  }
  return ticks;
}

/**
 * Membangun skala waktu untuk jendela bulan dan zoom tertentu.
 * Masukan: jendela bulan, zoom, dan hari ini. Keluaran: `Timeline` dalam piksel.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-01 butir 2 sampai 4 (akhir pekan diarsir, garis hari ini).
 */
export function buildTimeline(window: MonthWindow, zoom: Zoom, today: IsoDate): Timeline {
  return buildTimelineForRange(monthRange(toIsoDate(`${window.from}-01`)).start, monthRange(toIsoDate(`${window.to}-01`)).end, zoom, today);
}

/**
 * Membangun skala waktu untuk rentang tanggal bebas (dipakai bagian "Jadwal" pada Detail Project).
 * Masukan: tanggal awal dan akhir, zoom, dan hari ini. Keluaran: `Timeline` dalam piksel.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-11-01 (jadwal project di detail), FR-12-01 butir 2 sampai 4.
 */
export function buildTimelineForRange(start: IsoDate, end: IsoDate, zoom: Zoom, today: IsoDate): Timeline {
  const totalDays = calendarDaysBetween(start, end) + 1;
  const pxPerDay = PX_PER_DAY[zoom];
  const weekends: Span[] = [];
  const dayNumbers: TimelineTick[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const leftPx = calendarDaysBetween(start, day) * pxPerDay;
    if (zoom !== 'MONTH') {
      const weekday = dayOfWeek(day);
      if (weekday === 0 || weekday === 6) weekends.push({ leftPx, widthPx: pxPerDay });
    }
    if (zoom === 'DAY') dayNumbers.push({ key: day, label: String(Number(day.slice(8, 10))), leftPx });
  }
  return {
    start,
    end,
    totalDays,
    zoom,
    pxPerDay,
    widthPx: totalDays * pxPerDay,
    ticks: buildTicks(start, end, pxPerDay, zoom),
    dayNumbers,
    weekends,
    todayPx: today >= start && today <= end ? calendarDaysBetween(start, today) * pxPerDay + pxPerDay / 2 : null,
  };
}

/**
 * Menghitung posisi dan lebar sebuah rentang tanggal pada jalur (piksel), dipotong ke jendela. Lebar minimum satu
 * hari agar rentang pendek tetap terlihat.
 * Masukan: skala waktu dan rentang (kedua ujung inklusif). Keluaran: posisi dan lebar, atau null bila rentang
 * seluruhnya di luar jendela.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-12-02 (bar, estimasi awal, aktual, hold, tambahan, telat), mockup v0.2 (fungsi geo).
 */
export function placeRange(timeline: Timeline, range: { start: IsoDate; end: IsoDate }): Span | null {
  if (range.end < timeline.start || range.start > timeline.end) return null;
  const from = range.start < timeline.start ? timeline.start : range.start;
  const to = range.end > timeline.end ? timeline.end : range.end;
  return {
    leftPx: calendarDaysBetween(timeline.start, from) * timeline.pxPerDay,
    widthPx: Math.max(timeline.pxPerDay, (calendarDaysBetween(from, to) + 1) * timeline.pxPerDay),
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
