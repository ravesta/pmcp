/**
 * Kualitas pencatatan aktivitas: penilaian jam per hari dan per minggu berjalan, serta kartu berjalan tanpa log
 * (FR-04-06, FR-07-09; CL-042d, CL-047). Seluruh fungsi murni.
 */
import { calendarDaysBetween, dayOfWeek, startOfWeek, workdaysInclusive } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import { percentRounded } from '@/shared/rounding';
import { WORKDAY_MINUTES } from './capacity';

/** Penilaian pencatatan: Baik (80% atau lebih), Kurang (50% sampai 79%), Rendah (di bawah 50%). */
export type LogQuality = 'GOOD' | 'FAIR' | 'LOW';

/**
 * Menilai persentase jam tercatat.
 * Masukan: persen yang sudah dibulatkan. Keluaran: penilaian.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-04-06 butir 2 (dibulatkan sebelum dinilai, NFR-16).
 */
export function qualityOf(percent: number): LogQuality {
  if (percent >= 80) return 'GOOD';
  return percent >= 50 ? 'FAIR' : 'LOW';
}

/**
 * Menilai jam tercatat satu hari terhadap 8 jam. Tidak dinilai untuk akhir pekan dan tanggal yang belum tiba.
 * Masukan: tanggal, menit tercatat, dan hari ini. Keluaran: persen dan penilaian, atau null bila tidak dinilai.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-09 butir 3; AC: hari dengan 4 jam log = "4 j dari 8 j" dan Kurang.
 */
export function assessDay(date: IsoDate, minutes: number, today: IsoDate): { percent: number; quality: LogQuality } | null {
  const weekday = dayOfWeek(date);
  if (date > today || weekday === 0 || weekday === 6) return null;
  const percent = percentRounded(minutes, WORKDAY_MINUTES);
  return { percent, quality: qualityOf(percent) };
}

/**
 * Menghitung jam tercatat minggu berjalan terhadap jam kerja berjalan: hari kerja dari Senin sampai hari ini inklusif
 * (Senin sampai Jumat bila hari ini akhir pekan) kali 8 jam; hari ini dihitung penuh.
 * Masukan: menit log minggu ini dan hari ini. Keluaran: persen dibulatkan dan penilaian.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-04-06 butir 2; AC: 4 jam pada hari ke-1 minggu ini = 50% Kurang.
 */
export function weeklyLogQuality(weekMinutes: number, today: IsoDate): { percent: number; quality: LogQuality } {
  const monday = startOfWeek(today);
  const workdays = Math.max(1, workdaysInclusive(monday, today));
  const percent = percentRounded(weekMinutes, workdays * WORKDAY_MINUTES);
  return { percent, quality: qualityOf(percent) };
}

/**
 * Menentukan apakah kartu In Progress termasuk "berjalan tanpa log 3 hari atau lebih": tanpa log sama sekali, atau log
 * terakhir 3 hari kalender atau lebih lalu (akhir pekan ikut dihitung).
 * Masukan: tanggal log terakhir (null bila tidak ada) dan hari ini. Keluaran: true bila ditandai.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-04-06 butir 3; AC: kartu In Progress dengan log terakhir 3 hari lalu dihitung.
 */
export function isStaleInProgress(lastLogOn: IsoDate | null, today: IsoDate): boolean {
  return lastLogOn === null || calendarDaysBetween(lastLogOn, today) >= 3;
}
