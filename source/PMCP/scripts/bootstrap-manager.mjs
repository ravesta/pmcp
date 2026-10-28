/**
 * Membuat akun Manager awal (FR-01-06) atau mereset passwordnya (pemulihan darurat).
 *
 * Tujuan: aplikasi hanya memiliki SATU akun Manager yang dibuat di luar layar aplikasi lewat prosedur
 * terkontrol saat instalasi. Skrip ini menghasilkan password sementara acak (wajib diganti saat login pertama),
 * menampilkannya sekali di terminal, dan mencatat peristiwa audit kategori Keamanan dengan identitas operator.
 * Password tidak pernah diterima dari argumen baris perintah dan tidak ditulis ke log.
 *
 * Pemakaian:
 *   node scripts/bootstrap-manager.mjs                 membuat Manager (ditolak bila sudah ada)
 *   node scripts/bootstrap-manager.mjs --reset         pemulihan darurat: reset password Manager yang ada
 * Masukan: `DATABASE_URL` dari lingkungan atau `.env`; nama pengguna Manager bawaan `manager`.
 * Efek samping: INSERT atau UPDATE `app_user`, mencabut semua sesi Manager (mode reset), INSERT `audit_event`.
 * Rujukan: FSD FR-01-06, Security Design §4.5, CL-055.
 */
import { randomInt } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash } from '@node-rs/argon2';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reset = process.argv.includes('--reset');
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/**
 * Membaca `DATABASE_URL` dari lingkungan atau berkas `.env`.
 * Masukan: tidak ada. Keluaran: URL koneksi atau undefined.
 * Efek samping: membaca berkas `.env` bila ada (hanya baca).
 * Rujukan: Technical Design §15.
 */
function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const file = join(root, '.env');
  return existsSync(file) ? /^DATABASE_URL=(.*)$/m.exec(readFileSync(file, 'utf8'))?.[1]?.trim() : undefined;
}

/**
 * Membuat password sementara 16 karakter dalam empat kelompok dari sumber acak kriptografis.
 * Masukan: tidak ada. Keluaran: password sementara.
 * Efek samping: membaca CSPRNG.
 * Rujukan: FR-01-05 butir 1.
 */
function temporaryPassword() {
  const groups = [];
  for (let g = 0; g < 4; g += 1) {
    let chunk = '';
    for (let i = 0; i < 4; i += 1) chunk += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(chunk);
  }
  return groups.join('-');
}

/**
 * Menjalankan pembuatan atau reset akun Manager dalam satu transaksi.
 * Masukan: tidak ada. Keluaran: janji selesai; mengakhiri proses dengan kode 1 bila gagal.
 * Efek samping: lihat deskripsi berkas.
 * Rujukan: FR-01-06, Security Design §4.5.
 */
async function main() {
  const url = readDatabaseUrl();
  if (!url) throw new Error('DATABASE_URL tidak ditemukan (lingkungan atau .env).');
  const operator = userInfo().username;
  const password = temporaryPassword();
  const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query("SELECT id, username FROM app_user WHERE role = 'MANAGER' AND is_active ORDER BY id LIMIT 1 FOR UPDATE");
    let userId;
    let username;
    if (existing.rows.length > 0) {
      if (!reset) throw new Error('Akun Manager aktif sudah ada. Gunakan --reset untuk pemulihan darurat (atas permintaan tertulis pemilik).');
      userId = existing.rows[0].id;
      username = existing.rows[0].username;
      await client.query('UPDATE app_user SET password_hash = $1, must_change_password = true, password_changed_at = now() WHERE id = $2', [passwordHash, userId]);
      await client.query('UPDATE session SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
      await client.query("DELETE FROM login_throttle WHERE scope = 'USER' AND key = $1", [username]);
    } else {
      if (reset) throw new Error('Tidak ada akun Manager aktif untuk direset.');
      username = 'manager';
      const created = await client.query(
        "INSERT INTO app_user (username, role, password_hash, must_change_password) VALUES ($1, 'MANAGER', $2, true) RETURNING id",
        [username, passwordHash],
      );
      userId = created.rows[0].id;
    }
    await client.query(
      "INSERT INTO audit_event (actor_user_id, actor_label, category, action, entity_type, entity_id, summary) VALUES (NULL, $1, 'SECURITY', $2, 'app_user', $3, $4)",
      [`Operator sistem (${operator})`, reset ? 'account.manager_recovered' : 'account.manager_bootstrapped', String(userId), reset ? `Password Manager direset lewat prosedur darurat oleh operator ${operator}` : `Akun Manager dibuat saat instalasi oleh operator ${operator}`],
    );
    await client.query('COMMIT');
    console.log(`${reset ? 'Password Manager direset' : 'Akun Manager dibuat'}.`);
    console.log(`Username        : ${username}`);
    console.log(`Password sementara (hanya tampil sekali, wajib diganti saat login pertama): ${password}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
