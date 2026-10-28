/**
 * Uji kalender dan hari kerja. Memakai contoh acuan NFR-16 butir 6: hari ini = Rabu 28/10/2026.
 * Rujukan: NFR-16, BL-09, FR-05-02, FR-13-05, FR-07-05.
 */
import { describe, expect, it } from 'vitest';
import {
  addDays,
  calendarDaysBetween,
  dayOfWeek,
  isWorkday,
  monthRange,
  startOfWeek,
  weekRange,
  workdaysAfter,
  workdaysInclusive,
} from '@/shared/calendar';
import { toIsoDate } from '@/shared/iso-date';

const d = toIsoDate;
const TODAY = d('2026-10-28'); // Rabu

describe('hari dalam pekan dan hari kerja (NFR-16 butir 2)', () => {
  it('28/10/2026 adalah Rabu dan hari kerja', () => {
    expect(dayOfWeek(TODAY)).toBe(3);
    expect(isWorkday(TODAY)).toBe(true);
  });

  it('Sabtu dan Minggu bukan hari kerja', () => {
    expect(isWorkday(d('2026-10-24'))).toBe(false); // Sabtu
    expect(isWorkday(d('2026-10-25'))).toBe(false); // Minggu
  });

  it('1 Januari 1970 adalah Kamis (dasar nomor hari)', () => {
    expect(dayOfWeek(d('1970-01-01'))).toBe(4);
  });
});

describe('workdaysInclusive: kedua ujung dihitung (NFR-16 butir 2)', () => {
  it('Senin sampai Rabu = 3 hari kerja (jam kerja berjalan 24 jam, contoh NFR-16)', () => {
    expect(workdaysInclusive(d('2026-10-26'), TODAY)).toBe(3);
  });

  it('satu minggu penuh Senin sampai Minggu = 5 hari kerja', () => {
    expect(workdaysInclusive(d('2026-10-26'), d('2026-11-01'))).toBe(5);
  });

  it('hanya akhir pekan = 0 hari kerja', () => {
    expect(workdaysInclusive(d('2026-10-24'), d('2026-10-25'))).toBe(0);
  });

  it('akhir sebelum awal = 0', () => {
    expect(workdaysInclusive(d('2026-10-30'), d('2026-10-26'))).toBe(0);
  });

  it('satu hari kerja yang sama = 1', () => {
    expect(workdaysInclusive(TODAY, TODAY)).toBe(1);
  });

  it('tahun 2026 memiliki 261 hari kerja (365 hari dimulai Kamis)', () => {
    expect(workdaysInclusive(d('2026-01-01'), d('2026-12-31'))).toBe(261);
  });
});

describe('workdaysAfter: hari awal tidak dihitung (FR-13-05 butir 1)', () => {
  it('rencana selesai Sabtu setelah estimasi Jumat: selisih nol hari kerja, tidak memicu revisi', () => {
    expect(workdaysAfter(d('2026-10-23'), d('2026-10-24'))).toBe(0);
  });

  it('rencana selesai Senin setelah estimasi Jumat: satu hari kerja', () => {
    expect(workdaysAfter(d('2026-10-23'), d('2026-10-26'))).toBe(1);
  });

  it('5 hari kerja setelah estimasi (contoh AC FR-13-05)', () => {
    expect(workdaysAfter(d('2026-10-23'), d('2026-10-30'))).toBe(5);
  });
});

describe('selisih hari kalender (NFR-16 butir 4)', () => {
  it('estimasi selesai Jumat 23/10 dan hari ini Rabu 28/10 = 5 hari kalender', () => {
    expect(calendarDaysBetween(d('2026-10-23'), TODAY)).toBe(5);
  });

  it('selisih negatif bila tanggal tujuan lebih awal', () => {
    expect(calendarDaysBetween(TODAY, d('2026-10-23'))).toBe(-5);
  });
});

describe('penjumlahan hari, minggu, dan bulan', () => {
  it('jatuh tempo 7 hari dari 28/10/2026 berakhir 04/11/2026 (NFR-16 contoh)', () => {
    expect(addDays(TODAY, 7)).toBe('2026-11-04');
  });

  it('30 hari terakhir dimulai 28/09/2026 (NFR-16 contoh)', () => {
    expect(addDays(TODAY, -30)).toBe('2026-09-28');
  });

  it('menyeberang batas tahun', () => {
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
  });

  it('minggu berjalan Senin 26/10 sampai Minggu 01/11/2026', () => {
    expect(startOfWeek(TODAY)).toBe('2026-10-26');
    expect(weekRange(TODAY)).toEqual({ start: '2026-10-26', end: '2026-11-01' });
  });

  it('minggu depan dan minggu lalu', () => {
    expect(weekRange(TODAY, 1)).toEqual({ start: '2026-11-02', end: '2026-11-08' });
    expect(weekRange(TODAY, -1)).toEqual({ start: '2026-10-19', end: '2026-10-25' });
  });

  it('hari Minggu masuk minggu yang berakhir pada hari itu', () => {
    expect(weekRange(d('2026-11-01'))).toEqual({ start: '2026-10-26', end: '2026-11-01' });
  });

  it('bulan ini, bulan depan, dan Februari kabisat', () => {
    expect(monthRange(TODAY)).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(monthRange(TODAY, 1)).toEqual({ start: '2026-11-01', end: '2026-11-30' });
    expect(monthRange(d('2028-02-10'))).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });

  it('bulan sebelumnya menyeberang tahun', () => {
    expect(monthRange(d('2026-01-15'), -1)).toEqual({ start: '2025-12-01', end: '2025-12-31' });
  });
});
