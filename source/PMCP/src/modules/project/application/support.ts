/**
 * Pembantu bersama use case project: label tampilan, pemetaan pelaku dan snapshot ke tipe domain, serta
 * pemuatan tahapan dengan kunci baris.
 */
import type { Actor } from '@/modules/auth';
import type { TxContext } from '@/shared/transaction';
import { formatDisplayDate } from '@/shared/iso-date';
import type { StageAccess, StageState } from '../domain/stage-rules';
import type { Estimate, ProjectStatus, StageActor, StageKind, StageStatus } from '../domain/stage-types';
import type { ProjectDeps, ProjectSnapshot, StageSnapshot, StageWrite } from './ports';

/** Nama tahapan untuk pesan dan jejak audit. */
export const STAGE_LABEL: Readonly<Record<StageKind, string>> = { BA: 'BA', DEV: 'Development', QA: 'QA' };

/** Nama status project untuk pesan dan jejak audit. */
export const PROJECT_STATUS_LABEL: Readonly<Record<ProjectStatus, string>> = {
  BACKLOG: 'Backlog',
  RUNNING: 'Berjalan',
  DEFERRED: 'Ditunda',
  CANCELLED: 'Batal',
  COMPLETED: 'Selesai',
};

/** Nama status tahapan untuk pesan dan jejak audit. */
export const STAGE_STATUS_LABEL: Readonly<Record<StageStatus, string>> = {
  NOT_STARTED: 'Belum Mulai',
  RUNNING: 'Berjalan',
  HELD: 'Ditahan',
  DONE: 'Selesai',
};

/**
 * Menurunkan pelaku domain tahapan dari pelaku sesi.
 * Masukan: pelaku sesi. Keluaran: `StageActor` (peran, id PIC, tahapan PIC).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-06, Security Design §2 (peran selalu dari sesi di server).
 */
export function toStageActor(actor: Actor): StageActor {
  return { role: actor.role, picId: actor.picId, picStage: actor.picStage };
}

/**
 * Mengambil fakta hak dari snapshot tahapan.
 * Masukan: snapshot tahapan. Keluaran: `StageAccess`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-03-01, FR-05-01.
 */
export function stageAccess(stage: StageSnapshot): StageAccess {
  return {
    kind: stage.kind,
    assignedPicIds: stage.assignees.map((a) => a.picId),
    hasTimeline: stage.estimate !== null,
  };
}

/**
 * Mengambil keadaan yang dapat berubah dari snapshot tahapan, untuk aturan perpindahan status.
 * Masukan: snapshot tahapan. Keluaran: `StageState`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-01.
 */
export function toStageState(stage: StageSnapshot): StageState {
  return {
    status: stage.status,
    estimate: stage.estimate,
    actualStart: stage.actualStart,
    actualEnd: stage.actualEnd,
    holdSince: stage.holdSince,
    holdReason: stage.holdReason,
    manualProgress: stage.manualProgress,
  };
}

/**
 * Membentuk nilai tulis tahapan dari snapshot dengan sebagian nilai diganti.
 * Masukan: snapshot tahapan dan nilai pengganti. Keluaran: `StageWrite` lengkap.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Technical Design §6.1.
 */
export function toStageWrite(stage: StageSnapshot, changes: Partial<StageWrite>): StageWrite {
  return {
    status: stage.status,
    estimate: stage.estimate,
    baseline: stage.baseline,
    actualStart: stage.actualStart,
    actualEnd: stage.actualEnd,
    holdSince: stage.holdSince,
    holdReason: stage.holdReason,
    holdBy: stage.holdBy,
    manualProgress: stage.manualProgress,
    manualProgressNote: stage.manualProgressNote,
    manualProgressBy: stage.manualProgressBy,
    manualProgressAt: stage.manualProgressAt,
    ...changes,
  };
}

/**
 * Menulis rentang estimasi untuk jejak audit dalam bentuk "dd/mm/yyyy - dd/mm/yyyy".
 * Masukan: estimasi atau null. Keluaran: teks, atau "-" bila belum ada.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-07, NFR-03.
 */
export function formatEstimate(estimate: Estimate | null): string {
  return estimate ? `${formatDisplayDate(estimate.start)} - ${formatDisplayDate(estimate.end)}` : '-';
}

/** Konteks tahapan yang sudah terkunci di dalam transaksi. */
export interface LockedStage {
  readonly project: ProjectSnapshot;
  readonly stage: StageSnapshot;
}

/**
 * Mengunci project pemilik sebuah tahapan dan mengambil snapshot tahapannya di dalam transaksi.
 * Masukan: dependensi, transaksi, id project, id tahapan. Keluaran: project dan tahapan, atau null bila tidak ada.
 * Efek samping: mengunci baris project dan tahapan (SELECT ... FOR UPDATE) sampai transaksi selesai.
 * Rujukan: NFR-10 (serialisasi perubahan tahapan yang sama).
 */
export async function lockStage(
  deps: ProjectDeps,
  tx: TxContext,
  projectId: number,
  stageId: number,
): Promise<LockedStage | null> {
  const project = await deps.projects.lockProject(tx, projectId);
  const stage = project?.stages.find((s) => s.id === stageId);
  return project && stage ? { project, stage } : null;
}
