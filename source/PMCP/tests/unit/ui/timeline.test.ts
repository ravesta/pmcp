/**
 * Uji skala waktu Gantt: jendela bulan, kolom, posisi bar, akhir pekan, dan garis hari ini.
 * Rujukan: FR-12-01, FR-12-02, NFR-16 (hari ini = Rabu 28/10/2026).
 */
import { describe, expect, it } from 'vitest';
import { toIsoDate as d } from '@/shared/iso-date';
import {
  MAX_WINDOW_MONTHS,
  buildTimeline,
  defaultWindow,
  normalizeWindow,
  parseMonthKey,
  parseZoom,
  placeRange,
  shiftMonthKey,
} from '@/ui/gantt/timeline';

const TODAY = d('2026-10-28');

describe('jendela bulan', () => {
  it('bawaan bulan ini sampai dua bulan ke depan', () => {
    expect(defaultWindow(TODAY)).toEqual({ from: '2026-10', to: '2026-12' });
  });

  it('menggeser bulan melewati batas tahun', () => {
    expect(shiftMonthKey('2026-11', 2)).toBe('2027-01');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
  });

  it('parameter tidak valid memakai bawaan; to sebelum from disamakan; panjang dibatasi', () => {
    expect(normalizeWindow('abc', undefined, TODAY)).toEqual({ from: '2026-10', to: '2026-12' });
    expect(normalizeWindow('2026-13', '2026-12', TODAY)).toEqual({ from: '2026-10', to: '2026-12' });
    expect(normalizeWindow('2026-11', '2026-09', TODAY)).toEqual({ from: '2026-11', to: '2026-11' });
    expect(normalizeWindow('2026-01', '2030-01', TODAY).to).toBe(shiftMonthKey('2026-01', MAX_WINDOW_MONTHS - 1));
  });

  it('kunci bulan dan zoom divalidasi', () => {
    expect(parseMonthKey('2026-10')).toEqual({ year: 2026, month: 10 });
    expect(parseMonthKey('2026-00')).toBeNull();
    expect(parseMonthKey(undefined)).toBeNull();
    expect(parseZoom('DAY')).toBe('DAY');
    expect(parseZoom('xyz')).toBe('WEEK');
  });
});

describe('buildTimeline', () => {
  const timeline = buildTimeline({ from: '2026-10', to: '2026-10' }, 'DAY', TODAY);

  it('mencakup seluruh bulan dan menghitung jumlah hari', () => {
    expect(timeline).toMatchObject({ start: '2026-10-01', end: '2026-10-31', totalDays: 31 });
    expect(timeline.columns).toHaveLength(31);
  });

  it('garis hari ini berada di tengah hari ke-28 dan hilang bila di luar jendela', () => {
    expect(timeline.todayPercent).toBeCloseTo(((27 + 0.5) / 31) * 100, 5);
    expect(buildTimeline({ from: '2026-11', to: '2026-11' }, 'DAY', TODAY).todayPercent).toBeNull();
  });

  it('akhir pekan diarsir sepasang Sabtu-Minggu dan tidak ada pada zoom bulan', () => {
    expect(timeline.weekends).toHaveLength(5);
    expect(timeline.weekends[0]?.leftPercent).toBeCloseTo((2 / 31) * 100, 5);
    expect(timeline.weekends[0]?.widthPercent).toBeCloseTo((2 / 31) * 100, 5);
    expect(buildTimeline({ from: '2026-10', to: '2026-10' }, 'MONTH', TODAY).weekends).toEqual([]);
  });

  it('kolom minggu dimulai Senin dan kolom bulan menamai bulan', () => {
    const weeks = buildTimeline({ from: '2026-10', to: '2026-10' }, 'WEEK', TODAY).columns;
    expect(weeks[0]?.label).toBe('28/09');
    const months = buildTimeline({ from: '2026-10', to: '2026-12' }, 'MONTH', TODAY).columns;
    expect(months.map((c) => c.label)).toEqual(['Okt 2026', 'Nov 2026', 'Des 2026']);
    expect(months.reduce((sum, c) => sum + c.widthPercent, 0)).toBeCloseTo(100, 5);
  });

  it('lebar minimum jalur mengikuti zoom', () => {
    const day = buildTimeline({ from: '2026-10', to: '2026-12' }, 'DAY', TODAY).minWidthPx;
    const week = buildTimeline({ from: '2026-10', to: '2026-12' }, 'WEEK', TODAY).minWidthPx;
    expect(day).toBeGreaterThan(week);
  });
});

describe('placeRange', () => {
  const timeline = buildTimeline({ from: '2026-10', to: '2026-10' }, 'DAY', TODAY);

  it('menghitung posisi dan lebar sebuah rentang inklusif', () => {
    const span = placeRange(timeline, { start: d('2026-10-19'), end: d('2026-10-23') });
    expect(span?.leftPercent).toBeCloseTo((18 / 31) * 100, 5);
    expect(span?.widthPercent).toBeCloseTo((5 / 31) * 100, 5);
  });

  it('memotong rentang yang melewati jendela dan menolak yang di luar', () => {
    const clipped = placeRange(timeline, { start: d('2026-09-20'), end: d('2026-10-03') });
    expect(clipped?.leftPercent).toBe(0);
    expect(clipped?.widthPercent).toBeCloseTo((3 / 31) * 100, 5);
    expect(placeRange(timeline, { start: d('2026-11-02'), end: d('2026-11-06') })).toBeNull();
    expect(placeRange(timeline, { start: d('2026-09-01'), end: d('2026-09-30') })).toBeNull();
  });
});
