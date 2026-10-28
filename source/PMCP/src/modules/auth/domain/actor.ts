/**
 * Pelaku (pengguna yang sedang login) dan kebijakan hak akses PMCP.
 *
 * Peran dan kepemilikan SELALU berasal dari sesi di server, tidak pernah dari input klien
 * (Security Design §2). Kebijakan berupa fungsi murni sehingga mudah diuji per peran.
 */

/** Peran akun: Manager (Head of BA dan Head QA) atau PIC (BA/QA) dengan akun login. */
export type Role = 'MANAGER' | 'PIC';

/** Tahapan PIC. Development tidak memiliki akun login (BR-06). */
export type StageKind = 'BA' | 'DEV' | 'QA';

/** Pengguna yang sedang login, dibentuk dari sesi yang valid di server. */
export interface Actor {
  readonly userId: number;
  readonly role: Role;
  /** Id PIC bagi akun PIC; null untuk Manager. */
  readonly picId: number | null;
  /** Tahapan tetap PIC; null untuk Manager. */
  readonly picStage: StageKind | null;
  /** Nama yang dicatat pada jejak audit. */
  readonly label: string;
  /** True bila wajib mengganti password sebelum memakai menu lain (FR-01-05). */
  readonly mustChangePassword: boolean;
}

/** Aksi yang dikendalikan kebijakan pada irisan 1; ditambah pada irisan berikutnya. */
export type Action =
  | 'master.manage'
  | 'account.manage'
  | 'audit.view'
  | 'password.changeOwn';

/**
 * Menentukan apakah pelaku boleh melakukan sebuah aksi.
 * Masukan: pelaku dan aksi. Keluaran: true bila diizinkan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-04, matriks hak akses FSD §3.4.1, Security Design §6.
 */
export function can(actor: Actor, action: Action): boolean {
  switch (action) {
    case 'master.manage':
    case 'account.manage':
    case 'audit.view':
      return actor.role === 'MANAGER';
    case 'password.changeOwn':
      return true;
    default:
      return false;
  }
}
