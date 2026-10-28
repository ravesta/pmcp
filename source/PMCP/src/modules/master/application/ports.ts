/**
 * Port modul master: akses data master pilihan dan PIC beserta akunnya.
 */
import type { AuditWriter } from '@/shared/audit';
import type { Clock } from '@/shared/clock';
import type { Transactor, TxContext } from '@/shared/transaction';
import type { AuthRepository, PasswordHasher, RandomIndex } from '@/modules/auth';
import type { MasterKind } from '../domain/master-rules';

/** Satu item master untuk tampilan dan aturan. */
export interface MasterItem {
  readonly id: number;
  readonly name: string;
  readonly isActive: boolean;
  /** Jumlah pemakaian pada data transaksi (kolom "Dipakai"), hanya baca. */
  readonly usedCount: number;
  /** Penanda kategori bawaan sistem yang terkunci; null untuk item biasa. */
  readonly systemKey: string | null;
  /** Hanya untuk step: tahapan (BA/QA) dan urutan. */
  readonly stage: 'BA' | 'QA' | null;
  readonly sortOrder: number | null;
}

/** Akses data master pilihan. Metode yang menerima `tx` berjalan dalam transaksi pemanggil. */
export interface MasterRepository {
  list(kind: MasterKind, stage?: 'BA' | 'QA'): Promise<MasterItem[]>;
  /** Mengunci baris dan membaca item (SELECT ... FOR UPDATE) agar perubahan serentak berurutan. */
  findForUpdate(tx: TxContext, kind: MasterKind, id: number): Promise<MasterItem | null>;
  nameExists(tx: TxContext, kind: MasterKind, name: string, stage: 'BA' | 'QA' | null, exceptId?: number): Promise<boolean>;
  /** Mengunci dan menghitung item aktif pada master yang sama (per tahapan untuk step). */
  countActiveForUpdate(tx: TxContext, kind: MasterKind, stage: 'BA' | 'QA' | null): Promise<number>;
  add(tx: TxContext, kind: MasterKind, name: string, stage: 'BA' | 'QA' | null): Promise<number>;
  rename(tx: TxContext, kind: MasterKind, id: number, name: string): Promise<void>;
  setActive(tx: TxContext, kind: MasterKind, id: number, active: boolean): Promise<void>;
  /** Menukar urutan dengan item tetangga (hanya step). Mengembalikan false bila sudah di ujung. */
  swapOrder(tx: TxContext, id: number, direction: 'up' | 'down'): Promise<boolean>;
  getThreshold(key: ThresholdKey): Promise<number>;
  setThreshold(tx: TxContext, key: ThresholdKey, value: number): Promise<void>;
}

/** Kunci pengaturan ambang peringatan. */
export type ThresholdKey = 'revision_warn_threshold' | 'reschedule_warn_threshold';

/** Baris PIC untuk daftar Master PIC. */
export interface PicRow {
  readonly id: number;
  readonly name: string;
  readonly stage: 'BA' | 'DEV' | 'QA';
  readonly isActive: boolean;
  /** Username bila PIC memiliki akun login; null bila hanya dicatat. */
  readonly username: string | null;
  readonly accountActive: boolean;
}

/** Penugasan PIC pada tahapan yang belum selesai (untuk konfirmasi nonaktifkan). */
export interface OpenAssignment {
  readonly projectCode: string;
  readonly projectName: string;
  readonly stage: 'BA' | 'DEV' | 'QA';
}

/** Akses data PIC dan akunnya. */
export interface PicRepository {
  list(): Promise<PicRow[]>;
  findForUpdate(tx: TxContext, picId: number): Promise<PicRow | null>;
  usernameExists(tx: TxContext, username: string): Promise<boolean>;
  create(tx: TxContext, input: { name: string; stage: 'BA' | 'DEV' | 'QA' }): Promise<number>;
  createAccount(tx: TxContext, input: { picId: number; username: string; passwordHash: string; now: Date }): Promise<number>;
  rename(tx: TxContext, picId: number, name: string): Promise<void>;
  /** Mengubah status PIC dan akunnya (bila ada). Mengembalikan id akun bila ada. */
  setActive(tx: TxContext, picId: number, active: boolean): Promise<number | null>;
  /** Id akun PIC bila ada. */
  findAccountId(tx: TxContext, picId: number): Promise<number | null>;
  listOpenAssignments(picId: number): Promise<OpenAssignment[]>;
}

/** Ketergantungan yang disuntikkan ke use case master. */
export interface MasterDeps {
  readonly clock: Clock;
  readonly transactor: Transactor;
  readonly masters: MasterRepository;
  readonly pics: PicRepository;
  /** Hanya operasi auth yang dibutuhkan master (menghindari ketergantungan penuh). */
  readonly auth: Pick<AuthRepository, 'revokeUserSessions' | 'clearThrottle' | 'updatePassword' | 'findUserById'>;
  readonly hasher: PasswordHasher;
  readonly randomIndex: RandomIndex;
  readonly writeAudit: AuditWriter;
}
