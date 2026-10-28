import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatPlanRange, markerChip, neighbours } from '@/ui/format/kanban-labels';
import { toIsoDate } from '@/shared/iso-date';

describe('label Kanban', () => {
  it('durasi seperti mockup', () => {
    expect(formatDuration(45)).toBe('45 mnt');
    expect(formatDuration(120)).toBe('2 j');
    expect(formatDuration(90)).toBe('1 j 30 mnt');
  });

  it('jam dan rentang rencana', () => {
    expect(formatClock(570)).toBe('09:30');
    expect(formatClock(0)).toBe('00:00');
    expect(formatPlanRange(toIsoDate('2026-10-26'), toIsoDate('2026-10-30'))).toBe('26/10 - 30/10');
    expect(formatPlanRange(toIsoDate('2026-10-26'), toIsoDate('2026-10-26'))).toBe('26/10');
  });

  it('kolom tetangga untuk tombol panah', () => {
    expect(neighbours('PLANNED')).toEqual({ previous: null, next: 'IN_PROGRESS' });
    expect(neighbours('IN_PROGRESS')).toEqual({ previous: 'PLANNED', next: 'DONE' });
    expect(neighbours('DONE')).toEqual({ previous: 'IN_PROGRESS', next: null });
  });

  it('chip penanda: teks dan nada', () => {
    expect(markerChip({ kind: 'PAST_PLAN', days: 3 })).toEqual({ text: 'Melewati rencana 3 hr', tone: 'late' });
    expect(markerChip({ kind: 'RESCHEDULED', count: 3, warn: true }).text).toContain('⚠');
    expect(markerChip({ kind: 'RESCHEDULED', count: 1, warn: false }).tone).toBe('rev');
    expect(markerChip({ kind: 'EXTENDS_STAGE', workdays: 2 }).text).toBe('Di luar estimasi tahapan +2 hk');
    expect(markerChip({ kind: 'ON_PLAN' }).tone).toBe('ok');
  });
});
