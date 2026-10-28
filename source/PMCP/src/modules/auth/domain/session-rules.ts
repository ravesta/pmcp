/**
 * Aturan masa berlaku sesi (FR-01-01 butir 5, Security Design §5).
 *
 * Sesi berakhir bila tidak aktif lebih dari batas idle (bawaan 2 jam) atau melewati batas maksimum
 * sejak login (bawaan 12 jam), atau telah dicabut (keluar, ganti password, reset, nonaktif).
 */

/** Data sesi yang relevan untuk penilaian masa berlaku. */
export interface SessionTimes {
  readonly lastSeenAt: Date;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

/** Hasil penilaian sesi. */
export type SessionStatus = 'valid' | 'revoked' | 'expired' | 'idle';

/**
 * Menilai apakah sesi masih berlaku pada waktu tertentu.
 * Masukan: waktu sesi, waktu sekarang, batas idle dalam menit. Keluaran: status sesi.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 5, AC "sesi 12 jam ditolak walau aktif".
 */
export function sessionStatus(session: SessionTimes, now: Date, idleMinutes: number): SessionStatus {
  if (session.revokedAt !== null) return 'revoked';
  if (now.getTime() >= session.expiresAt.getTime()) return 'expired';
  if (now.getTime() - session.lastSeenAt.getTime() >= idleMinutes * 60_000) return 'idle';
  return 'valid';
}

/** Selisih minimum antar pembaruan `lastSeenAt` agar tidak menulis database pada setiap permintaan. */
export const LAST_SEEN_REFRESH_MS = 60_000;

/**
 * Menentukan apakah `lastSeenAt` perlu diperbarui.
 * Masukan: waktu terakhir terlihat dan waktu sekarang. Keluaran: true bila sudah lewat satu menit.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §5, database-design §3 (pembaruan terbatas).
 */
export function shouldRefreshLastSeen(lastSeenAt: Date, now: Date): boolean {
  return now.getTime() - lastSeenAt.getTime() >= LAST_SEEN_REFRESH_MS;
}
