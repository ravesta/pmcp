/**
 * Uji revisi estimasi: validasi manual, revisi otomatis dari rencana kartu, penggabungan harian, peringatan.
 * Rujukan: FR-13-01, FR-13-04, FR-13-05, BL-12, BL-18, BL-39.
 */
import { describe, expect, it } from 'vitest';
import { toIsoDate as d } from '@/shared/iso-date';
import {
  checkManualRevision,
  estimateShiftWorkdays,
  mergeRevisionNotes,
  planAutoRevision,
  revisionWarning,
  shouldMergeRevision,
} from '@/modules/project/domain/revision';

const est = (start: string, end: string) => ({ start: d(start), end: d(end) });

describe('checkManualRevision', () => {
  const current = est('2026-10-19', '2026-10-30');
  const valid = { current, newStart: d('2026-10-19'), newEnd: d('2026-11-06'), categoryId: 1, note: 'Scope bertambah' };

  it('revisi lengkap dinyatakan valid dan catatan dipangkas', () => {
    expect(checkManualRevision({ ...valid, note: '  Scope bertambah  ' })).toEqual({ issues: [], note: 'Scope bertambah' });
  });

  it('revisi tanpa kategori ditolak (AC FR-13-01)', () => {
    expect(checkManualRevision({ ...valid, categoryId: null }).issues).toContain('CATEGORY_REQUIRED');
  });

  it('estimasi sama dengan yang berlaku ditolak', () => {
    expect(checkManualRevision({ ...valid, newEnd: d('2026-10-30') }).issues).toEqual(['SAME_AS_CURRENT']);
  });

  it('selesai sebelum mulai, tanggal tidak lengkap, catatan terlalu pendek atau panjang ditolak', () => {
    expect(checkManualRevision({ ...valid, newEnd: d('2026-10-01') }).issues).toContain('END_BEFORE_START');
    expect(checkManualRevision({ ...valid, newStart: null }).issues).toContain('DATES_REQUIRED');
    expect(checkManualRevision({ ...valid, note: 'ab' }).issues).toContain('NOTE_TOO_SHORT');
    expect(checkManualRevision({ ...valid, note: 'x'.repeat(301) }).issues).toContain('NOTE_TOO_LONG');
  });

  it('tahapan tanpa estimasi tidak dapat direvisi', () => {
    expect(checkManualRevision({ ...valid, current: null }).issues).toContain('NO_BASELINE');
  });
});

describe('planAutoRevision', () => {
  const stage = est('2026-10-19', '2026-10-23'); // Senin-Jumat

  it('rencana berakhir 5 hari kerja setelah estimasi memicu perpanjangan sampai tanggal rencana', () => {
    expect(planAutoRevision(stage, d('2026-10-26'), d('2026-10-30'))).toEqual({
      kind: 'EXTEND',
      from: d('2026-10-23'),
      to: d('2026-10-30'),
      workdaysOver: 5,
    });
  });

  it('rencana berakhir Sabtu setelah estimasi Jumat (selisih nol hari kerja) tidak memicu (AC FR-13-05)', () => {
    expect(planAutoRevision(stage, d('2026-10-19'), d('2026-10-24'))).toEqual({ kind: 'NONE' });
  });

  it('rencana berakhir Senin berikutnya memicu satu hari kerja; estimasi baru boleh akhir pekan', () => {
    expect(planAutoRevision(stage, d('2026-10-19'), d('2026-10-26'))).toMatchObject({ kind: 'EXTEND', workdaysOver: 1 });
    expect(planAutoRevision(stage, d('2026-10-19'), d('2026-10-25'))).toEqual({ kind: 'NONE' });
  });

  it('rencana di dalam estimasi, atau mulai lebih awal, tidak mengubah estimasi', () => {
    expect(planAutoRevision(stage, d('2026-10-12'), d('2026-10-22'))).toEqual({ kind: 'NONE' });
  });

  it('tahapan tanpa estimasi menawarkan rencana sebagai estimasi awal', () => {
    expect(planAutoRevision(null, d('2026-10-26'), d('2026-10-30'))).toEqual({
      kind: 'ADOPT_PLAN_AS_BASELINE',
      estimate: est('2026-10-26', '2026-10-30'),
    });
  });
});

describe('shouldMergeRevision', () => {
  const last = { seq: 2, createdOn: d('2026-10-28'), createdBy: 7, isAutomatic: true, note: 'a' };

  it('PIC yang sama pada hari yang sama menggabungkan revisi otomatis (AC FR-13-05)', () => {
    expect(shouldMergeRevision(last, 7, d('2026-10-28'))).toBe(true);
  });

  it('pelaku lain, hari lain, revisi manual, atau tanpa revisi tidak digabung', () => {
    expect(shouldMergeRevision(last, 8, d('2026-10-28'))).toBe(false);
    expect(shouldMergeRevision(last, 7, d('2026-10-29'))).toBe(false);
    expect(shouldMergeRevision({ ...last, isAutomatic: false }, 7, d('2026-10-28'))).toBe(false);
    expect(shouldMergeRevision(null, 7, d('2026-10-28'))).toBe(false);
  });
});

describe('mergeRevisionNotes', () => {
  it('menggabungkan dengan pemisah dan dipangkas ke batas kolom', () => {
    expect(mergeRevisionNotes('a', 'b')).toBe('a | b');
    expect([...mergeRevisionNotes('x'.repeat(1999), 'yy')].length).toBe(2000);
  });
});

describe('revisionWarning', () => {
  it('di bawah batas tidak ada peringatan', () => {
    expect(revisionWarning(2, 3)).toEqual({ atLimit: false, justReached: false });
  });

  it('revisi ke-3 pada batas 3 menampilkan pemberitahuan; revisi ke-4 tetap tanda batas (AC FR-13-04)', () => {
    expect(revisionWarning(3, 3, true)).toEqual({ atLimit: true, justReached: true });
    expect(revisionWarning(4, 3, true).atLimit).toBe(true);
    expect(revisionWarning(3, 3)).toEqual({ atLimit: true, justReached: false });
  });
});

describe('estimateShiftWorkdays', () => {
  it('menghitung pergeseran selesai dalam hari kerja, positif bila mundur', () => {
    const baseline = est('2026-10-19', '2026-10-23');
    expect(estimateShiftWorkdays(baseline, est('2026-10-19', '2026-10-30'))).toBe(5);
    expect(estimateShiftWorkdays(baseline, baseline)).toBe(0);
    expect(estimateShiftWorkdays(baseline, est('2026-10-19', '2026-10-21'))).toBe(-2);
  });
});
