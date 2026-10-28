/**
 * Uji keterlambatan, penilaian tahapan selesai, status tampilan, dan model bar Gantt.
 * Rujukan: FR-13-03, FR-05-01 butir 7, FR-12-02, NFR-16 (hari ini = Rabu 28/10/2026).
 */
import { describe, expect, it } from 'vitest';
import { toIsoDate as d } from '@/shared/iso-date';
import { ganttBarModel } from '@/modules/project/domain/gantt-bar';
import { completionVerdict, displayStatus, stageLateness } from '@/modules/project/domain/stage-lateness';

const TODAY = d('2026-10-28');
const est = (start: string, end: string) => ({ start: d(start), end: d(end) });

describe('stageLateness', () => {
  const base = { stageStatus: 'RUNNING', projectStatus: 'RUNNING', baseline: null, today: TODAY } as const;

  it('estimasi selesai Jumat 23/10 pada Rabu 28/10 = Terlambat 5 hari kalender', () => {
    const result = stageLateness({ ...base, estimate: est('2026-10-12', '2026-10-23') });
    expect(result).toMatchObject({ isLate: true, daysPastCurrent: 5 });
  });

  it('estimasi selesai hari ini belum terlambat; kemarin = 1 hari', () => {
    expect(stageLateness({ ...base, estimate: est('2026-10-12', '2026-10-28') }).isLate).toBe(false);
    expect(stageLateness({ ...base, estimate: est('2026-10-12', '2026-10-27') }).daysPastCurrent).toBe(1);
  });

  it('tidak terlambat bila Ditahan, Selesai, atau project bukan Berjalan', () => {
    const estimate = est('2026-10-12', '2026-10-23');
    expect(stageLateness({ ...base, stageStatus: 'HELD', estimate }).isLate).toBe(false);
    expect(stageLateness({ ...base, stageStatus: 'DONE', estimate }).isLate).toBe(false);
    expect(stageLateness({ ...base, projectStatus: 'DEFERRED', estimate }).isLate).toBe(false);
  });

  it('tanpa timeline tidak pernah terlambat', () => {
    expect(stageLateness({ ...base, estimate: null }).isLate).toBe(false);
  });

  it('menghitung hari terhadap estimasi awal juga', () => {
    const result = stageLateness({ ...base, estimate: est('2026-10-12', '2026-10-26'), baseline: est('2026-10-12', '2026-10-21') });
    expect(result).toMatchObject({ daysPastCurrent: 2, daysPastBaseline: 7 });
  });
});

describe('completionVerdict', () => {
  const estimate = est('2026-10-05', '2026-10-16');
  const baseline = est('2026-10-05', '2026-10-09');

  it('selesai 3 hari setelah estimasi terkini = Telat +3 hari (AC FR-12-02)', () => {
    expect(completionVerdict(d('2026-10-19'), estimate, baseline)).toEqual({ kind: 'LATE', days: 3 });
  });

  it('tepat waktu terhadap estimasi terkini tetapi melewati estimasi awal', () => {
    expect(completionVerdict(d('2026-10-14'), estimate, baseline)).toEqual({ kind: 'PAST_BASELINE', days: 5 });
  });

  it('selesai sebelum estimasi awal = tepat waktu', () => {
    expect(completionVerdict(d('2026-10-08'), estimate, baseline)).toEqual({ kind: 'ON_TIME' });
  });
});

describe('displayStatus', () => {
  const base = { projectStatus: 'RUNNING', baseline: null, today: TODAY, holdSince: null } as const;

  it('urutan evaluasi: Selesai, Ditahan, Terlambat, Berjalan, Belum dijadwalkan, Seharusnya sudah mulai, Belum mulai', () => {
    const past = est('2026-10-12', '2026-10-23');
    expect(displayStatus({ ...base, stageStatus: 'DONE', estimate: past }).kind).toBe('DONE');
    expect(displayStatus({ ...base, stageStatus: 'HELD', estimate: past, holdSince: d('2026-10-20') })).toEqual({ kind: 'HELD', since: d('2026-10-20') });
    expect(displayStatus({ ...base, stageStatus: 'RUNNING', estimate: past })).toEqual({ kind: 'LATE', days: 5 });
    expect(displayStatus({ ...base, stageStatus: 'RUNNING', estimate: est('2026-10-20', '2026-11-05') }).kind).toBe('RUNNING');
    expect(displayStatus({ ...base, stageStatus: 'NOT_STARTED', estimate: null }).kind).toBe('UNSCHEDULED');
    expect(displayStatus({ ...base, stageStatus: 'NOT_STARTED', estimate: est('2026-10-28', '2026-11-05') }).kind).toBe('SHOULD_HAVE_STARTED');
    expect(displayStatus({ ...base, stageStatus: 'NOT_STARTED', estimate: est('2026-11-02', '2026-11-05') }).kind).toBe('NOT_STARTED');
  });

  it('Berjalan tanpa timeline tampil Berjalan, bukan Belum dijadwalkan (AC FR-05-01)', () => {
    expect(displayStatus({ ...base, stageStatus: 'RUNNING', estimate: null }).kind).toBe('RUNNING');
  });

  it('tahapan lewat estimasi pada project Ditunda tidak tampil terlambat (AC FR-13-03)', () => {
    const result = displayStatus({ ...base, projectStatus: 'DEFERRED', stageStatus: 'RUNNING', estimate: est('2026-10-12', '2026-10-23') });
    expect(result.kind).toBe('RUNNING');
  });
});

describe('ganttBarModel', () => {
  const common = { projectStatus: 'RUNNING', today: TODAY, revisionWarnThreshold: 3 } as const;

  it('tahapan tanpa timeline tidak digambar', () => {
    const bar = ganttBarModel({ ...common, stageStatus: 'NOT_STARTED', estimate: null, baseline: null, actualStart: null, actualEnd: null, holds: [], revisionCount: 0 });
    expect(bar).toBeNull();
  });

  it('estimasi direvisi: tampil estimasi awal, tambahan kuning, dan jumlah revisi (AC R2)', () => {
    const bar = ganttBarModel({
      ...common,
      stageStatus: 'RUNNING',
      estimate: est('2026-10-19', '2026-11-06'),
      baseline: est('2026-10-19', '2026-10-30'),
      actualStart: d('2026-10-19'),
      actualEnd: null,
      holds: [],
      revisionCount: 2,
    });
    expect(bar?.baseline).toEqual(est('2026-10-19', '2026-10-30'));
    expect(bar?.extension).toEqual(est('2026-10-31', '2026-11-06'));
    expect(bar?.revisionCount).toBe(2);
    expect(bar?.overrun).toBeNull();
    expect(bar?.repeatedRevision).toBe(false);
  });

  it('estimasi awal sama dengan terkini tidak ditampilkan sebagai lapisan terpisah', () => {
    const bar = ganttBarModel({
      ...common,
      stageStatus: 'RUNNING',
      estimate: est('2026-10-19', '2026-10-30'),
      baseline: est('2026-10-19', '2026-10-30'),
      actualStart: d('2026-10-19'),
      actualEnd: null,
      holds: [],
      revisionCount: 0,
    });
    expect(bar?.baseline).toBeNull();
    expect(bar?.extension).toBeNull();
  });

  it('tahapan terlambat menampilkan telat murni merah setelah ujung bar dan garis tepi merah', () => {
    const bar = ganttBarModel({
      ...common,
      stageStatus: 'RUNNING',
      estimate: est('2026-10-12', '2026-10-23'),
      baseline: est('2026-10-12', '2026-10-23'),
      actualStart: d('2026-10-12'),
      actualEnd: null,
      holds: [],
      revisionCount: 0,
    });
    expect(bar?.lateOutline).toBe(true);
    expect(bar?.overrun).toEqual({ start: d('2026-10-24'), end: TODAY, days: 5 });
  });

  it('tahapan selesai telat 3 hari menampilkan Telat +3 hari dan menyimpan hasil penilaian', () => {
    const bar = ganttBarModel({
      ...common,
      stageStatus: 'DONE',
      estimate: est('2026-10-05', '2026-10-16'),
      baseline: est('2026-10-05', '2026-10-16'),
      actualStart: d('2026-10-05'),
      actualEnd: d('2026-10-19'),
      holds: [],
      revisionCount: 0,
    });
    expect(bar?.completion).toEqual({ kind: 'LATE', days: 3 });
    expect(bar?.overrun?.days).toBe(3);
    expect(bar?.actual).toEqual({ start: d('2026-10-05'), end: d('2026-10-19') });
  });

  it('tahapan ditahan melewati estimasi tidak ditandai terlambat dan hold menjadi segmen jeda', () => {
    const bar = ganttBarModel({
      ...common,
      stageStatus: 'HELD',
      estimate: est('2026-10-12', '2026-10-23'),
      baseline: est('2026-10-12', '2026-10-23'),
      actualStart: d('2026-10-12'),
      actualEnd: null,
      holds: [{ since: d('2026-10-20'), resumedOn: null }],
      revisionCount: 0,
    });
    expect(bar?.lateOutline).toBe(false);
    expect(bar?.overrun).toBeNull();
    expect(bar?.holdSegments).toEqual([est('2026-10-20', '2026-10-28')]);
  });

  it('revisi mencapai batas menandai revisi berulang', () => {
    const bar = ganttBarModel({
      ...common,
      stageStatus: 'RUNNING',
      estimate: est('2026-10-19', '2026-11-06'),
      baseline: est('2026-10-19', '2026-10-23'),
      actualStart: null,
      actualEnd: null,
      holds: [],
      revisionCount: 3,
    });
    expect(bar?.repeatedRevision).toBe(true);
  });
});
