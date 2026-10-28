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
  monthLabel,
  monthOptions,
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

describe('opsi bulan dan label', () => {
  it('menyediakan tiga bulan ke belakang sampai enam bulan ke depan dengan label singkat', () => {
    const options = monthOptions(TODAY);
    expect(options).toHaveLength(10);
    expect(options[0]).toEqual({ value: '2026-07', label: 'Jul 2026' });
    expect(options[3]).toEqual({ value: '2026-10', label: 'Okt 2026' });
    expect(options[9]).toEqual({ value: '2027-04', label: 'Apr 2027' });
    expect(monthLabel('2026-10')).toBe('Okt 2026');
  });
});

describe('buildTimeline', () => {
  const timeline = buildTimeline({ from: '2026-10', to: '2026-10' }, 'DAY', TODAY);

  it('mencakup seluruh bulan; lebar jalur = hari x piksel per hari (24 untuk zoom Hari)', () => {
    expect(timeline).toMatchObject({ start: '2026-10-01', end: '2026-10-31', totalDays: 31, pxPerDay: 24, widthPx: 31 * 24 });
    expect(timeline.dayNumbers).toHaveLength(31);
    expect(timeline.dayNumbers[27]).toMatchObject({ label: '28', leftPx: 27 * 24 });
  });

  it('penanda atas berupa Senin dd/mm (zoom Hari dan Minggu) dan awal bulan (zoom Bulan)', () => {
    expect(timeline.ticks.map((t) => t.label)).toEqual(['05/10', '12/10', '19/10', '26/10']);
    const month = buildTimeline({ from: '2026-10', to: '2026-12' }, 'MONTH', TODAY);
    expect(month.ticks.map((t) => t.label)).toEqual(['Okt 2026', 'Nov 2026', 'Des 2026']);
    expect(month.dayNumbers).toEqual([]);
    expect(month.pxPerDay).toBe(4);
    expect(buildTimeline({ from: '2026-10', to: '2026-10' }, 'WEEK', TODAY).pxPerDay).toBe(10);
  });

  it('garis hari ini berada di tengah hari ke-28 dan hilang bila di luar jendela', () => {
    expect(timeline.todayPx).toBe(27 * 24 + 12);
    expect(buildTimeline({ from: '2026-11', to: '2026-11' }, 'DAY', TODAY).todayPx).toBeNull();
  });

  it('akhir pekan diarsir per hari Sabtu dan Minggu dan tidak ada pada zoom Bulan', () => {
    // Oktober 2026: Sabtu-Minggu = 3-4, 10-11, 17-18, 24-25, 31
    expect(timeline.weekends).toHaveLength(9);
    expect(timeline.weekends[0]).toEqual({ leftPx: 2 * 24, widthPx: 24 });
    expect(buildTimeline({ from: '2026-10', to: '2026-10' }, 'MONTH', TODAY).weekends).toEqual([]);
  });
});

describe('placeRange', () => {
  const timeline = buildTimeline({ from: '2026-10', to: '2026-10' }, 'DAY', TODAY);

  it('menghitung posisi dan lebar rentang inklusif dalam piksel', () => {
    expect(placeRange(timeline, { start: d('2026-10-19'), end: d('2026-10-23') })).toEqual({ leftPx: 18 * 24, widthPx: 5 * 24 });
  });

  it('memotong rentang yang melewati jendela dan menolak yang di luar', () => {
    expect(placeRange(timeline, { start: d('2026-09-20'), end: d('2026-10-03') })).toEqual({ leftPx: 0, widthPx: 3 * 24 });
    expect(placeRange(timeline, { start: d('2026-11-02'), end: d('2026-11-06') })).toBeNull();
    expect(placeRange(timeline, { start: d('2026-09-01'), end: d('2026-09-30') })).toBeNull();
  });
});
