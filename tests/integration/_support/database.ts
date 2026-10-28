/**
 * Pembantu uji integrasi: menyediakan database uji yang bersih.
 *
 * Bila `DATABASE_URL` tersedia (dari lingkungan atau berkas `.env`) dan server dapat dihubungi, uji
 * berjalan di PostgreSQL sungguhan pada database SEMENTARA yang dibuat lalu dihapus otomatis; database
 * aplikasi tidak pernah disentuh. Bila tidak, uji memakai PGlite (PostgreSQL dalam WASM) sebagai cadangan.
 * Pipeline CI/CD wajib memakai PostgreSQL sungguhan (Technical Design §14).
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { Client } from 'pg';

/** Antarmuka minimal yang dipakai uji: eksekusi skrip, kueri, dan penutupan. */
export interface TestDb {
  /** Nama mesin yang dipakai, ditampilkan pada laporan uji. */
  readonly engine: 'postgres' | 'pglite';
  /** URL koneksi database sementara (hanya untuk mesin postgres); dipakai klien Prisma pada uji use case. */
  readonly url?: string;
  /** Menjalankan skrip SQL (boleh banyak pernyataan). */
  exec(sql: string): Promise<void>;
  /** Menjalankan satu kueri dan mengembalikan baris hasil. */
  query<T = Record<string, unknown>>(sql: string): Promise<{ rows: T[] }>;
  /** Menutup koneksi dan, untuk PostgreSQL sungguhan, menghapus database sementara. */
  close(): Promise<void>;
}

/**
 * Membaca `DATABASE_URL` dari lingkungan atau berkas `.env` di akar proyek.
 * Masukan: tidak ada. Keluaran: URL koneksi, atau undefined bila tidak ada.
 * Efek samping: membaca berkas `.env` bila ada (hanya baca).
 * Rujukan: Technical Design §15 (konfigurasi lewat lingkungan).
 */
function readDatabaseUrl(): string | undefined {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = join(__dirname, '..', '..', '..', '.env');
  if (!existsSync(envFile)) return undefined;
  const match = /^DATABASE_URL=(.*)$/m.exec(readFileSync(envFile, 'utf8'));
  return match?.[1]?.trim();
}

/**
 * Membuat database PostgreSQL sementara pada server yang ditunjuk URL, dan mengembalikan pembungkusnya.
 * Masukan: URL koneksi server (nama database pada URL diabaikan, dipakai database `postgres`).
 * Keluaran: `TestDb` yang terhubung ke database sementara; `close()` menghapusnya.
 * Efek samping: `CREATE DATABASE` dan kelak `DROP DATABASE` pada server; tidak menyentuh database lain.
 * Rujukan: Technical Design §14.
 */
async function createTempPostgres(url: string): Promise<TestDb> {
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const name = `pmcp_test_${randomBytes(4).toString('hex')}`;
  const adminClient = new Client({ connectionString: admin.toString() });
  await adminClient.connect();
  await adminClient.query(`CREATE DATABASE ${name}`);

  const target = new URL(url);
  target.pathname = `/${name}`;
  const client = new Client({ connectionString: target.toString() });
  await client.connect();

  return {
    engine: 'postgres',
    url: target.toString(),
    exec: async (sql) => {
      await client.query(sql);
    },
    query: async <T>(sql: string) => ({ rows: (await client.query(sql)).rows as T[] }),
    close: async () => {
      await client.end();
      await adminClient.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await adminClient.end();
    },
  };
}

/**
 * Membuat database uji dalam memori memakai PGlite (cadangan bila PostgreSQL tidak dapat dihubungi).
 * Masukan: tidak ada. Keluaran: `TestDb` berbasis PGlite.
 * Efek samping: memulai instansi PGlite di memori.
 * Rujukan: Technical Design §14.
 */
function createPglite(): TestDb {
  const pglite = new PGlite();
  return {
    engine: 'pglite',
    exec: async (sql) => {
      await pglite.exec(sql);
    },
    query: async <T>(sql: string) => ({ rows: (await pglite.query<T>(sql)).rows }),
    close: () => pglite.close(),
  };
}

/**
 * Menyediakan database uji: PostgreSQL sungguhan bila dapat dihubungi, selain itu PGlite.
 * Masukan: tidak ada. Keluaran: `TestDb` siap pakai (belum bermigrasi).
 * Efek samping: dapat membuat database sementara di server PostgreSQL.
 * Rujukan: Technical Design §14.
 */
export async function createTestDb(): Promise<TestDb> {
  const url = readDatabaseUrl();
  if (url) {
    try {
      return await createTempPostgres(url);
    } catch (error) {
      console.warn(`PostgreSQL tidak dapat dipakai untuk uji (${(error as Error).message}); memakai PGlite.`);
    }
  }
  return createPglite();
}
