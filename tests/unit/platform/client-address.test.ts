/**
 * Uji penentuan alamat klien: hanya percaya header dari proxy tepercaya (anti pemalsuan).
 * Rujukan: FR-01-01 butir 3, Technical Design §10.
 */
import { describe, expect, it } from 'vitest';
import { clientAddressFrom } from '@/platform/client-address';

describe('clientAddressFrom', () => {
  it('tanpa proxy tepercaya, header diabaikan', () => {
    expect(clientAddressFrom('1.2.3.4', 0)).toBe('tidak-diketahui');
  });

  it('satu proxy: entri terakhir (yang ditambahkan proxy) dipakai, bukan yang diketik klien', () => {
    expect(clientAddressFrom('9.9.9.9, 10.0.0.5', 1)).toBe('10.0.0.5');
  });

  it('dua proxy: entri kedua dari kanan', () => {
    expect(clientAddressFrom('9.9.9.9, 10.0.0.5, 10.0.0.1', 2)).toBe('10.0.0.5');
  });

  it('header kosong atau terlalu pendek untuk jumlah proxy', () => {
    expect(clientAddressFrom(null, 1)).toBe('tidak-diketahui');
    expect(clientAddressFrom('', 1)).toBe('tidak-diketahui');
    expect(clientAddressFrom('10.0.0.5', 2)).toBe('tidak-diketahui');
  });

  it('entri yang terlalu panjang ditolak', () => {
    expect(clientAddressFrom('x'.repeat(101), 1)).toBe('tidak-diketahui');
  });
});
