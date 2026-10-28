/**
 * Aturan umum master pilihan (FR-08-02 sampai FR-08-05, FR-19-01) dan aturan PIC (FR-08-01).
 * Fungsi murni; tidak mengakses database.
 */

/** Jenis master pilihan yang dikelola Manager. */
export type MasterKind = 'application' | 'revision_category' | 'activity_category' | 'reschedule_reason' | 'stage_step';

/** Aturan per jenis master. */
interface MasterKindRule {
  /** Nama untuk pesan audit dan antarmuka. */
  readonly label: string;
  /** Panjang maksimum nama (FR-08-02 butir a). */
  readonly maxLength: number;
  /** True bila minimal satu item harus tetap aktif (FR-08-02 butir e). */
  readonly requiresOneActive: boolean;
}

/** Tabel aturan master. Aplikasi tidak mewajibkan minimum aktif (FR-08-02). */
export const MASTER_RULES: Readonly<Record<MasterKind, MasterKindRule>> = {
  application: { label: 'Master Aplikasi Terdampak', maxLength: 50, requiresOneActive: false },
  revision_category: { label: 'Master Kategori Alasan Revisi', maxLength: 50, requiresOneActive: true },
  activity_category: { label: 'Master Kategori Activity', maxLength: 60, requiresOneActive: true },
  reschedule_reason: { label: 'Master Alasan Jadwal Ulang', maxLength: 60, requiresOneActive: true },
  stage_step: { label: 'Master Step Tahapan', maxLength: 60, requiresOneActive: true },
};

/** Hasil validasi nama: nama bersih atau kode galat. */
export type NameCheck = { readonly ok: true; readonly name: string } | { readonly ok: false; readonly reason: 'EMPTY' | 'TOO_LONG' };

/**
 * Membersihkan dan memvalidasi nama item master.
 * Masukan: jenis master dan teks mentah. Keluaran: nama bersih (spasi tepi dibuang), atau alasan penolakan:
 * kosong/spasi saja, atau melebihi batas panjang (tidak dipotong diam-diam).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-08-02 butir a, EC-08-02.01, EC-08-02.03.
 */
export function checkMasterName(kind: MasterKind, raw: string): NameCheck {
  const name = raw.trim();
  if (name.length === 0) return { ok: false, reason: 'EMPTY' };
  if ([...name].length > MASTER_RULES[kind].maxLength) return { ok: false, reason: 'TOO_LONG' };
  return { ok: true, name };
}

/**
 * Memeriksa apakah ambang peringatan sah (bilangan bulat 1 sampai 20).
 * Masukan: nilai. Keluaran: true bila sah.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-08-03 butir 4, FR-08-05 butir 3, EC-08-03.01.
 */
export function isValidThreshold(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 20;
}

/** Batas panjang nama PIC (FR-08-01 butir 2). */
export const PIC_NAME_MAX = 100;

/** Hasil validasi isian PIC baru: nilai bersih atau galat per isian. */
export type PicInputCheck =
  | { readonly ok: true; readonly name: string; readonly stage: 'BA' | 'DEV' | 'QA'; readonly withLogin: boolean }
  | { readonly ok: false; readonly fields: Readonly<Record<string, string>> };

/**
 * Memvalidasi isian formulir Tambah PIC (kecuali keunikan username yang butuh database).
 * Masukan: nama, tahapan, apakah memakai akun login. Keluaran: nilai bersih atau galat per isian
 * (`name`, `stage`, `login`). PIC Development tidak boleh memiliki akun login (BR-06).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-08-01 butir 2 dan 3, EC-08-01.02.
 */
export function checkPicInput(input: { name: string; stage: string; withLogin: boolean }): PicInputCheck {
  const fields: Record<string, string> = {};
  const name = input.name.trim();
  if (name.length === 0) fields.name = 'EMPTY';
  else if ([...name].length > PIC_NAME_MAX) fields.name = 'TOO_LONG';
  const stage = input.stage;
  if (stage !== 'BA' && stage !== 'DEV' && stage !== 'QA') fields.stage = 'REQUIRED';
  else if (stage === 'DEV' && input.withLogin) fields.login = 'DEV_NO_LOGIN';
  if (Object.keys(fields).length > 0) return { ok: false, fields };
  return { ok: true, name, stage: stage as 'BA' | 'DEV' | 'QA', withLogin: input.withLogin };
}
