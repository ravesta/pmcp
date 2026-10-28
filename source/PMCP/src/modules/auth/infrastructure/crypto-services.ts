/**
 * Layanan kriptografi auth: hash password argon2id dan token sesi.
 */
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import type { PasswordHasher, TokenService } from '../application/ports';
import type { RandomIndex } from '../domain/temporary-password';

/**
 * Parameter argon2id awal: memori 19 MiB, 2 iterasi, paralelisme 1 (minimum rekomendasi OWASP).
 * Disimpan di dalam string hash sehingga dapat dinaikkan kelak tanpa memutus hash lama.
 * Disetel pada server sasaran saat deployment (Security Design §4.2).
 */
const ARGON_OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

/**
 * Membuat layanan hash password berbasis argon2id.
 * Masukan: tidak ada. Keluaran: `PasswordHasher`.
 * Efek samping: tidak ada pada pembuatan; `hash` dan `verify` memakai CPU dan memori; hash tiruan
 * dihitung malas sekali.
 * Rujukan: Security Design §4.2 dan §4.3 (waktu seragam anti enumerasi), TDR-06.
 */
export function createArgon2Hasher(): PasswordHasher {
  let dummyHash: Promise<string> | null = null;
  return {
    /** Menghasilkan hash argon2id. Masukan: password. Keluaran: string hash. Efek samping: tidak ada. */
    hash: (password) => argonHash(password, ARGON_OPTIONS),

    /** Memverifikasi password terhadap hash; hash rusak dianggap tidak cocok. Efek samping: tidak ada. */
    async verify(hash, password) {
      try {
        return await argonVerify(hash, password);
      } catch {
        return false;
      }
    },

    /** Memverifikasi terhadap hash tiruan agar waktu respons seragam. Efek samping: tidak ada. */
    async verifyDummy(password) {
      dummyHash ??= argonHash(randomBytes(16).toString('hex'), ARGON_OPTIONS);
      try {
        await argonVerify(await dummyHash, password);
      } catch {
        /* hasil sengaja diabaikan */
      }
    },
  };
}

/**
 * Membuat layanan token sesi: 32 byte acak (base64url) dan hash SHA-256.
 * Masukan: tidak ada. Keluaran: `TokenService`.
 * Efek samping: membaca sumber acak kriptografis pada `generate`.
 * Rujukan: Security Design §5, TD-10.
 */
export function createTokenService(): TokenService {
  return {
    /** Membuat token baru. Efek samping: membaca CSPRNG. */
    generate: () => randomBytes(32).toString('base64url'),
    /** Menghitung hash SHA-256 token. Efek samping: tidak ada. */
    hash: (token) => new Uint8Array(createHash('sha256').update(token).digest()),
  };
}

/**
 * Sumber bilangan acak kriptografis untuk password sementara.
 * Masukan: batas atas eksklusif. Keluaran: bilangan bulat acak 0 sampai max-1.
 * Efek samping: membaca CSPRNG.
 * Rujukan: FR-01-05 butir 1.
 */
export const cryptoRandomIndex: RandomIndex = (max) => randomInt(max);
