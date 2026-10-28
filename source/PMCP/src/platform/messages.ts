/**
 * Katalog pesan antarmuka PMCP (bahasa Indonesia, CL-010).
 *
 * Satu tempat untuk teks yang dilihat pengguna agar konsisten dan mudah dicocokkan dengan FSD dan
 * uji (handoff UX/UI UX-04). Teks mengikuti FSD; jangan menulis pesan galat langsung di use case.
 */

/** Pesan statis yang dikunci katalog. */
export const MESSAGES = {
  LOGIN_FAILED: 'Username atau password salah.',
  LOGIN_REQUIRED_FIELDS: 'Username dan password wajib diisi.',
  SESSION_REQUIRED: 'Silakan masuk terlebih dahulu.',
  FORBIDDEN: 'Anda tidak memiliki akses ke halaman ini.',
  NOT_FOUND: 'Data tidak ditemukan.',
  CONFLICT: 'Data telah berubah. Muat ulang halaman lalu coba lagi.',
  UNEXPECTED: 'Terjadi kesalahan, coba lagi.',
  NAME_REQUIRED: 'Nama wajib diisi.',
  NAME_EXISTS: 'Nama itu sudah ada.',
  AT_LEAST_ONE_ACTIVE: 'Minimal satu pilihan harus aktif.',
  THRESHOLD_RANGE: 'Isi bilangan bulat 1 sampai 20.',
  PASSWORD_CURRENT_REQUIRED: 'Isi password saat ini.',
  PASSWORD_CONFIRM_MISMATCH: 'Konfirmasi harus sama dengan password baru.',
  PASSWORD_CURRENT_WRONG: 'Password saat ini salah.',
  PASSWORD_CHANGED: 'Password berhasil diganti.',
  PIC_NAME_REQUIRED: 'Nama wajib diisi.',
  PIC_STAGE_REQUIRED: 'Pilih tahapan.',
  PIC_DEV_NO_LOGIN: 'PIC Development dicatat sebagai nama saja dan tidak dapat memiliki akun login.',
  USERNAME_INVALID: 'Username 4 sampai 30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.',
  USERNAME_EXISTS: 'Username sudah dipakai.',
  PIC_NO_LOGIN_ACCOUNT: 'PIC ini tidak memiliki akun login.',
  PIC_HAS_ASSIGNMENTS: 'PIC masih menjadi PIC pada tahapan yang belum selesai. Penugasan tidak dilepas otomatis.',
  MASTER_LOCKED: 'Kategori bawaan sistem tidak dapat diubah nama atau dinonaktifkan.',
} as const;

/**
 * Pesan penundaan login yang menyebut kapan boleh mencoba lagi.
 * Masukan: teks jam HH:mm dan sisa menit. Keluaran: pesan Indonesia.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 3, EC-01-01.03, handoff UX/UI §5.1.
 */
export function throttledMessage(clockTime: string, minutes: number): string {
  return `Terlalu banyak percobaan gagal. Coba lagi pukul ${clockTime} (sekitar ${minutes} menit lagi).`;
}

/**
 * Pesan pelanggaran kebijakan password menurut kode.
 * Masukan: kode pelanggaran. Keluaran: pesan Indonesia.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-02 butir 2, EC-01-02.02, EC-01-02.04.
 */
export function passwordViolationMessage(code: string): string {
  switch (code) {
    case 'TOO_SHORT':
      return 'Password baru minimal 12 karakter.';
    case 'TOO_LONG':
      return 'Password baru maksimal 128 karakter.';
    case 'SAME_AS_USERNAME':
      return 'Password baru tidak boleh sama dengan username.';
    case 'SAME_AS_CURRENT':
      return 'Password baru tidak boleh sama dengan password saat ini.';
    case 'COMMON':
      return 'Password baru termasuk password yang umum dipakai. Pilih yang lain.';
    case 'BLANK':
      return 'Password baru tidak boleh berisi spasi saja.';
    default:
      return 'Password baru belum memenuhi aturan.';
  }
}

/**
 * Pesan panjang melebihi batas untuk sebuah isian.
 * Masukan: nama isian dan batas karakter. Keluaran: pesan Indonesia.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: EC-08-02.03, EC-02-01.08.
 */
export function maxLengthMessage(field: string, max: number): string {
  return `${field} maksimal ${max} karakter.`;
}
