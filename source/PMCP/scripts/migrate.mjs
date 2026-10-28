/**
 * Menjalankan migrasi SQL `prisma/migrations/*` pada database di `DATABASE_URL`.
 *
 * Tujuan: mengisi database pengembangan atau staging dengan skema PMCP tanpa memerlukan CLI Prisma.
 * Setiap migrasi dicatat di tabel `schema_migration`; yang sudah tercatat dilewati sehingga skrip aman
 * dijalankan berulang (maju saja, Technology Baseline §10). Setiap migrasi berjalan dalam satu transaksi.
 * Masukan: `DATABASE_URL` dari lingkungan atau `.env`; argumen `--dry-run` hanya menampilkan rencana.
 * Efek samping: membuat tabel `schema_migration` dan menjalankan DDL pada database sasaran.
 * Rujukan: Technical Design §15, TD-16, database-design §11.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

/**
 * Membaca `DATABASE_URL` dari lingkungan atau berkas `.env`.
 * Masukan: tidak ada. Keluaran: URL koneksi atau undefined.
 * Efek samping: membaca berkas `.env` bila ada (hanya baca).
 * Rujukan: Technical Design §15.
 */
function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = join(root, '.env');
  if (!existsSync(file)) return undefined;
  return /^DATABASE_URL=(.*)$/m.exec(readFileSync(file, 'utf8'))?.[1]?.trim();
}

/**
 * Menjalankan seluruh migrasi yang belum tercatat.
 * Masukan: tidak ada. Keluaran: janji selesai; mengakhiri proses dengan kode 1 bila gagal.
 * Efek samping: DDL dan penulisan `schema_migration` pada database sasaran.
 * Rujukan: Technical Design §15, TD-16.
 */
async function main() {
  const url = readDatabaseUrl();
  if (!url) throw new Error('DATABASE_URL tidak ditemukan (lingkungan atau .env).');
  const target = new URL(url);
  console.log(`Sasaran: ${target.hostname}:${target.port || 5432}${target.pathname} (user ${target.username})`);

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migration (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    );
    const done = new Set((await client.query('SELECT name FROM schema_migration')).rows.map((row) => row.name));
    const folders = readdirSync(join(root, 'prisma', 'migrations'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const folder of folders) {
      if (done.has(folder)) {
        console.log(`lewati   ${folder}`);
        continue;
      }
      if (dryRun) {
        console.log(`akan     ${folder}`);
        continue;
      }
      const sql = readFileSync(join(root, 'prisma', 'migrations', folder, 'migration.sql'), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migration (name) VALUES ($1)', [folder]);
        await client.query('COMMIT');
        console.log(`terapkan ${folder}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migrasi ${folder} gagal dan dibatalkan: ${error.message}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
