import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

/**
 * Membaca `DATABASE_URL` dari lingkungan atau berkas `.env` (CLI Prisma tidak memuat `.env` sendiri).
 * Masukan: tidak ada. Keluaran: URL koneksi atau string kosong bila tidak ada.
 * Efek samping: membaca berkas `.env` bila ada (hanya baca).
 * Rujukan: Technical Design §15, TD-16.
 */
function readDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync('.env')) return '';
  return /^DATABASE_URL=(.*)$/m.exec(readFileSync('.env', 'utf8'))?.[1]?.trim() ?? '';
}

/**
 * Konfigurasi CLI Prisma PMCP: lokasi skema dan migrasi, serta koneksi untuk `db pull`.
 * Efek samping: tidak ada (hanya objek konfigurasi).
 * Rujukan: Technical Design TD-16.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: readDatabaseUrl() },
});
