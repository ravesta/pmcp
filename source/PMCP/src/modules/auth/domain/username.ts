/**
 * Aturan username PMCP (FR-08-01 butir 2).
 */

/** Pola username yang sah: 4 sampai 30 karakter huruf kecil, angka, titik, garis bawah, atau strip. */
const USERNAME_PATTERN = /^[a-z0-9._-]{4,30}$/;

/**
 * Menormalkan username: spasi di tepi dibuang dan huruf besar diubah menjadi huruf kecil.
 * Masukan: teks yang diketik. Keluaran: username ternormalisasi.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 1 (username tidak membedakan huruf besar kecil), FR-08-01 butir 2.
 */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Memeriksa apakah username (yang sudah dinormalkan) memenuhi format.
 * Masukan: username ternormalisasi. Keluaran: true bila sah.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-08-01 butir 2.
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}
