/**
 * Uji pembaca dan penyusun parameter URL tab Project (daftar putih, bawaan, dan keamanan masukan).
 * Rujukan: BL-41, FR-10-02, FR-12-01, FR-14-02, Security Design §7.
 */
import { describe, expect, it } from 'vitest';
import { activeFilterCount, buildProjectHref, parseProjectParams } from '@/app/(app)/project/_lib/search-params';
import { toIsoDate as d } from '@/shared/iso-date';

const TODAY = d('2026-10-28');

describe('parseProjectParams', () => {
  it('tanpa parameter: tampilan awal Gantt, tanpa filter, jendela bulan ini + 2 bulan, zoom Minggu', () => {
    const params = parseProjectParams({}, null, TODAY);
    expect(params).toMatchObject({ mode: 'GANTT', filter: {}, mineOnly: false, page: 1, pageSize: 0, zoom: 'WEEK', showLayers: true });
    expect(params.window).toEqual({ from: '2026-10', to: '2026-12' });
  });

  it('membaca filter yang dikenal dan mengabaikan nilai di luar daftar putih', () => {
    const params = parseProjectParams(
      { v: 'daftar', q: '  portal  ', status: 'RUNNING', pic: '7', tahap: 'QA', sts: 'LAGGING', jenis: 'NEW', lengkap: 'INCOMPLETE' },
      null,
      TODAY,
    );
    expect(params.mode).toBe('LIST');
    expect(params.filter).toEqual({ q: 'portal', status: 'RUNNING', picId: 7, stage: 'QA', stageStatus: 'LAGGING', projectType: 'NEW', completeness: 'INCOMPLETE' });
    const hostile = parseProjectParams({ status: "RUNNING'; DROP TABLE project;--", pic: '1 OR 1=1', tahap: 'XX', sts: 'ALL', hal: '-3', per: 'abc' }, null, TODAY);
    expect(hostile.filter).toEqual({});
    expect(hostile.page).toBe(1);
    expect(hostile.pageSize).toBe(0);
  });

  it('"Hanya milik saya" hanya berlaku bagi PIC dan membawa id PIC dari sesi', () => {
    expect(parseProjectParams({ milik: '1' }, null, TODAY).mineOnly).toBe(false);
    const pic = parseProjectParams({ milik: '1' }, 5, TODAY);
    expect(pic.mineOnly).toBe(true);
    expect(pic.filter.mineOnlyPicId).toBe(5);
  });

  it('parameter berulang memakai nilai pertama; kata kunci dipotong 100 karakter', () => {
    expect(parseProjectParams({ status: ['DEFERRED', 'RUNNING'] }, null, TODAY).filter.status).toBe('DEFERRED');
    expect(parseProjectParams({ q: 'x'.repeat(300) }, null, TODAY).filter.q).toHaveLength(100);
  });
});

describe('buildProjectHref', () => {
  const base = parseProjectParams({}, null, TODAY);
  const defaultWindow = base.window;

  it('keadaan bawaan menghasilkan alamat polos', () => {
    expect(buildProjectHref(base, {}, defaultWindow)).toBe('/project');
  });

  it('berpindah ke Daftar mempertahankan filter (BL-41)', () => {
    const filtered = parseProjectParams({ q: 'klaim', status: 'RUNNING' }, null, TODAY);
    expect(buildProjectHref(filtered, { mode: 'LIST' }, defaultWindow)).toBe('/project?v=daftar&q=klaim&status=RUNNING');
  });

  it('menulis periode, zoom, dan lapisan hanya pada Gantt dan hanya bila berbeda dari bawaan', () => {
    const shifted = { ...base, window: { from: '2026-11', to: '2027-01' }, zoom: 'DAY' as const, showLayers: false };
    expect(buildProjectHref(shifted, {}, defaultWindow)).toBe('/project?dari=2026-11&sampai=2027-01&zoom=DAY&lapisan=0');
    expect(buildProjectHref(shifted, { mode: 'LIST' }, defaultWindow)).toBe('/project?v=daftar');
  });

  it('halaman dan ukuran halaman ditulis bila bukan bawaan', () => {
    expect(buildProjectHref(base, { page: 3, pageSize: 20 }, defaultWindow)).toBe('/project?hal=3&per=20');
  });

  it('hasil parse lalu build lalu parse kembali menghasilkan keadaan yang sama', () => {
    const original = parseProjectParams({ v: 'daftar', q: 'a b', status: 'DEFERRED', sts: 'LATE', hal: '2', per: '10' }, null, TODAY);
    const href = buildProjectHref(original, {}, defaultWindow);
    const query = Object.fromEntries(new URL(`http://x${href}`).searchParams.entries());
    expect(parseProjectParams(query, null, TODAY)).toEqual(original);
  });
});

describe('activeFilterCount', () => {
  it('menghitung filter yang aktif termasuk "Hanya milik saya"', () => {
    expect(activeFilterCount(parseProjectParams({}, null, TODAY))).toBe(0);
    expect(activeFilterCount(parseProjectParams({ q: 'a', status: 'RUNNING', milik: '1' }, 3, TODAY))).toBe(3);
  });
});
