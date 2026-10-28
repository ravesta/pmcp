'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createProject,
  reviseStageEstimate,
  setManualProgress,
  STAGE_ORDER,
  updateProjectInfo,
  updateStagePlanning,
  updateStageStatus,
  type ProjectInfoInput,
  type StageKind,
  type StageStatus,
} from '@/modules/project';
import { getContainer } from '@/platform/container';
import { MESSAGES } from '@/platform/messages';
import { nextStamp, type ActionState } from '../../_lib/action-state';
import { formInteger, formIntegers, formText, toActionState } from '../../_lib/form-data';
import { requirePageSession } from '../../_lib/session';

/** Status tahapan yang diterima dari formulir (divalidasi, bukan dipercaya). */
const STAGE_STATUSES: ReadonlyArray<StageStatus> = ['NOT_STARTED', 'RUNNING', 'HELD', 'DONE'];

/**
 * Membaca atribut project dari formulir (Buat project dan Ubah informasi memakai isian yang sama).
 * Masukan: FormData. Keluaran: `ProjectInfoInput` mentah (belum divalidasi).
 * Efek samping: tidak ada.
 * Rujukan: Screen [013], Screen [015], Security Design §7.
 */
function readProjectInfo(formData: FormData): ProjectInfoInput {
  return {
    name: formText(formData, 'name'),
    referenceNo: formText(formData, 'referenceNo'),
    projectType: formText(formData, 'projectType'),
    businessOwner: formText(formData, 'businessOwner'),
    department: formText(formData, 'department'),
    requestDate: formText(formData, 'requestDate'),
    description: formText(formData, 'description'),
    applicationIds: formIntegers(formData, 'applicationIds'),
  };
}

/**
 * Membaca perencanaan satu tahapan (PIC dan estimasi) dari formulir Buat project.
 * Masukan: FormData dan jenis tahapan. Keluaran: PIC terpilih dan tanggal estimasi mentah.
 * Efek samping: tidak ada.
 * Rujukan: FR-02-02, Screen [013] field 12 dan 13.
 */
function readStagePlan(formData: FormData, kind: StageKind) {
  return { picIds: formIntegers(formData, `pics.${kind}`), estStart: formText(formData, `estStart.${kind}`), estEnd: formText(formData, `estEnd.${kind}`) };
}

/**
 * Aksi Buat project (Manager). Berhasil: kembali ke Daftar Project dengan pesan berhasil.
 * Masukan: state sebelumnya dan FormData (atribut, status, alasan, PIC dan estimasi tiap tahapan). Keluaran: state
 * galat bila gagal; bila berhasil mengarahkan ke Daftar dan tidak kembali.
 * Efek samping: menjalankan `createProject` (menulis project, tahapan, penugasan, dan audit) lalu me-refresh halaman.
 * Hak akses dicek di server oleh use case (hanya Manager).
 * Rujukan: FR-02-01 butir 7, FR-02-02, Screen [013].
 */
export async function createProjectAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { actor } = await requirePageSession();
  const result = await createProject(getContainer().project, actor, {
    info: readProjectInfo(formData),
    status: formText(formData, 'status'),
    statusReason: formText(formData, 'statusReason'),
    stages: Object.fromEntries(STAGE_ORDER.map((kind) => [kind, readStagePlan(formData, kind)])),
  });
  if (!result.ok) return toActionState(result, '');
  revalidatePath('/project', 'layout');
  redirect(`/project?v=daftar&dibuat=${encodeURIComponent(result.data.code)}&lengkap=${result.data.planningComplete ? '1' : '0'}`);
}

/**
 * Aksi Ubah informasi dan status project (Manager dan PIC BA/QA).
 * Masukan: state sebelumnya dan FormData (id project, versi, atribut, status, alasan). Keluaran: state hasil.
 * Efek samping: menjalankan `updateProjectInfo` (menulis project dan audit) lalu me-refresh halaman Project.
 * Rujukan: FR-11-02, FR-14-01, Screen [015].
 */
export async function updateProjectInfoAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { actor } = await requirePageSession();
  const projectId = formInteger(formData, 'projectId');
  const expectedVersion = formInteger(formData, 'expectedVersion');
  if (projectId === null || expectedVersion === null) return { ok: false, message: MESSAGES.UNEXPECTED, stamp: nextStamp() };
  const result = await updateProjectInfo(getContainer().project, actor, {
    projectId,
    expectedVersion,
    info: readProjectInfo(formData),
    status: formText(formData, 'status'),
    statusReason: formText(formData, 'statusReason'),
  });
  revalidatePath('/project', 'layout');
  return toActionState(result, 'Perubahan disimpan.');
}

/**
 * Aksi tahapan pada dialog Perbarui Tahapan. Satu pintu dengan `intent`: `planning` (PIC dan timeline), `status`,
 * `progress` (progres manual), atau `revise` (revisi estimasi).
 * Masukan: state sebelumnya dan FormData (intent, id tahapan, versi, dan isian bagian itu). Keluaran: state hasil.
 * Efek samping: menjalankan use case tahapan yang sesuai (menulis tahapan dan audit) lalu me-refresh halaman Project.
 * Hak akses dicek di server oleh tiap use case.
 * Rujukan: Screen [016], FR-03-01, FR-05-01, FR-05-02, FR-13-01.
 */
export async function stageAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { actor } = await requirePageSession();
  const deps = getContainer().project;
  const stageId = formInteger(formData, 'stageId');
  const expectedVersion = formInteger(formData, 'expectedVersion');
  if (stageId === null || expectedVersion === null) return { ok: false, message: MESSAGES.UNEXPECTED, stamp: nextStamp() };
  const base = { stageId, expectedVersion };

  let state: ActionState;
  switch (formText(formData, 'intent')) {
    case 'planning': {
      const hasEstimate = formData.has('estStart') || formData.has('estEnd');
      state = toActionState(
        await updateStagePlanning(deps, actor, {
          ...base,
          picIds: formText(formData, 'picsTouched') === '1' ? formIntegers(formData, 'picIds') : undefined,
          ...(hasEstimate ? { estStart: formText(formData, 'estStart'), estEnd: formText(formData, 'estEnd') } : {}),
        }),
        'Perencanaan tahapan disimpan.',
      );
      break;
    }
    case 'status': {
      const target = formText(formData, 'target') as StageStatus;
      if (!STAGE_STATUSES.includes(target)) {
        state = { ok: false, message: MESSAGES.UNEXPECTED, stamp: nextStamp() };
        break;
      }
      const result = await updateStageStatus(deps, actor, { ...base, target, reason: formText(formData, 'reason'), note: formText(formData, 'note') });
      state = toActionState(
        result,
        result.ok && result.data.suggestRevision ? 'Status disimpan. Pertimbangkan merevisi estimasi tahapan karena sempat ditahan.' : 'Status tahapan disimpan.',
      );
      break;
    }
    case 'progress': {
      const reset = formText(formData, 'reset') === '1';
      const value = formInteger(formData, 'value');
      if (!reset && value === null) {
        state = { ok: false, message: MESSAGES.MANUAL_PROGRESS_RANGE, fields: { value: MESSAGES.MANUAL_PROGRESS_RANGE }, stamp: nextStamp() };
        break;
      }
      state = toActionState(
        await setManualProgress(deps, actor, { ...base, value: reset ? null : value, note: formText(formData, 'note') }),
        reset ? 'Progres dikembalikan ke hitungan sistem.' : 'Progres tahapan disimpan.',
      );
      break;
    }
    case 'revise': {
      const result = await reviseStageEstimate(deps, actor, {
        ...base,
        newStart: formText(formData, 'newStart'),
        newEnd: formText(formData, 'newEnd'),
        categoryId: formInteger(formData, 'categoryId'),
        note: formText(formData, 'note'),
      });
      state = toActionState(
        result,
        result.ok
          ? result.data.warning.justReached
            ? `Revisi ${result.data.seq} disimpan. Tahapan ini sudah mencapai batas peringatan revisi.`
            : result.data.seq === 0
              ? 'Estimasi awal disimpan.'
              : `Revisi ${result.data.seq} disimpan.`
          : '',
      );
      break;
    }
    default:
      state = { ok: false, message: MESSAGES.UNEXPECTED, stamp: nextStamp() };
  }
  revalidatePath('/project', 'layout');
  return state;
}
