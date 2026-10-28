/**
 * Uji hasil dan galat use case (Technical Design §8).
 */
import { describe, expect, it } from 'vitest';
import { AppError, fail, ok } from '@/shared/result';

describe('Result', () => {
  it('ok membawa data', () => {
    expect(ok(42)).toEqual({ ok: true, data: 42 });
  });

  it('fail membawa rincian galat', () => {
    const result = fail({ code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke halaman ini.' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('FORBIDDEN');
  });

  it('AppError menyimpan rincian dan pesan', () => {
    const error = new AppError({ code: 'CONFLICT', message: 'Data telah berubah.' });
    expect(error.message).toBe('Data telah berubah.');
    expect(error.info.code).toBe('CONFLICT');
  });
});
