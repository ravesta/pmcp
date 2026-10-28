/**
 * Uji pembulatan persen (NFR-16 butir 5) dan contoh angka AC FSD.
 * Rujukan: NFR-16, FR-05-02, FR-07-05, FR-21-05.
 */
import { describe, expect, it } from 'vitest';
import { percentRounded, roundHalfUp } from '@/shared/rounding';

describe('roundHalfUp', () => {
  it('0,5 naik, di bawah 0,5 turun', () => {
    expect(roundHalfUp(97.5)).toBe(98);
    expect(roundHalfUp(97.6)).toBe(98);
    expect(roundHalfUp(97.4)).toBe(97);
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(0)).toBe(0);
  });

  it('utilisasi 97,6% menjadi 98% (Mendekati kapasitas) dan 102,4% menjadi 102% (AC FR-07-05)', () => {
    expect(roundHalfUp(97.6)).toBe(98);
    expect(roundHalfUp(102.4)).toBe(102);
  });
});

describe('percentRounded', () => {
  it('kepatuhan 3 dari 4 = 75% (AC FR-21-05)', () => {
    expect(percentRounded(3, 4)).toBe(75);
  });

  it('progres tahapan: kartu bobot 5 dan 5 hari dengan progres 100 dan 0 = 50% (AC FR-05-02)', () => {
    expect(roundHalfUp((5 * 100 + 5 * 0) / 10)).toBe(50);
  });

  it('utilisasi 24 jam dari 40 jam = 60% (AC FR-07-05)', () => {
    expect(percentRounded(24, 40)).toBe(60);
  });

  it('penyebut nol menghasilkan 0', () => {
    expect(percentRounded(1, 0)).toBe(0);
  });
});
