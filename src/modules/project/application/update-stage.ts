/**
 * Use case gabungan Perbarui Tahapan (Screen [016]): menyimpan sekaligus perubahan PIC dan timeline, revisi estimasi,
 * progres manual, dan status tahapan dalam SATU transaksi.
 *
 * Bila salah satu bagian ditolak, seluruh perubahan dibatalkan (tidak ada yang tersimpan setengah-setengah) dan galat
 * bagian itu dikembalikan. Aturan setiap bagian tetap berada pada use case masing-masing (`stage-use-cases.ts`).
 */
import type { Actor } from '@/modules/auth';
import { MESSAGES } from '@/platform/messages';
import { joinTransaction } from '@/shared/transaction';
import { fail, ok, type ErrorInfo, type Result } from '@/shared/result';
import type { RevisionWarning } from '../domain/revision';
import type { StageStatus } from '../domain/stage-types';
import type { ProjectDeps } from './ports';
import {
  reviseStageEstimate,
  setManualProgress,
  updateStagePlanning,
  updateStageStatus,
  type ReviseStageEstimateInput,
} from './stage-use-cases';
import { lockStage } from './support';

/** Bagian perubahan yang dikirim; hanya bagian yang benar-benar diubah pengguna yang diisi. */
export interface UpdateStageInput {
  readonly stageId: number;
  readonly expectedVersion: number;
  /** PIC dan/atau pengisian timeline yang masih kosong. */
  readonly planning?: { readonly picIds?: ReadonlyArray<number>; readonly estStart?: string; readonly estEnd?: string };
  /** Revisi estimasi bernomor. */
  readonly revision?: Omit<ReviseStageEstimateInput, 'stageId' | 'expectedVersion'>;
  /** Progres manual; `value` null mengembalikan ke hitungan sistem. */
  readonly progress?: { readonly value: number | null; readonly note: string };
  /** Perubahan status (termasuk hold, selesai, dan buka kembali). */
  readonly status?: { readonly target: StageStatus; readonly reason: string; readonly note: string };
}

/** Hasil gabungan: ringkasan bagian yang tersimpan dan saran yang perlu ditampilkan. */
export interface UpdateStageResult {
  /** Nama bagian yang tersimpan, berurutan. */
  readonly saved: ReadonlyArray<'planning' | 'revision' | 'progress' | 'status'>;
  /** True bila hold dilanjutkan dan UI sebaiknya menyarankan revisi estimasi (tidak wajib). */
  readonly suggestRevision: boolean;
  /** Nomor revisi yang tersimpan, bila ada. */
  readonly revisionSeq: number | null;
  readonly revisionWarning: RevisionWarning | null;
}

/**
 * Pembatal transaksi: dilempar dari dalam transaksi agar seluruh perubahan dibatalkan, lalu diubah kembali menjadi
 * `Result` gagal di luar transaksi.
 * Efek samping: tidak ada.
 * Rujukan: Technical Design §12 (transaksi batal bila ada galat).
 */
class StageUpdateAbort extends Error {
  /** Rincian galat bagian yang ditolak. */
  public readonly info: ErrorInfo;

  /**
   * Membuat pembatal dari rincian galat.
   * Masukan: rincian galat. Keluaran: instansi pembatal.
   * Efek samping: tidak ada.
   * Rujukan: Technical Design §12.
   */
  public constructor(info: ErrorInfo) {
    super(info.message);
    this.info = info;
  }
}

/**
 * Menyimpan seluruh perubahan sebuah tahapan sekaligus. Urutan: PIC dan timeline, revisi estimasi, progres manual,
 * lalu status (status terakhir karena Selesai mengosongkan progres manual). Versi baris diperiksa sekali di awal dan
 * diperbarui antar bagian. Nama isian pada galat diberi awalan bagian: `planning.`, `revision.`, `progress.`, `status.`.
 * Masukan: dependensi, pelaku, dan `UpdateStageInput` (hanya bagian yang berubah). Keluaran: ringkasan bagian
 * tersimpan; atau galat bagian pertama yang ditolak (semua perubahan dibatalkan), CONFLICT bila versi lama, atau
 * VALIDATION "Tidak ada perubahan untuk disimpan." bila tidak ada bagian yang diisi.
 * Efek samping: satu transaksi yang menggabungkan penulisan tiap bagian beserta audit masing-masing; rollback penuh
 * bila ada bagian yang gagal.
 * Rujukan: Screen [016] (Simpan: memvalidasi dan menyimpan perubahan yang diisi), FR-03-01, FR-05-01, FR-05-02,
 * FR-13-01, NFR-10.
 */
export async function updateStage(deps: ProjectDeps, actor: Actor, input: UpdateStageInput): Promise<Result<UpdateStageResult>> {
  const parts = [input.planning, input.revision, input.progress, input.status].filter((part) => part !== undefined);
  if (parts.length === 0) return fail({ code: 'VALIDATION', message: MESSAGES.STAGE_NO_CHANGES });
  const projectId = await deps.projects.findProjectIdOfStage(input.stageId);
  if (projectId === null) return fail({ code: 'NOT_FOUND', message: MESSAGES.STAGE_NOT_FOUND });

  try {
    return await deps.transactor.run(async (tx) => {
      const joined: ProjectDeps = { ...deps, transactor: joinTransaction(tx) };
      const first = await lockStage(joined, tx, projectId, input.stageId);
      if (!first) throw new StageUpdateAbort({ code: 'NOT_FOUND', message: MESSAGES.STAGE_NOT_FOUND });
      if (first.stage.version !== input.expectedVersion) throw new StageUpdateAbort({ code: 'CONFLICT', message: MESSAGES.CONFLICT });

      /** Versi baris saat ini (naik setelah tiap bagian yang menulis tahapan). */
      const currentVersion = async (): Promise<number> => (await lockStage(joined, tx, projectId, input.stageId))?.stage.version ?? input.expectedVersion;
      /**
       * Membuka hasil sebuah bagian, melempar pembatal bila gagal. Nama isian galat diberi awalan nama bagian
       * (mis. `progress.note`) karena beberapa bagian memakai nama isian yang sama.
       */
      const must = <T>(part: string, result: Result<T>): T => {
        if (result.ok) return result.data;
        const { fields } = result.error;
        throw new StageUpdateAbort({
          ...result.error,
          fields: fields ? Object.fromEntries(Object.entries(fields).map(([key, message]) => [`${part}.${key}`, message])) : undefined,
        });
      };

      const saved: Array<'planning' | 'revision' | 'progress' | 'status'> = [];
      let suggestRevision = false;
      let revisionSeq: number | null = null;
      let revisionWarning: RevisionWarning | null = null;

      if (input.planning) {
        must('planning', await updateStagePlanning(joined, actor, { stageId: input.stageId, expectedVersion: await currentVersion(), ...input.planning }));
        saved.push('planning');
      }
      if (input.revision) {
        const revised = must('revision', await reviseStageEstimate(joined, actor, { stageId: input.stageId, expectedVersion: await currentVersion(), ...input.revision }));
        revisionSeq = revised.seq;
        revisionWarning = revised.warning;
        saved.push('revision');
      }
      if (input.progress) {
        must('progress', await setManualProgress(joined, actor, { stageId: input.stageId, expectedVersion: await currentVersion(), value: input.progress.value, note: input.progress.note }));
        saved.push('progress');
      }
      if (input.status) {
        const changed = must('status', await updateStageStatus(joined, actor, { stageId: input.stageId, expectedVersion: await currentVersion(), ...input.status }));
        suggestRevision = changed.suggestRevision;
        saved.push('status');
      }
      return ok({ saved, suggestRevision, revisionSeq, revisionWarning });
    });
  } catch (error) {
    if (error instanceof StageUpdateAbort) return fail(error.info);
    throw error;
  }
}
