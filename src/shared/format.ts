/**
 * Pemformatan waktu untuk pesan kepada pengguna (zona bisnis Asia/Jakarta, CL-010).
 */
import { BUSINESS_TIME_ZONE } from './clock';

const clockFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: BUSINESS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * Menampilkan jam dan menit sebuah waktu mutlak dalam zona Asia/Jakarta, format HH:mm.
 * Masukan: waktu mutlak. Keluaran: teks HH:mm.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 3 (pesan penundaan menyebut kapan boleh mencoba lagi), NFR-03.
 */
export function formatClockTime(instant: Date): string {
  return clockFormatter.format(instant).replace('.', ':');
}

/**
 * Menghitung menit yang tersisa dari `now` sampai `until`, dibulatkan ke atas, minimal 1.
 * Masukan: dua waktu mutlak. Keluaran: bilangan bulat menit.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 3.
 */
export function minutesUntil(now: Date, until: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60_000));
}

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: BUSINESS_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/**
 * Menampilkan waktu mutlak sebagai dd/mm/yyyy HH:mm:ss dalam zona Asia/Jakarta (Jejak Perubahan).
 * Masukan: waktu mutlak. Keluaran: teks tanggal dan jam.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-09-01 butir 1, NFR-03, CL-010.
 */
export function formatDateTime(instant: Date): string {
  return dateTimeFormatter.format(instant).replace(/\./g, ':').replace(',', '');
}
