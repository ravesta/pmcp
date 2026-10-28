/**
 * Uji tanggal bisnis IsoDate dan format tampilan dd/mm/yyyy.
 * Rujukan: BL-09, CL-010, EC-02-01.02.
 */
import { describe, expect, it } from 'vitest';
import { formatDisplayDate, isIsoDate, parseDisplayDate, toIsoDate } from '@/shared/iso-date';

describe('isIsoDate', () => {
  it('menerima tanggal kalender nyata', () => {
    expect(isIsoDate('2026-10-28')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });

  it('menolak tanggal yang tidak ada di kalender', () => {
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2027-02-29')).toBe(false);
  });

  it('menolak format lain', () => {
    expect(isIsoDate('28/10/2026')).toBe(false);
    expect(isIsoDate('2026-1-5')).toBe(false);
    expect(isIsoDate('abc')).toBe(false);
  });
});

describe('toIsoDate', () => {
  it('melempar galat pada masukan tidak valid', () => {
    expect(() => toIsoDate('2026-02-30')).toThrow();
  });
});

describe('tampilan dd/mm/yyyy (CL-010)', () => {
  it('memformat tanggal bisnis', () => {
    expect(formatDisplayDate(toIsoDate('2026-10-28'))).toBe('28/10/2026');
  });

  it('membaca dd/mm/yyyy yang valid, spasi tepi diabaikan', () => {
    expect(parseDisplayDate('28/10/2026')).toBe('2026-10-28');
    expect(parseDisplayDate('  01/02/2027 ')).toBe('2027-02-01');
  });

  it('menolak format atau tanggal tidak valid', () => {
    expect(parseDisplayDate('31/02/2026')).toBeNull();
    expect(parseDisplayDate('5/1/2026')).toBeNull();
    expect(parseDisplayDate('2026-10-28')).toBeNull();
    expect(parseDisplayDate('')).toBeNull();
  });
});
