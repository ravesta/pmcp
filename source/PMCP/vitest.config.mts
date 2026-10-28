import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Konfigurasi Vitest PMCP.
 * Tujuan: menjalankan uji unit dan integrasi di Node dengan alias `@` ke `src`.
 * Efek samping: tidak ada (hanya objek konfigurasi).
 * Rujukan: Technical Design §14.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
