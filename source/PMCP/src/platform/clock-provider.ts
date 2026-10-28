/**
 * Penyedia `Clock` aplikasi: jam sistem di produksi, jam tetap bila konfigurasi uji memasangnya.
 */
import { createFixedClock, createSystemClock, type Clock } from '@/shared/clock';
import type { AppConfig } from './config';

/**
 * Memilih jam sesuai konfigurasi.
 * Masukan: konfigurasi aplikasi. Keluaran: `Clock` jam tetap bila `clockOverride` terpasang
 * (hanya mungkin di non-produksi, divalidasi `loadConfig`), selain itu jam sistem Asia/Jakarta.
 * Efek samping: tidak ada.
 * Rujukan: NFR-16 butir 1, TD-05.
 */
export function createClockFor(config: AppConfig): Clock {
  return config.clockOverride ? createFixedClock(config.clockOverride) : createSystemClock();
}
