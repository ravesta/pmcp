/**
 * Kebijakan password PMCP (Technology Baseline §8, disetujui pemilik, FR-01-02).
 *
 * Panjang 12 sampai 128 karakter, tanpa aturan huruf besar, angka, atau simbol; ditolak bila sama
 * dengan username, sama dengan password saat ini, atau termasuk password yang umum dipakai.
 */

/** Panjang minimum dan maksimum password. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/** Kode pelanggaran kebijakan password. */
export type PasswordViolation = 'TOO_SHORT' | 'TOO_LONG' | 'SAME_AS_USERNAME' | 'SAME_AS_CURRENT' | 'COMMON' | 'BLANK';

/**
 * Daftar password dan pola yang sangat umum, dinormalkan (huruf kecil, hanya huruf dan angka).
 * Sumber daftar: dikurasi tim dari kata sandi yang paling sering muncul pada kebocoran publik dan
 * pola papan ketik; sengaja ringkas dan dapat ditambah tanpa mengubah kode lain (Security Design SR-05).
 */
const COMMON_PASSWORDS: ReadonlyArray<string> = [
  'password', 'password1', 'password12', 'password123', 'password1234', 'password12345', 'passw0rd1234',
  'passwordpassword', 'katasandi', 'katasandi123', 'katasandi1234', 'katasandi12345', 'katasandipassword',
  'qwertyuiop', 'qwertyuiop12', 'qwertyuiop123', 'qwertyuiopasdf', 'qwertyuiopasdfghjkl', 'asdfghjkl123', 'asdfghjklqwerty',
  'zxcvbnmasdfg', 'zxcvbnm12345', 'letmein12345', 'welcome12345', 'welcome123456', 'admin123456', 'administrator1',
  'iloveyou1234', 'monkey123456', 'dragon123456', 'sunshine1234', 'football1234', 'abc123456789', 'abcdefghijkl',
  '123456789012', '1234567890123', '12345678901234', '111111111111', '000000000000', '123123123123',
  'indonesia123', 'indonesia1234', 'jakarta12345', 'bandung12345', 'pmcp12345678', 'pmcppassword',
];

/**
 * Menormalkan teks untuk pencocokan daftar umum: huruf kecil dan hanya huruf dan angka.
 * Masukan: teks. Keluaran: teks ternormalisasi.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-02 butir 2.
 */
function normalizeForCommonCheck(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Memeriksa apakah password tergolong umum: ada di daftar, satu karakter berulang, atau barisan
 * naik berurutan (mis. 123456789012, abcdefghijkl).
 * Masukan: password. Keluaran: true bila tergolong umum.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-02 butir 2, EC-01-02.04.
 */
export function isCommonPassword(password: string): boolean {
  const normalized = normalizeForCommonCheck(password);
  if (normalized.length === 0) return false;
  if (COMMON_PASSWORDS.includes(normalized)) return true;
  if (/^(.)\1+$/.test(normalized)) return true;
  const sequence = '0123456789012345678901234567890123456789abcdefghijklmnopqrstuvwxyz';
  return normalized.length >= 8 && sequence.includes(normalized);
}

/** Konteks pemeriksaan password baru. */
export interface PasswordContext {
  /** Username akun (sudah dinormalkan). */
  readonly username: string;
  /** Password saat ini bila sedang mengganti password; undefined bila password sementara baru dibuat. */
  readonly currentPassword?: string;
}

/**
 * Memeriksa password baru terhadap kebijakan dan mengembalikan seluruh pelanggaran.
 * Masukan: password baru dan konteks (username, password saat ini). Keluaran: daftar kode pelanggaran
 * (kosong bila lolos). Panjang dihitung dalam karakter (bukan byte).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-02 butir 2, EC-01-02.02, EC-01-02.04.
 */
export function validatePassword(password: string, context: PasswordContext): PasswordViolation[] {
  const violations: PasswordViolation[] = [];
  const length = [...password].length;
  if (password.trim().length === 0 && length > 0) violations.push('BLANK');
  if (length < PASSWORD_MIN_LENGTH) violations.push('TOO_SHORT');
  if (length > PASSWORD_MAX_LENGTH) violations.push('TOO_LONG');
  if (password.toLowerCase() === context.username) violations.push('SAME_AS_USERNAME');
  if (context.currentPassword !== undefined && password === context.currentPassword) violations.push('SAME_AS_CURRENT');
  if (isCommonPassword(password)) violations.push('COMMON');
  return violations;
}
