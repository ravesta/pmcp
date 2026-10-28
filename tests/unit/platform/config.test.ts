/**
 * Uji konfigurasi lingkungan: bawaan, validasi, dan larangan jam uji di produksi.
 * Rujukan: Security Design §9, Technical Design §15, NFR-16 butir 1.
 */
import { describe, expect, it } from 'vitest';
import { loadConfig } from '@/platform/config';
import { createClockFor } from '@/platform/clock-provider';

describe('loadConfig', () => {
  it('memakai nilai bawaan kebijakan sesi (idle 120, maksimum 720 menit)', () => {
    const config = loadConfig({});
    expect(config.sessionIdleMinutes).toBe(120);
    expect(config.sessionAbsoluteMinutes).toBe(720);
    expect(config.nodeEnv).toBe('development');
    expect(config.clockOverride).toBeUndefined();
  });

  it('menolak CLOCK_OVERRIDE pada produksi', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', CLOCK_OVERRIDE: '2026-10-28' })).toThrow(/production/);
  });

  it('server build Next.js (NODE_ENV=production) di staging boleh memakai jam tetap bila APP_ENV=staging', () => {
    const config = loadConfig({ NODE_ENV: 'production', APP_ENV: 'staging', CLOCK_OVERRIDE: '2026-10-28' });
    expect(config.appEnv).toBe('staging');
    expect(config.clockOverride).toBe('2026-10-28');
  });

  it('APP_ENV=production menolak jam tetap walau NODE_ENV bukan production', () => {
    expect(() => loadConfig({ NODE_ENV: 'development', APP_ENV: 'production', CLOCK_OVERRIDE: '2026-10-28' })).toThrow(/production/);
  });

  it('tanpa APP_ENV, build produksi dianggap produksi (sisi aman)', () => {
    expect(loadConfig({ NODE_ENV: 'production' }).appEnv).toBe('production');
  });

  it('menerima CLOCK_OVERRIDE pada non-produksi dan menjadikannya jam tetap', () => {
    const config = loadConfig({ NODE_ENV: 'test', CLOCK_OVERRIDE: '2026-10-28' });
    expect(config.clockOverride).toBe('2026-10-28');
    expect(createClockFor(config).today()).toBe('2026-10-28');
  });

  it('menolak CLOCK_OVERRIDE yang bukan tanggal valid', () => {
    expect(() => loadConfig({ NODE_ENV: 'test', CLOCK_OVERRIDE: '2026-02-30' })).toThrow(/YYYY-MM-DD/);
  });

  it('menolak nilai lingkungan yang salah tipe', () => {
    expect(() => loadConfig({ TRUSTED_PROXY_COUNT: 'banyak' })).toThrow(/Konfigurasi tidak valid/);
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Konfigurasi tidak valid/);
  });
});
