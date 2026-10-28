/**
 * Uji progres tahapan, laju, dan penanda Tertinggal dengan angka AC FSD (hari ini = Rabu 28/10/2026).
 * Rujukan: FR-05-02, BL-40, NFR-16.
 */
import { describe, expect, it } from 'vitest';
import { toIsoDate as d } from '@/shared/iso-date';
import {
  effectiveStageProgress,
  expectedProgress,
  isLagging,
  stageSystemProgress,
} from '@/modules/project/domain/stage-progress';

const TODAY = d('2026-10-28');

describe('stageSystemProgress', () => {
  it('dua kartu berbobot 5 dan 5 hari kerja berprogres 100% dan 0% menghasilkan 50% (AC FR-05-02)', () => {
    const cards = [
      { progress: 100, plannedStart: d('2026-10-19'), plannedEnd: d('2026-10-23') },
      { progress: 0, plannedStart: d('2026-10-26'), plannedEnd: d('2026-10-30') },
    ];
    expect(stageSystemProgress(cards)).toBe(50);
  });

  it('tanpa kartu mengembalikan null (diisi manual)', () => {
    expect(stageSystemProgress([])).toBeNull();
  });

  it('bobot minimal 1 hari kerja walau rencana jatuh di akhir pekan', () => {
    const cards = [
      { progress: 100, plannedStart: d('2026-10-24'), plannedEnd: d('2026-10-25') },
      { progress: 0, plannedStart: d('2026-10-26'), plannedEnd: d('2026-10-26') },
    ];
    expect(stageSystemProgress(cards)).toBe(50);
  });

  it('dibatasi 99% selama belum Selesai dan 100% bila Selesai', () => {
    const cards = [{ progress: 100, plannedStart: d('2026-10-26'), plannedEnd: d('2026-10-27') }];
    expect(stageSystemProgress(cards)).toBe(99);
    expect(stageSystemProgress(cards, true)).toBe(100);
  });

  it('membulatkan setengah naik', () => {
    const cards = [
      { progress: 25, plannedStart: d('2026-10-26'), plannedEnd: d('2026-10-26') },
      { progress: 50, plannedStart: d('2026-10-27'), plannedEnd: d('2026-10-27') },
    ];
    expect(stageSystemProgress(cards)).toBe(38);
  });
});

describe('effectiveStageProgress', () => {
  it('Selesai selalu 100, angka manual menimpa hitungan sistem, dan tanpa keduanya 0', () => {
    expect(effectiveStageProgress({ status: 'DONE', systemProgress: 40, manualProgress: 30 })).toBe(100);
    expect(effectiveStageProgress({ status: 'RUNNING', systemProgress: 80, manualProgress: 30 })).toBe(30);
    expect(effectiveStageProgress({ status: 'RUNNING', systemProgress: 80, manualProgress: null })).toBe(80);
    expect(effectiveStageProgress({ status: 'NOT_STARTED', systemProgress: null, manualProgress: null })).toBe(0);
  });
});

describe('expectedProgress', () => {
  const estimate = { start: d('2026-10-19'), end: d('2026-10-30') };

  it('hari kerja sampai kemarin dibagi total hari kerja (7 dari 10 = 70%)', () => {
    expect(expectedProgress(estimate, [], TODAY)).toBe(70);
  });

  it('bernilai 0 bila estimasi mulai hari ini atau belum tiba', () => {
    expect(expectedProgress({ start: TODAY, end: d('2026-11-06') }, [], TODAY)).toBe(0);
    expect(expectedProgress({ start: d('2026-11-02'), end: d('2026-11-06') }, [], TODAY)).toBe(0);
  });

  it('bila estimasi selesai sudah lewat, dihitung sampai estimasi selesai (100%)', () => {
    expect(expectedProgress({ start: d('2026-10-05'), end: d('2026-10-09') }, [], TODAY)).toBe(100);
  });

  it('mengeluarkan hari kerja hold dari pembilang dan penyebut: (7 - 3) / (10 - 3) = 57%', () => {
    const holds = [{ since: d('2026-10-21'), resumedOn: d('2026-10-26') }];
    expect(expectedProgress(estimate, holds, TODAY)).toBe(57);
  });

  it('hold yang masih berjalan dihitung sampai kemarin', () => {
    const holds = [{ since: d('2026-10-26'), resumedOn: null }];
    // hari kerja hold: 26 dan 27 = 2 -> (7 - 2) / (10 - 2) = 62,5 -> 63
    expect(expectedProgress(estimate, holds, TODAY)).toBe(63);
  });

  it('penyebut nol (seluruh estimasi dalam hold) bernilai 0', () => {
    const holds = [{ since: d('2026-10-19'), resumedOn: d('2026-11-02') }];
    expect(expectedProgress({ start: d('2026-10-19'), end: d('2026-10-23') }, holds, TODAY)).toBe(0);
  });
});

describe('isLagging', () => {
  const base = { stageStatus: 'RUNNING', projectStatus: 'RUNNING' } as const;

  it('selisih tepat 20 poin tidak ditandai, 21 poin ditandai (AC FR-05-02)', () => {
    expect(isLagging({ ...base, progress: 50, expected: 70 })).toBe(false);
    expect(isLagging({ ...base, progress: 49, expected: 70 })).toBe(true);
  });

  it('tahapan 10 hari kerja, 8 hari lewat, progres 50% (diharapkan 80%) ditandai Tertinggal', () => {
    expect(isLagging({ ...base, progress: 50, expected: 80 })).toBe(true);
  });

  it('hanya untuk tahapan Berjalan pada project Berjalan', () => {
    expect(isLagging({ stageStatus: 'HELD', projectStatus: 'RUNNING', progress: 0, expected: 90 })).toBe(false);
    expect(isLagging({ stageStatus: 'NOT_STARTED', projectStatus: 'RUNNING', progress: 0, expected: 90 })).toBe(false);
    expect(isLagging({ stageStatus: 'RUNNING', projectStatus: 'DEFERRED', progress: 0, expected: 90 })).toBe(false);
  });
});
