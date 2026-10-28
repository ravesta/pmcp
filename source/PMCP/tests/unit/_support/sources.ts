/**
 * Pembantu uji arsitektur: mendaftar berkas sumber `src/` dan membaca isinya tanpa komentar.
 * Rujukan: Technical Design TD-06 (dependensi satu arah ditegakkan otomatis), Lampiran B.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Akar proyek (folder yang memuat `src/`). */
export const PROJECT_ROOT = join(__dirname, '..', '..', '..');

/** Folder sumber aplikasi. */
export const SRC_DIR = join(PROJECT_ROOT, 'src');

/**
 * Mendaftar semua berkas .ts dan .tsx di bawah satu folder secara rekursif.
 * Masukan: folder awal. Keluaran: daftar path absolut berkas.
 * Efek samping: membaca sistem berkas (hanya baca).
 * Rujukan: TD-06.
 */
export function listSourceFiles(dir: string = SRC_DIR): string[] {
  const result: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== 'generated') result.push(...listSourceFiles(full)); // kode hasil generate Prisma dikecualikan
    }
    else if (/\.(ts|tsx)$/.test(name)) result.push(full);
  }
  return result;
}

/**
 * Path relatif terhadap `src/` dengan pemisah `/` agar aturan tidak bergantung pada sistem operasi.
 * Masukan: path absolut. Keluaran: path relatif bergaya POSIX.
 * Efek samping: tidak ada.
 * Rujukan: TD-06.
 */
export function srcRelative(file: string): string {
  return relative(SRC_DIR, file).split(sep).join('/');
}

/**
 * Membuang komentar blok dan komentar baris agar pemindaian impor dan pemanggilan jam tidak
 * salah mendeteksi teks di dalam komentar.
 * Masukan: isi berkas. Keluaran: isi tanpa komentar.
 * Efek samping: tidak ada.
 * Rujukan: TD-05, TD-06.
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * Membaca isi berkas sumber.
 * Masukan: path absolut. Keluaran: teks isi berkas.
 * Efek samping: membaca sistem berkas (hanya baca).
 * Rujukan: TD-06.
 */
export function readSource(file: string): string {
  return readFileSync(file, 'utf8');
}
