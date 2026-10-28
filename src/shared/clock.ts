/**
 * Jam sistem PMCP.
 *
 * `Clock` adalah SATU-SATUNYA sumber "hari ini" dan waktu sekarang di seluruh aplikasi
 * (TD-05, NFR-16 butir 1). Produksi memakai jam server zona Asia/Jakarta; lingkungan uji dan staging
 * dapat memasang jam tetap supaya kasus yang bergantung waktu dapat dites dan diulang. Satu-satunya
 * tempat yang boleh memanggil `new Date()` tanpa argumen atau `Date.now()` adalah berkas ini
 * (ditegakkan oleh uji arsitektur).
 */
import { type IsoDate, toIsoDate } from './iso-date';

/** Zona waktu bisnis PMCP (CL-010, BL-09). */
export const BUSINESS_TIME_ZONE = 'Asia/Jakarta';

/** Kontrak jam yang dipakai seluruh kode aplikasi. */
export interface Clock {
  /** Tanggal bisnis hari ini menurut zona bisnis. */
  today(): IsoDate;
  /** Waktu sekarang sebagai instan mutlak (untuk stempel waktu peristiwa). */
  now(): Date;
}

/**
 * Membuat jam sistem yang membaca waktu server dan menurunkan tanggal bisnis di zona Asia/Jakarta.
 * Masukan: opsional, zona waktu bisnis. Keluaran: objek `Clock`.
 * Efek samping: membaca jam sistem setiap kali `today()` atau `now()` dipanggil; tidak ada perubahan keadaan.
 * Rujukan: NFR-16 butir 1, BL-09, TD-05.
 */
export function createSystemClock(timeZone: string = BUSINESS_TIME_ZONE): Clock {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return {
    today: () => toIsoDate(formatter.format(new Date())),
    now: () => new Date(),
  };
}

/**
 * Membuat jam tetap untuk pengujian dan lingkungan non-produksi.
 * Masukan: tanggal bisnis "hari ini" dan jam opsional (waktu Asia/Jakarta, bawaan 12:00:00).
 * Keluaran: objek `Clock` yang selalu menghasilkan nilai yang sama.
 * Efek samping: tidak ada.
 * Rujukan: NFR-16 butir 1 dan 6 (contoh acuan hari ini = Rabu 28/10/2026), TD-05.
 */
export function createFixedClock(today: IsoDate, timeOfDay = '12:00:00'): Clock {
  const instant = new Date(`${today}T${timeOfDay}+07:00`);
  return {
    today: () => today,
    now: () => new Date(instant.getTime()),
  };
}
