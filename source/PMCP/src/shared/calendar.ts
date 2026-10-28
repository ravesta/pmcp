/**
 * Aritmetika kalender PMCP (tanggal bisnis, hari kerja, minggu, bulan).
 *
 * Semua perhitungan memakai nomor hari sejak 1970-01-01 dalam UTC, sehingga tidak bergantung pada
 * zona waktu mesin (BL-09, TD-04). Hari kerja = Senin sampai Jumat; libur nasional belum dihitung
 * (NFR-16 butir 2). Fungsi di sini murni: tidak membaca jam sistem; "hari ini" selalu diberikan
 * pemanggil (lihat `clock.ts`, TD-05).
 */
import { type IsoDate, toIsoDate } from './iso-date';

const MS_PER_DAY = 86_400_000;

/** Rentang tanggal inklusif kedua ujung. */
export interface DateRange {
  readonly start: IsoDate;
  readonly end: IsoDate;
}

/**
 * Mengubah tanggal bisnis menjadi nomor hari sejak 1970-01-01 (UTC).
 * Masukan: `IsoDate`. Keluaran: bilangan bulat.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-09, NFR-16.
 */
function toEpochDay(date: IsoDate): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/**
 * Mengubah nomor hari sejak 1970-01-01 (UTC) kembali menjadi tanggal bisnis.
 * Masukan: bilangan bulat. Keluaran: `IsoDate`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-09, NFR-16.
 */
function fromEpochDay(epochDay: number): IsoDate {
  return toIsoDate(new Date(epochDay * MS_PER_DAY).toISOString().slice(0, 10));
}

/**
 * Hari dalam pekan dari nomor hari: 0 = Minggu, 1 = Senin, ..., 6 = Sabtu.
 * Masukan: nomor hari sejak 1970-01-01 (1 Januari 1970 adalah hari Kamis). Keluaran: 0 sampai 6.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 2 dan 3.
 */
function weekdayOfEpochDay(epochDay: number): number {
  return (((epochDay + 4) % 7) + 7) % 7;
}

/**
 * Hari dalam pekan sebuah tanggal bisnis: 0 = Minggu, 1 = Senin, ..., 6 = Sabtu.
 * Masukan: `IsoDate`. Keluaran: 0 sampai 6.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 3.
 */
export function dayOfWeek(date: IsoDate): number {
  return weekdayOfEpochDay(toEpochDay(date));
}

/**
 * Menambah (atau mengurangi bila negatif) sejumlah hari kalender pada sebuah tanggal.
 * Masukan: tanggal dan jumlah hari. Keluaran: tanggal hasil.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-09, NFR-16.
 */
export function addDays(date: IsoDate, days: number): IsoDate {
  return fromEpochDay(toEpochDay(date) + days);
}

/**
 * Selisih hari kalender `to - from` (positif bila `to` setelah `from`).
 * Masukan: dua tanggal. Keluaran: bilangan bulat (bisa negatif).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 4 (satuan "n hari" pada keterlambatan = hari kalender).
 */
export function calendarDaysBetween(from: IsoDate, to: IsoDate): number {
  return toEpochDay(to) - toEpochDay(from);
}

/**
 * Menentukan apakah sebuah tanggal adalah hari kerja (Senin sampai Jumat).
 * Masukan: `IsoDate`. Keluaran: true bila hari kerja.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 2, CL-005.
 */
export function isWorkday(date: IsoDate): boolean {
  const weekday = dayOfWeek(date);
  return weekday >= 1 && weekday <= 5;
}

/**
 * Menghitung jumlah hari kerja pada rentang [from, to] dengan KEDUA ujung dihitung.
 * Masukan: tanggal awal dan akhir. Keluaran: jumlah hari kerja; 0 bila `to` sebelum `from`.
 * Efek samping: tidak ada (fungsi murni). Memakai pecahan minggu penuh sehingga cepat untuk rentang panjang.
 * Rujukan: NFR-16 butir 2, FR-05-02 butir 1 dan 6, FR-07-05 butir 1.
 */
export function workdaysInclusive(from: IsoDate, to: IsoDate): number {
  const startDay = toEpochDay(from);
  const endDay = toEpochDay(to);
  if (endDay < startDay) return 0;
  const totalDays = endDay - startDay + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  let count = fullWeeks * 5;
  const remainderStart = startDay + fullWeeks * 7;
  for (let day = remainderStart; day <= endDay; day += 1) {
    const weekday = weekdayOfEpochDay(day);
    if (weekday >= 1 && weekday <= 5) count += 1;
  }
  return count;
}

/**
 * Menghitung jumlah hari kerja pada rentang (after, until]: hari `after` TIDAK dihitung, hari
 * `until` dihitung. Dipakai untuk selisih estimasi tahapan terhadap rencana kartu.
 * Masukan: dua tanggal. Keluaran: jumlah hari kerja; 0 bila `until` tidak setelah `after`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-05 butir 1 (revisi dipicu bila selisih sedikitnya satu hari kerja).
 */
export function workdaysAfter(after: IsoDate, until: IsoDate): number {
  return workdaysInclusive(addDays(after, 1), until);
}

/**
 * Mencari hari Senin pada minggu yang memuat tanggal tertentu.
 * Masukan: `IsoDate`. Keluaran: tanggal Senin minggu itu.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 3 (minggu = Senin sampai Minggu).
 */
export function startOfWeek(date: IsoDate): IsoDate {
  const sinceMonday = (dayOfWeek(date) + 6) % 7;
  return addDays(date, -sinceMonday);
}

/**
 * Rentang minggu (Senin sampai Minggu) yang memuat tanggal tertentu, digeser sejumlah minggu.
 * Masukan: tanggal acuan dan pergeseran minggu (0 = minggu ini, 1 = minggu depan, -1 = minggu lalu).
 * Keluaran: `DateRange` Senin sampai Minggu.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 3, FR-07-05 (periode Minggu).
 */
export function weekRange(reference: IsoDate, offsetWeeks = 0): DateRange {
  const monday = addDays(startOfWeek(reference), offsetWeeks * 7);
  return { start: monday, end: addDays(monday, 6) };
}

/**
 * Rentang bulan kalender (tanggal 1 sampai hari terakhir) yang memuat tanggal tertentu, digeser
 * sejumlah bulan.
 * Masukan: tanggal acuan dan pergeseran bulan. Keluaran: `DateRange` bulan itu.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 3 ("Bulan ini"), FR-07-05 (periode Bulan).
 */
export function monthRange(reference: IsoDate, offsetMonths = 0): DateRange {
  const [year, month] = reference.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(year, month - 1 + offsetMonths, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return {
    start: toIsoDate(first.toISOString().slice(0, 10)),
    end: toIsoDate(last.toISOString().slice(0, 10)),
  };
}
