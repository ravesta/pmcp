/**
 * Bentuk state yang dikembalikan Server Action ke formulir (tipe saja; tanpa nilai agar aman diimpor
 * dari berkas 'use server').
 */

/** Hasil sebuah aksi formulir yang ditampilkan di UI. */
export interface ActionState {
  /** True bila aksi berhasil. */
  readonly ok: boolean;
  /** Pesan untuk pengguna (sukses atau galat). */
  readonly message?: string;
  /** Galat per isian: nama isian ke pesan. */
  readonly fields?: Readonly<Record<string, string>>;
  /** Data tambahan yang aman ditampilkan, mis. password sementara (tampil sekali) atau daftar project terdampak. */
  readonly data?: unknown;
  /** Penanda unik tiap hasil agar UI dapat membedakan hasil baru dari hasil lama. */
  readonly stamp: number;
}

/** State awal sebelum formulir dikirim. */
export const initialActionState: ActionState = { ok: false, stamp: 0 };

let stampCounter = 0;

/**
 * Menghasilkan penanda unik berurutan untuk sebuah hasil aksi (bukan waktu; tidak memakai jam sistem).
 * Masukan: tidak ada. Keluaran: bilangan bulat yang selalu naik selama proses berjalan.
 * Efek samping: menaikkan penghitung di dalam proses.
 * Rujukan: Technical Design TD-05 (waktu hanya dari Clock).
 */
export function nextStamp(): number {
  stampCounter += 1;
  return stampCounter;
}
