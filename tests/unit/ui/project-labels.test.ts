/**
 * Uji label dan nada tampilan status project dan tahapan (teks mengikuti FSD).
 * Rujukan: FR-05-01 butir 7, FR-12-02 butir 4, FR-13-03, FR-13-05 butir 9.
 */
import { describe, expect, it } from 'vitest';
import {
  completionBadge,
  displayStatusBadge,
  formatAssignees,
  formatDateOrDash,
  formatRange,
  formatShift,
  projectStatusTone,
} from '@/ui/format/project-labels';
import { toIsoDate as d } from '@/shared/iso-date';

describe('displayStatusBadge', () => {
  it('menulis teks FSD untuk setiap status tampilan', () => {
    expect(displayStatusBadge({ kind: 'DONE' })).toEqual({ text: 'Selesai', tone: 'ok' });
    expect(displayStatusBadge({ kind: 'HELD', since: d('2026-10-20') })).toEqual({ text: 'Ditahan sejak 20/10', tone: 'hold' });
    expect(displayStatusBadge({ kind: 'LATE', days: 5 })).toEqual({ text: 'Terlambat 5 hari', tone: 'late' });
    expect(displayStatusBadge({ kind: 'RUNNING' }).text).toBe('Berjalan');
    expect(displayStatusBadge({ kind: 'UNSCHEDULED' }).text).toBe('Belum dijadwalkan');
    expect(displayStatusBadge({ kind: 'SHOULD_HAVE_STARTED' }).text).toBe('Seharusnya sudah mulai');
    expect(displayStatusBadge({ kind: 'NOT_STARTED' }).text).toBe('Belum mulai');
  });
});

describe('completionBadge', () => {
  it('Telat dan Lewat estimasi awal ditandai; tepat waktu atau kosong tidak', () => {
    expect(completionBadge({ kind: 'LATE', days: 3 })).toEqual({ text: 'Telat +3 hari', tone: 'late' });
    expect(completionBadge({ kind: 'PAST_BASELINE', days: 5 })).toEqual({ text: 'Lewat estimasi awal +5 hari', tone: 'warn' });
    expect(completionBadge({ kind: 'ON_TIME' })).toBeNull();
    expect(completionBadge(null)).toBeNull();
  });
});

describe('format tanggal dan teks bantu', () => {
  it('rentang estimasi dd/mm/yyyy dan teks pengganti', () => {
    expect(formatRange({ start: d('2026-10-19'), end: d('2026-10-30') })).toBe('19/10/2026 - 30/10/2026');
    expect(formatRange(null)).toBe('Belum ada timeline');
    expect(formatDateOrDash(null)).toBe('-');
    expect(formatDateOrDash('2026-10-28')).toBe('28/10/2026');
  });

  it('pergeseran hari kerja dan nama PIC', () => {
    expect(formatShift(5)).toBe('+5 hk dari estimasi awal');
    expect(formatShift(-2)).toBe('-2 hk dari estimasi awal');
    expect(formatShift(0)).toBe('Tidak bergeser');
    expect(formatShift(null)).toBeNull();
    expect(formatAssignees([])).toBe('Belum ada PIC');
    expect(formatAssignees([{ name: 'Rina' }, { name: 'Sari' }])).toBe('Rina, Sari');
  });

  it('nada status project', () => {
    expect(projectStatusTone('RUNNING')).toBe('info');
    expect(projectStatusTone('COMPLETED')).toBe('ok');
    expect(projectStatusTone('DEFERRED')).toBe('hold');
  });
});
