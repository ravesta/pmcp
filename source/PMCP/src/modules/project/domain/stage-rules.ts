/**
 * Hak ubah tahapan dan aturan perpindahan status tahapan (FR-03-01, FR-05-01, FR-06-01; BL-05, BL-06, BL-13,
 * BL-15, BL-16, BL-40d).
 *
 * Seluruh fungsi murni dan hanya memakai fakta yang diberikan pemanggil; pelaku selalu berasal dari sesi di
 * server (Security Design §2), tidak pernah dari input klien.
 */
import type { IsoDate } from '@/shared/iso-date';
import type { Estimate, HoldPeriod, ProjectStatus, StageActor, StageKind, StageStatus } from './stage-types';

/** Alasan hold maksimum 300 karakter (FR-05-01 butir 3). */
export const HOLD_REASON_MAX = 300;
/** Catatan Manager (melewati syarat Selesai atau membuka kembali) minimal 3 karakter (FR-05-01 butir 4 dan 9). */
export const MANAGER_NOTE_MIN = 3;

/** Fakta tahapan yang dibutuhkan untuk menilai hak pelaku. */
export interface StageAccess {
  readonly kind: StageKind;
  /** Id PIC yang ditugaskan pada tahapan. */
  readonly assignedPicIds: ReadonlyArray<number>;
  /** True bila estimasi tahapan sudah terisi. */
  readonly hasTimeline: boolean;
}

/**
 * Menentukan apakah pelaku adalah PIC tahapan itu (PIC BA/QA yang ditugaskan; tahapan Development tidak punya
 * PIC yang login).
 * Masukan: pelaku dan fakta tahapan. Keluaran: true bila PIC tahapan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-06, FR-06-01 butir 1 dan 2.
 */
export function isStagePic(actor: StageActor, stage: StageAccess): boolean {
  return (
    actor.role === 'PIC' &&
    actor.picId !== null &&
    stage.kind !== 'DEV' &&
    stage.assignedPicIds.includes(actor.picId)
  );
}

/**
 * Hak mengubah status, progres manual, menahan, dan merevisi estimasi tahapan: Manager, atau PIC tahapan
 * (kecuali Development, hanya Manager), tanpa persetujuan.
 * Masukan: pelaku dan fakta tahapan. Keluaran: true bila berhak.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-01 butir 2, FR-06-01, FR-13-01 butir 4, BL-06, BL-16.
 */
export function canUpdateStage(actor: StageActor, stage: StageAccess): boolean {
  return actor.role === 'MANAGER' || isStagePic(actor, stage);
}

/**
 * Hak mengubah PIC tahapan: Manager (tahapan mana pun), PIC tahapan itu (serah terima, penambahan, pengurangan),
 * dan PIC BA/QA mana pun bila tahapan belum punya PIC.
 * Masukan: pelaku dan fakta tahapan. Keluaran: true bila berhak.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-03-01 butir 1 sampai 3, BL-06 (CL-022, CL-025); AC: PIC QA dapat mengisi PIC Development yang kosong.
 */
export function canEditAssignees(actor: StageActor, stage: StageAccess): boolean {
  if (actor.role === 'MANAGER') return true;
  if (isStagePic(actor, stage)) return true;
  return actor.role === 'PIC' && stage.assignedPicIds.length === 0;
}

/**
 * Hak mengisi estimasi tahapan yang masih kosong: Manager atau PIC BA/QA mana pun. Estimasi yang sudah ada tidak
 * ditimpa langsung; perubahannya lewat revisi beralasan.
 * Masukan: pelaku dan fakta tahapan. Keluaran: true bila berhak mengisi.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-03-01 butir 2 dan 4, FR-02-02 butir 3, BL-06; AC: PIC BA tidak dapat mengubah PIC tahapan QA yang terisi.
 */
export function canFillTimeline(actor: StageActor, stage: StageAccess): boolean {
  if (stage.hasTimeline) return false;
  return actor.role === 'MANAGER' || actor.role === 'PIC';
}

/**
 * Hak mengubah informasi project: Manager dan PIC BA/QA (semua project).
 * Masukan: pelaku. Keluaran: true bila berhak.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-11-02, BR-11 (CL-019).
 */
export function canEditProjectInfo(actor: StageActor): boolean {
  return actor.role === 'MANAGER' || (actor.role === 'PIC' && actor.picStage !== null);
}

/** Keadaan tahapan yang dapat berubah oleh perpindahan status. */
export interface StageState {
  readonly status: StageStatus;
  readonly estimate: Estimate | null;
  readonly actualStart: IsoDate | null;
  readonly actualEnd: IsoDate | null;
  readonly holdSince: IsoDate | null;
  readonly holdReason: string | null;
  /** Progres manual berlaku (0..99); null bila mengikuti hitungan sistem. */
  readonly manualProgress: number | null;
}

/** Permintaan perubahan status tahapan. */
export interface StatusChangeRequest {
  readonly target: StageStatus;
  /** Alasan hold (wajib bila target Ditahan). */
  readonly reason: string;
  /** Catatan Manager untuk melewati syarat Selesai atau membuka kembali tahapan. */
  readonly note: string;
  readonly isManager: boolean;
  /** Nama pemilik kartu terbuka pada tahapan ini (semua PIC); kosong bila tidak ada. */
  readonly openCardOwners: ReadonlyArray<string>;
  readonly projectStatus: ProjectStatus;
  readonly today: IsoDate;
}

/** Penyebab penolakan perubahan status. */
export type StatusChangeIssue =
  | 'NO_CHANGE'
  | 'HOLD_REASON_REQUIRED'
  | 'HOLD_REASON_TOO_LONG'
  | 'OPEN_CARDS'
  | 'NOTE_REQUIRED'
  | 'NOT_STARTED_HAS_MANUAL_PROGRESS'
  | 'REOPEN_MANAGER_ONLY'
  | 'REOPEN_TARGET_INVALID'
  | 'PROJECT_COMPLETED';

/** Hasil perubahan status: keadaan baru dan efek turunan, atau penolakan. */
export type StatusChangeOutcome =
  | {
      readonly ok: true;
      readonly next: StageState;
      /** Periode hold yang ditutup oleh perubahan ini, untuk disimpan ke riwayat hold. */
      readonly closedHold: (HoldPeriod & { readonly reason: string; readonly resumedOn: IsoDate }) | null;
      /** True bila UI sebaiknya menyarankan (tidak mewajibkan) revisi estimasi, yaitu saat hold dilanjutkan. */
      readonly suggestRevision: boolean;
      /** Catatan Manager yang harus tercatat di jejak (melewati syarat Selesai atau membuka kembali). */
      readonly auditNote: string | null;
      readonly reopened: boolean;
    }
  | { readonly ok: false; readonly issue: StatusChangeIssue; readonly owners?: ReadonlyArray<string> };

/**
 * Menerapkan aturan perpindahan status tahapan dan menghitung keadaan barunya, termasuk tanggal aktual, periode
 * hold, dan pembersihan progres manual.
 * Masukan: keadaan tahapan saat ini dan permintaan. Keluaran: `StatusChangeOutcome`.
 * Aturan: Ditahan wajib alasan dan mencatat tanggal mulai; Selesai mensyaratkan tidak ada kartu terbuka (Manager
 * dapat melewati dengan catatan) dan mengisi selesai aktual; Berjalan pertama kali mengisi mulai aktual; Belum
 * Mulai ditolak bila ada progres manual di atas 0; membuka kembali tahapan Selesai hanya Manager dengan catatan
 * dan hanya bila project belum Selesai.
 * Efek samping: tidak ada (fungsi murni); penyimpanan dan audit dilakukan use case.
 * Rujukan: FR-05-01 butir 3 sampai 6 dan 9, FR-13-02, BL-13, BL-15, BL-40(d).
 */
export function applyStatusChange(current: StageState, request: StatusChangeRequest): StatusChangeOutcome {
  const reason = request.reason.trim();
  const note = request.note.trim();
  const noteOk = [...note].length >= MANAGER_NOTE_MIN;

  if (current.status === 'DONE') {
    if (!request.isManager) return { ok: false, issue: 'REOPEN_MANAGER_ONLY' };
    if (request.target !== 'RUNNING') return { ok: false, issue: 'REOPEN_TARGET_INVALID' };
    if (request.projectStatus === 'COMPLETED') return { ok: false, issue: 'PROJECT_COMPLETED' };
    if (!noteOk) return { ok: false, issue: 'NOTE_REQUIRED' };
    return {
      ok: true,
      next: { ...current, status: 'RUNNING', actualEnd: null, manualProgress: null },
      closedHold: null,
      suggestRevision: false,
      auditNote: note,
      reopened: true,
    };
  }

  if (current.status === request.target && !(request.target === 'HELD' && reason !== (current.holdReason ?? ''))) {
    return { ok: false, issue: 'NO_CHANGE' };
  }

  const closedHold =
    current.status === 'HELD' && current.holdSince && request.target !== 'HELD'
      ? { since: current.holdSince, resumedOn: request.today, reason: current.holdReason ?? '' }
      : null;

  switch (request.target) {
    case 'HELD': {
      if (reason.length === 0) return { ok: false, issue: 'HOLD_REASON_REQUIRED' };
      if ([...reason].length > HOLD_REASON_MAX) return { ok: false, issue: 'HOLD_REASON_TOO_LONG' };
      const holdSince = current.status === 'HELD' && current.holdSince ? current.holdSince : request.today;
      return {
        ok: true,
        next: { ...current, status: 'HELD', holdSince, holdReason: reason },
        closedHold: null,
        suggestRevision: false,
        auditNote: null,
        reopened: false,
      };
    }
    case 'DONE': {
      let auditNote: string | null = null;
      if (request.openCardOwners.length > 0) {
        if (!request.isManager) return { ok: false, issue: 'OPEN_CARDS', owners: request.openCardOwners };
        if (!noteOk) return { ok: false, issue: 'NOTE_REQUIRED', owners: request.openCardOwners };
        auditNote = note;
      }
      return {
        ok: true,
        next: {
          ...current,
          status: 'DONE',
          actualStart: current.actualStart ?? current.estimate?.start ?? request.today,
          actualEnd: request.today,
          holdSince: null,
          holdReason: null,
          manualProgress: null,
        },
        closedHold,
        suggestRevision: false,
        auditNote,
        reopened: false,
      };
    }
    case 'RUNNING':
      return {
        ok: true,
        next: {
          ...current,
          status: 'RUNNING',
          actualStart: current.actualStart ?? request.today,
          holdSince: null,
          holdReason: null,
        },
        closedHold,
        suggestRevision: closedHold !== null,
        auditNote: null,
        reopened: false,
      };
    case 'NOT_STARTED':
      if (current.manualProgress !== null && current.manualProgress > 0) {
        return { ok: false, issue: 'NOT_STARTED_HAS_MANUAL_PROGRESS' };
      }
      return {
        ok: true,
        next: { ...current, status: 'NOT_STARTED', holdSince: null, holdReason: null },
        closedHold,
        suggestRevision: closedHold !== null,
        auditNote: null,
        reopened: false,
      };
  }
}

/** Catatan penyesuaian progres manual minimal 3 karakter (FR-05-02 butir 3). */
export const MANUAL_PROGRESS_NOTE_MIN = 3;

/** Penyebab penolakan penyesuaian progres manual. */
export type ManualProgressIssue = 'OUT_OF_RANGE' | 'NOTE_REQUIRED' | 'STAGE_DONE';

/**
 * Memeriksa penyesuaian progres manual tahapan. Catatan wajib bila tahapan punya kartu rencana dan angka
 * berbeda dari nilai yang berlaku (angka manual terakhir bila ada, bila tidak hitungan sistem saat itu);
 * tahapan tanpa kartu diisi langsung tanpa catatan.
 * Masukan: angka baru (null = kembali ke hitungan sistem), catatan, apakah tahapan punya kartu aktif, nilai yang
 * berlaku saat ini, dan status tahapan. Keluaran: penyebab penolakan atau null bila valid.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 3 sampai 5; AC: angka manual berbeda tanpa catatan ditolak; 100% hanya lewat Selesai.
 */
export function checkManualProgress(input: {
  value: number | null;
  note: string;
  hasCards: boolean;
  currentEffective: number;
  stageStatus: StageStatus;
}): ManualProgressIssue | null {
  if (input.stageStatus === 'DONE') return 'STAGE_DONE';
  if (input.value === null) return null;
  if (!Number.isInteger(input.value) || input.value < 0 || input.value > 99) return 'OUT_OF_RANGE';
  const differs = input.value !== input.currentEffective;
  if (input.hasCards && differs && [...input.note.trim()].length < MANUAL_PROGRESS_NOTE_MIN) return 'NOTE_REQUIRED';
  return null;
}
