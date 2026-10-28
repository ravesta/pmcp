import { describe, expect, it } from 'vitest';
import { computeCompliance, type ComplianceCard } from '@/modules/kanban/domain/compliance';
import { checkNewLog, exceedsDayWarning, parseClockMinutes, totalLogs, type NewLogFields } from '@/modules/kanban/domain/work-log-rules';
import { toIsoDate } from '@/shared/iso-date';

const d = toIsoDate;
const TODAY = d('2026-10-28');

const log = (patch: Partial<NewLogFields>): NewLogFields => ({
  date: TODAY, start: '09:00', end: '11:00', description: 'Analisis', stepName: 'Analisis', isProjectCard: true, activeSteps: ['Analisis'], today: TODAY, sameDaySpans: [], ...patch,
});

describe('log activity', () => {
  it('mengurai jam dan menolak format salah', () => {
    expect(parseClockMinutes('09:30')).toBe(570);
    expect(parseClockMinutes('24:00')).toBeNull();
    expect(parseClockMinutes('9:30')).toBeNull();
  });

  it('log valid menghasilkan interval', () => {
    expect(checkNewLog(log({}))).toEqual({ issues: [], span: { start: 540, end: 660 } });
  });

  it('menolak bentrok 09:00-11:00 dengan 10:00-12:00, tetapi bukan yang berimpit tepat', () => {
    const existing = [{ start: 540, end: 660 }];
    expect(checkNewLog(log({ start: '10:00', end: '12:00', sameDaySpans: existing })).issues).toEqual(['OVERLAP']);
    expect(checkNewLog(log({ start: '11:00', end: '12:00', sameDaySpans: existing })).issues).toEqual([]);
  });

  it('menolak tanggal esok, jam terbalik, uraian kosong', () => {
    expect(checkNewLog(log({ date: d('2026-10-29') })).issues).toEqual(['DATE_IN_FUTURE']);
    expect(checkNewLog(log({ start: '11:00', end: '10:00' })).issues).toEqual(['END_NOT_AFTER_START']);
    expect(checkNewLog(log({ description: '   ' })).issues).toEqual(['DESCRIPTION_REQUIRED']);
  });

  it('kartu project wajib step aktif; activity tanpa step', () => {
    expect(checkNewLog(log({ stepName: null })).issues).toEqual(['STEP_REQUIRED']);
    expect(checkNewLog(log({ stepName: 'Lain' })).issues).toEqual(['STEP_UNKNOWN']);
    expect(checkNewLog(log({ activeSteps: [], stepName: null })).issues).toEqual(['NO_ACTIVE_STEP']);
    expect(checkNewLog(log({ isProjectCard: false, stepName: null, activeSteps: [] })).issues).toEqual([]);
  });

  it('peringatan bila total hari melebihi 8 jam', () => {
    expect(exceedsDayWarning(420, 60)).toBe(false);
    expect(exceedsDayWarning(420, 120)).toBe(true);
  });

  it('total waktu dan per step', () => {
    expect(totalLogs([{ minutes: 60, stepName: 'A' }, { minutes: 30, stepName: 'B' }, { minutes: 15, stepName: 'A' }, { minutes: 5, stepName: null }])).toEqual({
      totalMinutes: 110,
      count: 4,
      perStep: [{ stepName: 'A', minutes: 75 }, { stepName: 'B', minutes: 30 }],
    });
  });
});

describe('kepatuhan rencana', () => {
  const range = { start: d('2026-10-26'), end: d('2026-11-01') };
  const card = (patch: Partial<ComplianceCard>): ComplianceCard => ({
    ownerPicId: 1, planStart: d('2026-10-26'), planEnd: d('2026-10-27'), doneOn: d('2026-10-27'), isAdhoc: false, cancelled: false, rescheduleCount: 0, ...patch,
  });

  it('4 jatuh tempo dengan 3 tepat waktu = 75%', () => {
    const rows = computeCompliance(
      [card({}), card({}), card({}), card({ doneOn: null })],
      range,
      TODAY,
    );
    expect(rows).toEqual([expect.objectContaining({ picId: 1, planned: 4, due: 4, onTime: 3, overdueOpen: 1, notDue: 0, percent: 75 })]);
  });

  it('5 direncanakan, 4 jatuh tempo (3 tepat, 1 lewat belum selesai), 1 belum jatuh tempo', () => {
    const rows = computeCompliance(
      [card({}), card({}), card({}), card({ doneOn: null }), card({ planEnd: d('2026-10-30'), doneOn: d('2026-10-28') })],
      range,
      TODAY,
    );
    expect(rows[0]).toMatchObject({ planned: 5, due: 4, notDue: 1, percent: 75 });
    expect(rows[0]!.onTime + rows[0]!.late + rows[0]!.overdueOpen + rows[0]!.notDue).toBe(rows[0]!.planned);
  });

  it('dadakan tidak masuk penyebut dan dibatalkan tidak dihitung; selesai terlambat bukan tepat waktu', () => {
    const rows = computeCompliance(
      [card({ isAdhoc: true }), card({ cancelled: true }), card({ doneOn: d('2026-10-28') })],
      range,
      TODAY,
    );
    expect(rows[0]).toMatchObject({ planned: 1, due: 1, onTime: 0, late: 1, adhoc: 1, percent: 0 });
  });

  it('PIC tanpa penyebut menampilkan null dan tanpa rencana maupun dadakan tidak ada barisnya', () => {
    const rows = computeCompliance([card({ planEnd: d('2026-10-30'), doneOn: null }), card({ ownerPicId: 2, planEnd: d('2026-12-01') })], range, TODAY);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ picId: 1, due: 0, percent: null });
  });

  it('jadwal ulang dihitung dan kartu pindah periode mengikuti rencana terkini', () => {
    const rows = computeCompliance([card({ rescheduleCount: 2, planEnd: d('2026-11-05'), doneOn: null })], range, TODAY);
    expect(rows).toEqual([]);
    const next = computeCompliance([card({ rescheduleCount: 2, planEnd: d('2026-11-05'), doneOn: null })], { start: d('2026-11-02'), end: d('2026-11-08') }, TODAY);
    expect(next[0]).toMatchObject({ planned: 1, rescheduled: 1, notDue: 1 });
  });
});
