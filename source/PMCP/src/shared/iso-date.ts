/**
 * Tipe dan fungsi tanggal bisnis PMCP.
 *
 * Tanggal bisnis disimpan dan dipindahkan sebagai string `YYYY-MM-DD` bermerek (`IsoDate`), bukan
 * objek `Date`, agar tidak bergeser antar zona waktu (BL-09, Technical Design TD-04). Tampilan
 * kepada pengguna memakai dd/mm/yyyy (CL-010).
 */

/** Tanggal bisnis berformat `YYYY-MM-DD` yang sudah tervalidasi sebagai tanggal kalender nyata. */
export type IsoDate = string & { readonly __brand: 'IsoDate' };

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/**
 * Memeriksa apakah tahun, bulan, dan hari membentuk tanggal kalender yang nyata (mis. 30/02 ditolak).
 * Masukan: tiga bilangan bulat. Keluaran: true bila tanggal valid.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-09, EC-02-01.02.
 */
function isRealCalendarDate(year: number, month: number, day: number): boolean {
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
}

/**
 * Memeriksa apakah sebuah string adalah tanggal bisnis `YYYY-MM-DD` yang valid.
 * Masukan: string bebas. Keluaran: true bila valid, sekaligus menyempitkan tipe menjadi `IsoDate`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-09.
 */
export function isIsoDate(value: string): value is IsoDate {
  const match = ISO_PATTERN.exec(value);
  if (!match) return false;
  return isRealCalendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

/**
 * Mengubah string menjadi `IsoDate`, melempar galat bila bukan tanggal valid.
 * Masukan: string `YYYY-MM-DD`. Keluaran: `IsoDate`.
 * Efek samping: melempar `Error` pada masukan tidak valid (programmer error, bukan masukan pengguna).
 * Rujukan: BL-09.
 */
export function toIsoDate(value: string): IsoDate {
  if (!isIsoDate(value)) throw new Error(`Bukan tanggal YYYY-MM-DD yang valid: "${value}"`);
  return value;
}

/**
 * Menampilkan tanggal bisnis dalam format dd/mm/yyyy untuk pengguna.
 * Masukan: `IsoDate`. Keluaran: string dd/mm/yyyy.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: CL-010, NFR-03.
 */
export function formatDisplayDate(date: IsoDate): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Membaca tanggal dd/mm/yyyy yang diketik pengguna menjadi `IsoDate`.
 * Masukan: teks isian (spasi di tepi diabaikan). Keluaran: `IsoDate`, atau null bila format atau
 * tanggal tidak valid (pemanggil menampilkan pesan validasi).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: CL-010, EC-02-01.02, EC-02-01.09.
 */
export function parseDisplayDate(text: string): IsoDate | null {
  const match = DISPLAY_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const candidate = `${year}-${month}-${day}`;
  return isIsoDate(candidate) ? candidate : null;
}
