/**
 * Penundaan login setelah percobaan gagal berulang (FR-01-01 butir 3, CL-056, Security Design §4.3).
 *
 * Penghitung berlaku per username DAN per sumber alamat jaringan. Penundaan bersifat sementara
 * (bukan penguncian permanen). Semua fungsi murni; waktu diberikan pemanggil.
 */

/** Ambang dan durasi penundaan. */
export const THROTTLE_RULES = {
  /** Kegagalan berturut-turut per username sebelum ditunda. */
  userMaxFailures: 5,
  /** Kegagalan per sumber alamat dalam jendela waktu sebelum ditunda (usulan awal, dapat diatur). */
  ipMaxFailures: 20,
  /** Lama penundaan dalam menit. */
  lockMinutes: 15,
  /** Jendela hitung kegagalan per sumber alamat dalam menit. */
  ipWindowMinutes: 15,
} as const;

/** Keadaan penghitung untuk satu kunci (username atau sumber alamat). */
export interface ThrottleState {
  readonly failures: number;
  readonly lockedUntil: Date | null;
  readonly updatedAt: Date;
}

/**
 * Keadaan awal penghitung: belum ada kegagalan dan tidak ditunda.
 * Masukan: waktu sekarang. Keluaran: keadaan kosong.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 3.
 */
export function emptyThrottle(now: Date): ThrottleState {
  return { failures: 0, lockedUntil: null, updatedAt: now };
}

/**
 * Memeriksa apakah kunci sedang ditunda pada waktu tertentu.
 * Masukan: keadaan (atau null bila belum ada) dan waktu sekarang. Keluaran: waktu boleh mencoba lagi,
 * atau null bila tidak sedang ditunda.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 3, EC-01-01.03.
 */
export function lockedUntil(state: ThrottleState | null, now: Date): Date | null {
  if (!state?.lockedUntil) return null;
  return state.lockedUntil.getTime() > now.getTime() ? state.lockedUntil : null;
}

/**
 * Menghitung keadaan baru setelah satu kegagalan.
 * Masukan: keadaan sebelumnya (atau null), waktu, ambang kegagalan, lama penundaan, dan jendela (menit,
 * opsional: kegagalan lebih tua dari jendela tidak dihitung). Keluaran: keadaan baru; bila ambang tercapai,
 * `lockedUntil` diisi. Penundaan yang sudah lewat memulai siklus baru dari nol.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 3, AC "percobaan ke-6 setelah 5 gagal ditolak".
 */
export function afterFailure(
  previous: ThrottleState | null,
  now: Date,
  maxFailures: number,
  lockMinutes: number,
  windowMinutes?: number,
): ThrottleState {
  let failures = previous?.failures ?? 0;
  const lockExpired = previous?.lockedUntil !== null && previous?.lockedUntil !== undefined && previous.lockedUntil.getTime() <= now.getTime();
  const windowExpired =
    windowMinutes !== undefined && previous !== null && now.getTime() - previous.updatedAt.getTime() > windowMinutes * 60_000;
  if (lockExpired || windowExpired) failures = 0;
  failures += 1;
  const lock = failures >= maxFailures ? new Date(now.getTime() + lockMinutes * 60_000) : null;
  return { failures, lockedUntil: lock, updatedAt: now };
}
