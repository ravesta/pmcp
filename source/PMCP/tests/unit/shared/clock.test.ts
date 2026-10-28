/**
 * Uji jam sistem dan jam tetap (TD-05, NFR-16 butir 1).
 */
import { describe, expect, it } from 'vitest';
import { createFixedClock, createSystemClock } from '@/shared/clock';
import { isIsoDate, toIsoDate } from '@/shared/iso-date';

describe('jam tetap', () => {
  it('selalu menghasilkan tanggal yang sama', () => {
    const clock = createFixedClock(toIsoDate('2026-10-28'));
    expect(clock.today()).toBe('2026-10-28');
    expect(clock.today()).toBe('2026-10-28');
  });

  it('12:00 waktu Asia/Jakarta adalah 05:00 UTC', () => {
    const clock = createFixedClock(toIsoDate('2026-10-28'));
    expect(clock.now().toISOString()).toBe('2026-10-28T05:00:00.000Z');
  });

  it('jam dapat ditentukan, mis. 23:30 Jakarta masih tanggal yang sama', () => {
    const clock = createFixedClock(toIsoDate('2026-10-28'), '23:30:00');
    expect(clock.now().toISOString()).toBe('2026-10-28T16:30:00.000Z');
    expect(clock.today()).toBe('2026-10-28');
  });
});

describe('jam sistem', () => {
  it('menghasilkan tanggal bisnis yang valid', () => {
    expect(isIsoDate(createSystemClock().today())).toBe(true);
  });
});
