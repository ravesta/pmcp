/**
 * Use case sesi: validasi sesi pada setiap permintaan (requireSession) dan keluar (logout).
 */
import { fail, ok, type Result } from '@/shared/result';
import { MESSAGES } from '@/platform/messages';
import type { Actor } from '../domain/actor';
import { sessionStatus, shouldRefreshLastSeen } from '../domain/session-rules';
import type { AuthDeps, UserRecord } from './ports';

/** Hasil requireSession: pelaku dan hash token sesinya (dipakai untuk mengecualikan sesi saat ini). */
export interface AuthenticatedSession {
  readonly actor: Actor;
  readonly tokenHash: Uint8Array;
}

/**
 * Mengubah data akun menjadi `Actor` yang dipakai kebijakan hak akses.
 * Masukan: akun. Keluaran: pelaku.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-04 butir 2 (peran dari akun di server).
 */
export function toActor(user: UserRecord): Actor {
  return {
    userId: user.id,
    role: user.role,
    picId: user.picId,
    picStage: user.picStage,
    label: user.displayName,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * Memvalidasi token sesi dan mengembalikan pelaku. Dipanggil di server pada SETIAP permintaan data
 * (bukan hanya di middleware, TD-10).
 * Masukan: dependensi dan token dari cookie (bisa undefined). Keluaran: sesi terautentikasi, atau null
 * bila tidak ada sesi, sesi dicabut atau kedaluwarsa (idle 2 jam atau maksimum 12 jam), atau akun nonaktif.
 * Efek samping: memperbarui `last_seen_at` paling sering sekali per menit.
 * Rujukan: FR-01-01 butir 5, FR-01-04 butir 3, EC-01-01.04, EC-01-04.02, Security Design §5.
 */
export async function requireSession(deps: AuthDeps, token: string | undefined): Promise<AuthenticatedSession | null> {
  if (!token) return null;
  const tokenHash = deps.tokens.hash(token);
  const session = await deps.repository.findSession(tokenHash);
  if (!session) return null;
  const now = deps.clock.now();
  if (sessionStatus(session, now, deps.sessionIdleMinutes) !== 'valid') return null;
  const user = await deps.repository.findUserById(session.userId);
  if (!user || !user.isActive) return null;
  if (shouldRefreshLastSeen(session.lastSeenAt, now)) await deps.repository.touchSession(tokenHash, now);
  return { actor: toActor(user), tokenHash };
}

/**
 * Mengakhiri sesi yang sedang dipakai (Keluar).
 * Masukan: dependensi dan token dari cookie. Keluaran: hasil berhasil (idempoten; token tak dikenal pun berhasil).
 * Efek samping: mengisi `revoked_at` pada sesi.
 * Rujukan: FR-01-03.
 */
export async function logout(deps: AuthDeps, token: string | undefined): Promise<Result<null>> {
  if (token) await deps.repository.revokeSession(deps.tokens.hash(token), deps.clock.now());
  return ok(null);
}

/**
 * Memeriksa sesi dan menolak bila tidak ada.
 * Masukan: dependensi dan token. Keluaran: sesi terautentikasi, atau hasil gagal AUTHENTICATION.
 * Efek samping: sama dengan `requireSession`.
 * Rujukan: FR-01-04 butir 3, EC-01-01.05.
 */
export async function requireSessionResult(deps: AuthDeps, token: string | undefined): Promise<Result<AuthenticatedSession>> {
  const session = await requireSession(deps, token);
  if (!session) return fail({ code: 'AUTHENTICATION', message: MESSAGES.SESSION_REQUIRED });
  return ok(session);
}
