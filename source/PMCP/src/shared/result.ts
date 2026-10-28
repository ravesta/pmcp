/**
 * Hasil dan galat use case PMCP.
 *
 * Setiap aksi (use case) mengembalikan `Result` agar UI menampilkan pesan yang aman dan konsisten,
 * tanpa membocorkan stack atau SQL (Technical Design §8 dan §12).
 */

/** Kode galat yang stabil; pesan Indonesia diambil dari katalog pesan (bukan ditulis di sini). */
export type ErrorCode =
  | 'VALIDATION'
  | 'AUTHENTICATION'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'THROTTLED'
  | 'BUSINESS_RULE'
  | 'INFRASTRUCTURE';

/** Rincian galat yang aman ditampilkan kepada pengguna. */
export interface ErrorInfo {
  /** Kelas galat. */
  readonly code: ErrorCode;
  /** Kode aturan bisnis yang lebih spesifik (mis. `STAGE_HAS_OPEN_CARDS`), bila ada. */
  readonly rule?: string;
  /** Pesan Indonesia untuk pengguna. */
  readonly message: string;
  /** Galat per isian formulir: nama field ke pesan. */
  readonly fields?: Readonly<Record<string, string>>;
  /** Rincian tambahan yang aman ditampilkan (mis. daftar project terdampak), bila ada. */
  readonly details?: unknown;
}

/** Hasil use case: berhasil membawa data, gagal membawa rincian galat. */
export type Result<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ErrorInfo };

/**
 * Membungkus data sebagai hasil berhasil.
 * Masukan: data. Keluaran: `Result` berhasil.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Technical Design §8.
 */
export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/**
 * Membungkus rincian galat sebagai hasil gagal.
 * Masukan: rincian galat. Keluaran: `Result` gagal.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Technical Design §8 dan §12.
 */
export function fail<T = never>(error: ErrorInfo): Result<T> {
  return { ok: false, error };
}

/**
 * Galat aplikasi yang dilempar dari lapisan dalam dan diubah menjadi `Result` gagal oleh use case.
 * Efek samping: tidak ada.
 * Rujukan: Technical Design §12.
 */
export class AppError extends Error {
  /** Rincian galat yang aman ditampilkan. */
  public readonly info: ErrorInfo;

  /**
   * Membuat galat aplikasi dari rincian galat.
   * Masukan: rincian galat. Keluaran: instansi `AppError`.
   * Efek samping: tidak ada.
   * Rujukan: Technical Design §12.
   */
  public constructor(info: ErrorInfo) {
    super(info.message);
    this.name = 'AppError';
    this.info = info;
  }
}
