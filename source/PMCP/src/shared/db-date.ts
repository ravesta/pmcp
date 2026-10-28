/**
 * Konversi antara tanggal dan jam bisnis dengan nilai kolom database (`DATE`, `TIME`).
 *
 * Kolom `DATE` dibaca Prisma sebagai `Date` UTC tengah malam; kolom `TIME` sebagai `Date` pada 1970-01-01. Semua
 * konversi memakai UTC sehingga tidak bergantung pada zona waktu mesin (BL-09, TD-04). Fungsi murni.
 */
import { type IsoDate, toIsoDate } from './iso-date';

/**
 * Mengubah tanggal bisnis menjadi `Date` UTC tengah malam untuk kolom `DATE`; null tetap null.
 * Masukan: `IsoDate` atau null. Keluaran: `Date` atau null.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-09, TD-04.
 */
export function toDbDate(date: IsoDate | null): Date | null {
  return date === null ? null : new Date(`${date}T00:00:00.000Z`);
}

/**
 * Mengubah nilai kolom `DATE` menjadi tanggal bisnis; null tetap null.
 * Masukan: `Date` atau null. Keluaran: `IsoDate` atau null.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-09, TD-04.
 */
export function fromDbDate(date: Date | null): IsoDate | null {
  return date === null ? null : toIsoDate(date.toISOString().slice(0, 10));
}

/**
 * Mengubah menit sejak 00:00 menjadi nilai kolom `TIME`.
 * Masukan: menit 0 sampai 1439. Keluaran: `Date` pada 1970-01-01 (UTC).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 1.
 */
export function toDbTime(minutes: number): Date {
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return new Date(`1970-01-01T${hh}:${mm}:00.000Z`);
}

/**
 * Mengubah nilai kolom `TIME` menjadi menit sejak 00:00.
 * Masukan: `Date`. Keluaran: menit 0 sampai 1439.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 1.
 */
export function fromDbTime(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}
