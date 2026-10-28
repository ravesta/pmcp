import { describe, expect, it } from 'vitest';
import { assessDay, isStaleInProgress, qualityOf, weeklyLogQuality } from '@/modules/dashboard/domain/activity-quality';
import { breakdownSlices, capacityStatus, computeCapacity, plannedMinutesIn } from '@/modules/dashboard/domain/capacity';
import { toIsoDate } from '@/shared/iso-date';

const d = toIsoDate;
const week = { start: d('2026-10-26'), end: d('2026-11-01') };

describe('kapasitas', () => {
  it('kartu 8 jam dengan rencana 2 hari kerja menyumbang 4 jam per hari', () => {
    const card = { planStart: d('2026-10-27'), planEnd: d('2026-10-28'), estimateMinutes: 480 };
    expect(plannedMinutesIn(card, { start: d('2026-10-27'), end: d('2026-10-27') })).toBe(240);
    expect(plannedMinutesIn(card, week)).toBe(480);
  });

  it('minggu 40 jam dengan 24 jam terencana = 60% dan sisa 16 jam', () => {
    const cap = computeCapacity([{ planStart: d('2026-10-26'), planEnd: d('2026-10-30'), estimateMinutes: 1440 }], 300, week);
    expect(cap).toMatchObject({ availableMinutes: 2400, plannedMinutes: 1440, utilizationPercent: 60, status: 'AVAILABLE', remainingMinutes: 960, actualMinutes: 300 });
  });

  it('status mengikuti angka yang dibulatkan', () => {
    expect(capacityStatus(97)).toBe('AVAILABLE');
    expect(capacityStatus(98)).toBe('NEAR');
    expect(capacityStatus(102)).toBe('NEAR');
    expect(capacityStatus(103)).toBe('OVER');
  });

  it('kartu tanpa estimasi dihitung jumlahnya; rencana akhir pekan tidak menyumbang; kartu di luar periode diabaikan', () => {
    const cap = computeCapacity(
      [
        { planStart: d('2026-10-28'), planEnd: d('2026-10-28'), estimateMinutes: null },
        { planStart: d('2026-10-31'), planEnd: d('2026-11-01'), estimateMinutes: 600 },
        { planStart: d('2026-12-01'), planEnd: d('2026-12-02'), estimateMinutes: 600 },
      ],
      0,
      week,
    );
    expect(cap).toMatchObject({ plannedMinutes: 0, cardsWithoutEstimate: 1 });
  });

  it('utilisasi 110% berstatus Kelebihan beban', () => {
    const cap = computeCapacity([{ planStart: d('2026-10-26'), planEnd: d('2026-10-30'), estimateMinutes: 2640 }], 0, week);
    expect(cap).toMatchObject({ utilizationPercent: 110, status: 'OVER', remainingMinutes: 0 });
  });

  it('rincian: hari kerja untuk minggu, minggu terpotong untuk bulan', () => {
    expect(breakdownSlices(week, 'DAY')).toHaveLength(5);
    const month = { start: d('2026-10-01'), end: d('2026-10-31') };
    const slices = breakdownSlices(month, 'WEEK');
    expect(slices[0]).toEqual({ start: '2026-10-01', end: '2026-10-04' });
    expect(slices.at(-1)).toEqual({ start: '2026-10-26', end: '2026-10-31' });
  });
});

describe('kualitas pencatatan', () => {
  it('ambang Baik, Kurang, Rendah', () => {
    expect([qualityOf(80), qualityOf(79), qualityOf(50), qualityOf(49)]).toEqual(['GOOD', 'FAIR', 'FAIR', 'LOW']);
  });

  it('hari dengan 4 jam = 50% Kurang; akhir pekan dan masa depan tidak dinilai', () => {
    const today = d('2026-10-28');
    expect(assessDay(d('2026-10-27'), 240, today)).toEqual({ percent: 50, quality: 'FAIR' });
    expect(assessDay(d('2026-10-31'), 240, d('2026-11-02'))).toBeNull();
    expect(assessDay(d('2026-10-29'), 0, today)).toBeNull();
  });

  it('jam kerja berjalan: Senin 4 jam = 50%; Rabu 12 jam dari 24 = 50%', () => {
    expect(weeklyLogQuality(240, d('2026-10-26'))).toEqual({ percent: 50, quality: 'FAIR' });
    expect(weeklyLogQuality(720, d('2026-10-28'))).toEqual({ percent: 50, quality: 'FAIR' });
    expect(weeklyLogQuality(2400, d('2026-11-01'))).toEqual({ percent: 100, quality: 'GOOD' });
  });

  it('kartu tanpa log 3 hari atau lebih', () => {
    const today = d('2026-10-28');
    expect(isStaleInProgress(null, today)).toBe(true);
    expect(isStaleInProgress(d('2026-10-25'), today)).toBe(true);
    expect(isStaleInProgress(d('2026-10-26'), today)).toBe(false);
  });
});
