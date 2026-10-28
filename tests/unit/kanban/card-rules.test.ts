import { describe, expect, it } from 'vitest';
import {
  checkCancel,
  checkCardProgress,
  checkCardTarget,
  checkNewCard,
  checkReschedule,
  computeMarkers,
  effectiveCardProgress,
  planMove,
  rescheduleWarning,
} from '@/modules/kanban/domain/card-rules';
import type { CardState } from '@/modules/kanban/domain/card-types';
import { toIsoDate } from '@/shared/iso-date';

const d = toIsoDate;
const TODAY = d('2026-10-28');
const base: CardState = { column: 'PLANNED', progress: 0, progressNeedsInput: false, planStart: d('2026-10-26'), planEnd: d('2026-10-30'), doneOn: null, cancelled: false };

describe('kartu baru', () => {
  it('menolak estimasi jam 0 dan di atas 80 jam, menerima desimal', () => {
    const fields = { title: 'Analisis klaim', planStart: d('2026-10-28'), planEnd: d('2026-10-29') };
    expect(checkNewCard({ ...fields, estimateHours: 0 }).issues).toContain('ESTIMATE_INVALID');
    expect(checkNewCard({ ...fields, estimateHours: 80.5 }).issues).toContain('ESTIMATE_INVALID');
    expect(checkNewCard({ ...fields, estimateHours: 1.5 })).toEqual({ issues: [], estimateMinutes: 90 });
    expect(checkNewCard({ ...fields, estimateHours: null }).estimateMinutes).toBeNull();
  });

  it('memvalidasi judul dan rencana', () => {
    const issues = checkNewCard({ title: ' ab ', planStart: d('2026-10-30'), planEnd: d('2026-10-28'), estimateHours: null }).issues;
    expect(issues).toEqual(['TITLE_TOO_SHORT', 'PLAN_END_BEFORE_START']);
    expect(checkNewCard({ title: 'abc', planStart: null, planEnd: null, estimateHours: null }).issues).toEqual(['PLAN_REQUIRED']);
  });

  it('membatasi project sasaran: harus ditugaskan, bukan Batal/Selesai, tahapan belum Selesai', () => {
    expect(checkCardTarget({ projectStatus: 'RUNNING', stageStatus: 'RUNNING', isAssigned: false })).toBe('NOT_ASSIGNED');
    expect(checkCardTarget({ projectStatus: 'CANCELLED', stageStatus: 'RUNNING', isAssigned: true })).toBe('PROJECT_CLOSED');
    expect(checkCardTarget({ projectStatus: 'COMPLETED', stageStatus: 'DONE', isAssigned: true })).toBe('PROJECT_CLOSED');
    expect(checkCardTarget({ projectStatus: 'RUNNING', stageStatus: 'DONE', isAssigned: true })).toBe('STAGE_DONE');
    expect(checkCardTarget({ projectStatus: 'DEFERRED', stageStatus: 'NOT_STARTED', isAssigned: true })).toBeNull();
  });
});

describe('perpindahan dan progres', () => {
  it('ke Done mengisi tanggal selesai hari ini dan progres 100', () => {
    const plan = planMove({ ...base, column: 'IN_PROGRESS', progress: 50 }, 'DONE', TODAY);
    expect(plan).toMatchObject({ ok: true, column: 'DONE', doneOn: TODAY, progressChange: { from: 50, to: 100 } });
  });

  it('kembali dari Done ke In Progress mereset progres dan meminta diisi', () => {
    const plan = planMove({ ...base, column: 'DONE', doneOn: d('2026-10-27') }, 'IN_PROGRESS', TODAY);
    expect(plan).toMatchObject({ ok: true, doneOn: null, progress: 0, progressNeedsInput: true, progressChange: { from: 100, to: 0 } });
  });

  it('menolak pindah ke kolom yang sama atau kartu dibatalkan', () => {
    expect(planMove(base, 'PLANNED', TODAY)).toEqual({ ok: false, issue: 'SAME_COLUMN' });
    expect(planMove({ ...base, cancelled: true }, 'DONE', TODAY)).toEqual({ ok: false, issue: 'CANCELLED' });
  });

  it('progres kartu hanya boleh 0/25/50/75 dan hanya saat In Progress', () => {
    const inProgress = { ...base, column: 'IN_PROGRESS' as const };
    expect(checkCardProgress(inProgress, 50)).toBeNull();
    expect(checkCardProgress(inProgress, 60)).toBe('INVALID_VALUE');
    expect(checkCardProgress(inProgress, 100)).toBe('INVALID_VALUE');
    expect(checkCardProgress(base, 25)).toBe('NOT_IN_PROGRESS');
    expect(effectiveCardProgress({ column: 'DONE', progress: 0 })).toBe(100);
    expect(effectiveCardProgress({ column: 'PLANNED', progress: 50 })).toBe(0);
  });
});

describe('jadwal ulang dan pembatalan', () => {
  const next = { start: d('2026-11-02'), end: d('2026-11-04') };
  it('menolak tanpa alasan, rencana sama, atau kartu Done', () => {
    expect(checkReschedule(base, next, false, '')).toEqual(['REASON_REQUIRED']);
    expect(checkReschedule(base, { start: base.planStart, end: base.planEnd }, true, '')).toEqual(['SAME_AS_CURRENT']);
    expect(checkReschedule({ ...base, column: 'DONE', doneOn: TODAY }, next, true, '')).toEqual(['CARD_DONE']);
    expect(checkReschedule(base, next, true, '')).toEqual([]);
  });

  it('peringatan batas muncul tepat pada batas', () => {
    expect(rescheduleWarning(2, 3).reached).toBe(false);
    expect(rescheduleWarning(3, 3).reached).toBe(true);
  });

  it('pembatalan wajib alasan dan hanya untuk kartu belum Done', () => {
    expect(checkCancel(base, '   ')).toBe('REASON_REQUIRED');
    expect(checkCancel(base, 'Tidak jadi')).toBeNull();
    expect(checkCancel({ ...base, column: 'DONE', doneOn: TODAY }, 'x')).toBe('CARD_DONE');
    expect(checkCancel({ ...base, cancelled: true }, 'x')).toBe('ALREADY_CANCELLED');
  });
});

describe('penanda rencana', () => {
  const input = (patch: Partial<Parameters<typeof computeMarkers>[0]>) => ({
    ...base, isAdhoc: false, loggedMinutes: 0, estimateMinutes: null, rescheduleCount: 0, rescheduleThreshold: 3, extendsStageWorkdays: 0, today: TODAY, ...patch,
  });

  it('Planned dengan rencana mulai kemarin = Belum dimulai', () => {
    expect(computeMarkers(input({ planStart: d('2026-10-27') })).map((m) => m.kind)).toContain('NOT_STARTED');
  });

  it('Melewati rencana n hari kalender bila belum Done', () => {
    expect(computeMarkers(input({ planEnd: d('2026-10-25') }))).toContainEqual({ kind: 'PAST_PLAN', days: 3 });
  });

  it('Done dua hari setelah rencana selesai = Terlambat 2 hr; tepat waktu = Sesuai rencana', () => {
    const late = computeMarkers(input({ column: 'DONE', doneOn: d('2026-11-01'), planEnd: d('2026-10-30') }));
    expect(late).toContainEqual({ kind: 'LATE_DONE', days: 2 });
    const onTime = computeMarkers(input({ column: 'DONE', doneOn: d('2026-10-30') }));
    expect(onTime).toContainEqual({ kind: 'ON_PLAN' });
  });

  it('dadakan, melebihi estimasi jam, jadwal ulang dengan peringatan, perpanjangan tahapan, progres perlu diisi', () => {
    const kinds = computeMarkers(
      input({ column: 'IN_PROGRESS', progressNeedsInput: true, isAdhoc: true, loggedMinutes: 130, estimateMinutes: 120, rescheduleCount: 3, extendsStageWorkdays: 2 }),
    );
    expect(kinds).toContainEqual({ kind: 'ADHOC' });
    expect(kinds).toContainEqual({ kind: 'OVER_ESTIMATE' });
    expect(kinds).toContainEqual({ kind: 'RESCHEDULED', count: 3, warn: true });
    expect(kinds).toContainEqual({ kind: 'EXTENDS_STAGE', workdays: 2 });
    expect(kinds).toContainEqual({ kind: 'PROGRESS_NEEDED' });
  });
});
