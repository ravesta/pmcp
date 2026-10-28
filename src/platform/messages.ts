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
  PROJECT_NOT_FOUND: 'Project tidak ditemukan.',
  PROJECT_NAME_REQUIRED: 'Nama project wajib diisi.',
  PROJECT_TYPE_INVALID: 'Pilih jenis project yang tersedia.',
  DATE_INVALID: 'Tanggal tidak valid. Gunakan format dd/mm/yyyy.',
  PROJECT_APPLICATION_INACTIVE: 'Aplikasi yang dipilih sudah tidak aktif. Pilih ulang.',
  PROJECT_NO_CHANGES: 'Tidak ada perubahan untuk disimpan.',
  PROJECT_STATUS_INVALID: 'Pilih status project yang tersedia.',
  PROJECT_STATUS_COMPLETED_ON_CREATE: 'Status Selesai hanya dapat dipilih bila semua tahapan sudah Selesai.',
  ESTIMATE_PAIR_REQUIRED: 'Isi tanggal mulai dan tanggal selesai bersamaan, atau kosongkan keduanya.',
  ESTIMATE_ORDER: 'Tanggal selesai tidak boleh sebelum tanggal mulai.',
  STAGE_PIC_MISMATCH: 'PIC yang dipilih tidak sesuai dengan tahapan.',
  STAGE_PIC_INACTIVE: 'PIC yang dipilih sudah tidak aktif.',
  STAGE_NOT_FOUND: 'Tahapan tidak ditemukan.',
  STAGE_FILL_ONLY: 'Estimasi yang sudah terisi hanya dapat diubah lewat revisi estimasi.',
  STAGE_NO_CHANGES: 'Tidak ada perubahan untuk disimpan.',
  STAGE_HOLD_REASON_REQUIRED: 'Isi alasan ditahan.',
  STAGE_NOTE_REQUIRED: 'Isi catatan (minimal 3 karakter).',
  STAGE_NOT_STARTED_HAS_MANUAL_PROGRESS: 'Status Belum Mulai tidak dapat dipilih selama progres manual masih di atas 0%.',
  STAGE_REOPEN_MANAGER_ONLY: 'Tahapan yang sudah Selesai hanya dapat dibuka kembali oleh Manager.',
  STAGE_REOPEN_TARGET_INVALID: 'Tahapan yang sudah Selesai hanya dapat dibuka kembali menjadi Berjalan.',
  STAGE_PROJECT_COMPLETED: 'Project berstatus Selesai. Ubah status project terlebih dahulu.',
  STAGE_STATUS_UNCHANGED: 'Status tahapan tidak berubah.',
  MANUAL_PROGRESS_RANGE: 'Isi bilangan bulat 0 sampai 99. Progres 100% hanya lewat status Selesai.',
  MANUAL_PROGRESS_NOTE_REQUIRED: 'Isi catatan penyesuaian (minimal 3 karakter).',
  MANUAL_PROGRESS_STAGE_DONE: 'Tahapan sudah Selesai; progres otomatis 100%.',
  REVISION_CATEGORY_REQUIRED: 'Pilih kategori alasan revisi.',
  REVISION_CATEGORY_INACTIVE: 'Kategori alasan revisi sudah tidak aktif. Pilih ulang.',
  REVISION_NOTE_REQUIRED: 'Isi catatan alasan (minimal 3 karakter).',
  REVISION_SAME_AS_CURRENT: 'Estimasi baru sama dengan estimasi saat ini.',
  REVISION_DATES_REQUIRED: 'Isi tanggal mulai dan tanggal selesai estimasi baru.',
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

/**
 * Pesan penolakan Selesai karena masih ada kartu terbuka milik PIC tertentu.
 * Masukan: nama pemilik kartu terbuka. Keluaran: pesan Indonesia yang menyebut pemilik.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-01 butir 4, EC-05-01.02.
 */
export function openCardsMessage(owners: ReadonlyArray<string>): string {
  return `Tahapan belum dapat diselesaikan. Masih ada kartu terbuka milik ${owners.join(', ')}.`;
}

/**
 * Pesan penolakan alasan status Ditunda atau Batal yang kosong.
 * Masukan: nama status tujuan. Keluaran: pesan Indonesia.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: EC-02-01.03, EC-14-01.01.
 */
export function statusReasonRequiredMessage(statusLabel: string): string {
  return `Isi alasan untuk status ${statusLabel}.`;
}

/**
 * Pesan penolakan status project Selesai karena masih ada tahapan belum Selesai.
 * Masukan: nama tahapan yang belum Selesai. Keluaran: pesan Indonesia yang menyebut tahapan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: EC-11-02.02, BL-21.
 */
export function stagesNotDoneMessage(stageLabels: ReadonlyArray<string>): string {
  return `Status Selesai hanya dapat dipilih bila semua tahapan Selesai. Belum selesai: ${stageLabels.join(', ')}.`;
}
