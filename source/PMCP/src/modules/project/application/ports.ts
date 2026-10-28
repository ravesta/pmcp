/**
 * Port modul project: bentuk data (snapshot), akses data project dan tahapan, rujukan master, dan sumber kartu.
 *
 * `CardSourcePort` adalah titik inversi dependensi yang menghindari siklus project <-> kanban
 * (Technical Design §5.2): project hanya mengenal port ini, adapter-nya dirakit di `platform/container`.
 */
import type { AuditWriter } from '@/shared/audit';
import type { Clock } from '@/shared/clock';
import type { IsoDate } from '@/shared/iso-date';
import type { Transactor, TxContext } from '@/shared/transaction';
import type { ProjectInfo, ProjectType } from '../domain/project-rules';
import type { ProgressCard } from '../domain/stage-progress';
import type { Estimate, ProjectStatus, StageKind, StageStatus } from '../domain/stage-types';

/** PIC yang ditugaskan pada sebuah tahapan. */
export interface Assignee {
  readonly picId: number;
  readonly name: string;
  /** Waktu PIC membuka detail project; null = penanda "Assignment baru" masih aktif (BL-45). */
  readonly seenAt: Date | null;
  readonly assignedAt: Date;
  /** Label pelaku yang menugaskan, untuk daftar Assignment baru. */
  readonly assignedByLabel: string;
}

/** Keadaan satu tahapan seperti tersimpan. */
export interface StageSnapshot {
  readonly id: number;
  readonly projectId: number;
  readonly kind: StageKind;
  readonly status: StageStatus;
  readonly estimate: Estimate | null;
  readonly baseline: Estimate | null;
  readonly actualStart: IsoDate | null;
  readonly actualEnd: IsoDate | null;
  readonly holdSince: IsoDate | null;
  readonly holdReason: string | null;
  /** Id akun pelaku yang memulai hold berjalan. */
  readonly holdBy: number | null;
  readonly manualProgress: number | null;
  readonly manualProgressNote: string | null;
  readonly manualProgressByLabel: string | null;
  /** Id akun dan waktu penyesuaian manual terakhir; dipertahankan saat tahapan disimpan karena hal lain. */
  readonly manualProgressBy: number | null;
  readonly manualProgressAt: Date | null;
  readonly version: number;
  readonly assignees: ReadonlyArray<Assignee>;
  readonly revisionCount: number;
  /** Periode hold yang sudah berakhir. */
  readonly holdHistory: ReadonlyArray<{ readonly since: IsoDate; readonly resumedOn: IsoDate; readonly reason: string }>;
}

/** Aplikasi terdampak pada sebuah project (nama disimpan agar tampil walau master dinonaktifkan). */
export interface ApplicationRef {
  readonly id: number;
  readonly name: string;
  readonly isActive: boolean;
}

/** Keadaan satu project beserta tiga tahapannya (urut BA, DEV, QA). */
export interface ProjectSnapshot {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly referenceNo: string | null;
  readonly projectType: ProjectType | null;
  readonly businessOwner: string | null;
  readonly department: string | null;
  readonly requestDate: IsoDate | null;
  readonly description: string | null;
  readonly status: ProjectStatus;
  readonly statusReason: string | null;
  readonly version: number;
  readonly createdAt: Date;
  readonly applications: ReadonlyArray<ApplicationRef>;
  readonly stages: ReadonlyArray<StageSnapshot>;
}

/** Satu baris riwayat revisi estimasi. */
export interface RevisionRow {
  readonly id: number;
  readonly seq: number;
  readonly previous: Estimate;
  readonly next: Estimate;
  readonly categoryName: string;
  readonly note: string;
  readonly createdBy: number;
  readonly createdByLabel: string;
  readonly createdAt: Date;
  /** Tanggal bisnis (zona Asia/Jakarta) revisi dibuat. */
  readonly createdOn: IsoDate;
  /** Kode kartu asal bila revisi otomatis dari rencana kartu; kosong untuk revisi manual. */
  readonly sourceCardCodes: ReadonlyArray<string>;
}

/** Nilai yang ditulis ke tahapan saat disimpan. */
export interface StageWrite {
  readonly status: StageStatus;
  readonly estimate: Estimate | null;
  readonly baseline: Estimate | null;
  readonly actualStart: IsoDate | null;
  readonly actualEnd: IsoDate | null;
  readonly holdSince: IsoDate | null;
  readonly holdReason: string | null;
  readonly holdBy: number | null;
  readonly manualProgress: number | null;
  readonly manualProgressNote: string | null;
  readonly manualProgressBy: number | null;
  readonly manualProgressAt: Date | null;
}

/** Atribut dan status project yang ditulis saat disimpan. */
export interface ProjectWrite {
  readonly info: ProjectInfo;
  readonly status: ProjectStatus;
  readonly statusReason: string | null;
}

/** Penyimpanan perubahan project: nilai tulis ditambah waktu perubahan dari `Clock` (TD-05). */
export interface ProjectSave extends ProjectWrite {
  readonly now: Date;
}

/** Penugasan PIC yang diminta pada satu tahapan. */
export interface AssigneeChange {
  readonly added: ReadonlyArray<number>;
  readonly removed: ReadonlyArray<number>;
}

/** Masukan penambahan revisi estimasi. */
export interface RevisionInsert {
  readonly previous: Estimate;
  readonly next: Estimate;
  readonly categoryName: string;
  readonly note: string;
  readonly createdBy: number;
  readonly sourceCardIds: ReadonlyArray<number>;
}

/** Akses data project dan tahapan. Metode ber-`tx` berjalan di dalam transaksi pemanggil. */
export interface ProjectRepository {
  /** Membuat project beserta tiga tahapan kosong dan aplikasi terdampak. Mengembalikan id, kode, dan id tahapan. */
  createProject(
    tx: TxContext,
    input: ProjectWrite & { readonly createdBy: number },
  ): Promise<{ id: number; code: string; stageIds: Readonly<Record<StageKind, number>> }>;
  /** Mengunci project dan tahapannya (SELECT ... FOR UPDATE) lalu membacanya; null bila tidak ada. */
  lockProject(tx: TxContext, projectId: number): Promise<ProjectSnapshot | null>;
  /** Mencari id project pemilik sebuah tahapan; null bila tahapan tidak ada. */
  findProjectIdOfStage(stageId: number): Promise<number | null>;
  /** Menyimpan atribut, aplikasi, dan status project; false bila `expectedVersion` tidak cocok (CONFLICT). */
  saveProject(tx: TxContext, projectId: number, expectedVersion: number, write: ProjectSave): Promise<boolean>;
  /** Menyimpan keadaan tahapan; false bila `expectedVersion` tidak cocok (CONFLICT). */
  saveStage(tx: TxContext, stageId: number, expectedVersion: number, write: StageWrite): Promise<boolean>;
  /**
   * Mengganti penugasan PIC tahapan. PIC baru diberi penanda "Assignment baru" kecuali PIC itu menugaskan dirinya
   * sendiri atau tahapan Development (BL-45). Mengembalikan PIC yang ditambah dan dilepas.
   */
  replaceAssignees(
    tx: TxContext,
    stage: { id: number; kind: StageKind },
    picIds: ReadonlyArray<number>,
    context: { assignedBy: number; selfPicId: number | null; now: Date },
  ): Promise<AssigneeChange>;
  /** Menambah satu periode hold yang sudah berakhir ke riwayat. */
  appendHoldHistory(
    tx: TxContext,
    stageId: number,
    row: { since: IsoDate; resumedOn: IsoDate; reason: string; heldBy: number; resumedBy: number },
  ): Promise<void>;
  /** Revisi terakhir tahapan (untuk keputusan penggabungan), atau null. */
  lastRevision(tx: TxContext, stageId: number): Promise<RevisionRow | null>;
  /** Menambah revisi bernomor berikutnya beserta kartu asal. Mengembalikan nomor revisi. */
  appendRevision(tx: TxContext, stageId: number, revision: RevisionInsert): Promise<number>;
  /** Membaca seluruh revisi tahapan, terlama di atas. */
  listRevisions(stageId: number): Promise<RevisionRow[]>;
}

/** PIC sebagai rujukan validasi penugasan. */
export interface PicRef {
  readonly id: number;
  readonly name: string;
  readonly stage: StageKind;
  readonly isActive: boolean;
}

/** Kategori alasan revisi sebagai rujukan. */
export interface RevisionCategoryRef {
  readonly id: number;
  readonly name: string;
  readonly isActive: boolean;
}

/** Rujukan data master (baca saja) yang dibutuhkan project. */
export interface ReferencePort {
  getPics(ids: ReadonlyArray<number>): Promise<PicRef[]>;
  getApplications(ids: ReadonlyArray<number>): Promise<ApplicationRef[]>;
  getRevisionCategory(id: number): Promise<RevisionCategoryRef | null>;
  /** Batas peringatan revisi berulang (master, awal 3). */
  getRevisionWarnThreshold(): Promise<number>;
}

/** Rujukan tahapan untuk mencari kartunya (kartu terhubung lewat project dan jenis tahapan). */
export interface StageRef {
  readonly stageId: number;
  readonly projectId: number;
  readonly kind: StageKind;
}

/** Rincian kartu aktif per PIC pada sebuah tahapan (FR-05-02 butir 2). */
export interface PicCardSummary {
  readonly picId: number;
  readonly name: string;
  readonly cardCount: number;
  /** Progres gabungan kartu PIC itu (berbobot hari kerja), 0..100. */
  readonly progress: number;
}

/** Fakta kartu sebuah tahapan. */
export interface StageCardFacts {
  /** Kartu aktif (tidak dibatalkan) untuk hitungan progres. */
  readonly cards: ReadonlyArray<ProgressCard>;
  readonly perPic: ReadonlyArray<PicCardSummary>;
  /** Jumlah kartu terbuka (belum Done dan tidak dibatalkan). */
  readonly openCount: number;
}

/** Sumber data kartu bagi project (diimplementasikan adapter di luar modul project). */
export interface CardSourcePort {
  /** Nama pemilik kartu terbuka pada tahapan (tanpa duplikat), untuk syarat Selesai. */
  openCardOwners(stage: StageRef): Promise<string[]>;
  /** Fakta kartu untuk banyak tahapan sekaligus (tanpa N+1), kunci = id tahapan. */
  cardFacts(stages: ReadonlyArray<StageRef>): Promise<Map<number, StageCardFacts>>;
}

/** Ketergantungan yang disuntikkan ke use case project. */
export interface ProjectDeps {
  readonly clock: Clock;
  readonly transactor: Transactor;
  readonly projects: ProjectRepository;
  readonly reference: ReferencePort;
  readonly cards: CardSourcePort;
  readonly writeAudit: AuditWriter;
}
