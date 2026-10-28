/**
 * Pintu masuk modul auth yang AMAN untuk komponen klien (browser): hanya fungsi murni dan konstanta,
 * tanpa Prisma, argon2, atau akses server. Komponen klien tidak boleh mengimpor `@/modules/auth` (index)
 * karena menyeret kode server ke bundel browser (Technical Design §13 butir 5).
 */
export { isCommonPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validatePassword } from './domain/password-policy';
export type { PasswordViolation } from './domain/password-policy';
export { isValidUsername, normalizeUsername } from './domain/username';
