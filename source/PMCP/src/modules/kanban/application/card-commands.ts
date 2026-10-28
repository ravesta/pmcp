/**
 * Use case perintah kartu Kanban: membuat kartu project dan activity, memindahkan, mengisi progres, jadwal ulang,
 * dan membatalkan (FR-16-02, FR-16-03, FR-17-01, FR-17-02, FR-21-01, FR-21-03, FR-21-04, FR-13-05).
 *
 * Setiap use case adalah satu transaksi: kartu, riwayat, revisi estimasi tahapan, perubahan status project, dan
 * audit tersimpan semua atau tidak sama sekali (Technical Design §6.1 dan §7.3).
 */
import type { Actor } from '@/modules/auth';
import { applyCardRevision, getCardStageTarget, startProjectFromCard, type CardRevisionOutcome } from '@/modules/project';
import { MESSAGES } from '@/platform/messages';
import type { AuditChange } from '@/shared/audit';
import { formatDisplayDate, type IsoDate } from '@/shared/iso-date';
import { fail, ok, type Result } from '@/shared/result';
import {
  checkCancel,
  checkCardProgress,
  checkCardTarget,
  checkNewCard,
  checkReschedule,
  needsStatusConfirmation,
  planMove,
  rescheduleWarning,
  type RescheduleWarning,
} from '../domain/card-rules';
import { COLUMN_LABEL, type CardColumn } from '../domain/card-types';
import type { CardRecord, KanbanDeps } from './ports';
import {
  cancelIssueMessage,
  cardIssueMessages,
  catchAbort,
  must,
  ownerGuard,
  parseDateField,
  parseHoursField,
  progressIssueMessage,
  rescheduleIssueMessages,
  targetIssueMessage,
  toCardState,
  validationFailure,
} from './support';

/** Masukan bersama pembuatan kartu project dan activity. */
export interface CreateCardInput {
  /** Project (kartu project); null untuk kartu activity. */
  readonly projectId: number | null;
  /** Kategori activity dari master (kartu activity). */
  readonly categoryId: number | null;
  /** Nama step dari master aktif tahapan PIC (opsional, kartu project). */
  readonly stepName: string;
  readonly title: string;
  readonly planStart: string;
  readonly planEnd: string;
  /** Estimasi jam desimal; kosong bila tidak diisi. */
  readonly estimateHours: string;
  readonly isAdhoc: boolean;
  /** Kolom awal: PLANNED atau IN_PROGRESS. */
  readonly column: string;
  /** Jawaban konfirmasi status project Backlog atau Ditunda: `YES`, `NO`, atau kosong (belum dijawab). */
  readonly confirmStart: string;
  /** Kategori dan catatan revisi estimasi tahapan bila rencana melewatinya (FR-13-05). */
  readonly revisionCategoryId: number | null;
  readonly revisionNote: string;
  /** Tahapan tanpa estimasi: jadikan rentang rencana sebagai estimasi awal. */
  readonly adoptPlan: boolean;
}

/** Hasil pembuatan kartu. */
export interface CreateCardResult {
  readonly cardId: number;
  readonly code: string;
  readonly revision: CardRevisionOutcome;
  /** True bila status project diubah menjadi Berjalan atas konfirmasi. */
  readonly projectStarted: boolean;
}

/**
 * Menyusun peta perubahan awal kartu untuk jejak audit.
 * Masukan: kartu yang dibuat dan estimasi menit. Keluaran: daftar perubahan nilai awal.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-01 butir 6, BL-07.
 */
function creationChanges(card: { title: string; planStart: IsoDate; planEnd: IsoDate; column: CardColumn; isAdhoc: boolean; estimateMinutes: number | null }): AuditChange[] {
  const changes: AuditChange[] = [
    { field: 'Judul', old: '', new: card.title },
    { field: 'Rencana', old: '', new: `${formatDisplayDate(card.planStart)} - ${formatDisplayDate(card.planEnd)}` },
    { field: 'Kolom', old: '', new: COLUMN_LABEL[card.column] },
  ];
  if (card.estimateMinutes !== null) changes.push({ field: 'Estimasi jam', old: '', new: `${card.estimateMinutes / 60}` });
  if (card.isAdhoc) changes.push({ field: 'Dadakan', old: '', new: 'Ya' });
  return changes;
}

/**
 * Memvalidasi isian yang sama pada kartu project dan activity: judul, rencana, estimasi jam, dan kolom awal.
 * Masukan: isian. Keluaran: nilai tervalidasi, atau peta galat per isian.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-17-01 butir 3, FR-21-01 butir 2.
 */
function validateCommonFields(input: CreateCardInput) {
  const planStart = parseDateField(input.planStart);
  const planEnd = parseDateField(input.planEnd);
  const check = checkNewCard({ title: input.title, planStart, planEnd, estimateHours: parseHoursField(input.estimateHours) });
  const fields = cardIssueMessages(check.issues);
  const column = input.column as CardColumn;
  if (column !== 'PLANNED' && column !== 'IN_PROGRESS') fields.column = MESSAGES.CARD_COLUMN_INVALID;
  return { fields, planStart, planEnd, estimateMinutes: check.estimateMinutes, column, title: input.title.trim() };
}

/**
 * Membuat kartu rencana project untuk project yang diikuti PIC (tahapan tetap PIC). Bila project Backlog atau Ditunda,
 * jawaban konfirmasi wajib; "Ya" mengubah status project menjadi Berjalan saat kartu disimpan. Bila rencana melewati
 * estimasi tahapan, estimasi tahapan direvisi otomatis (kategori dan catatan wajib).
 * Masukan: dependensi, pelaku PIC, dan `CreateCardInput`. Keluaran: id, kode `KB-nnnnn`, hasil revisi, dan penanda
 * project dijalankan; atau FORBIDDEN, NOT_FOUND, VALIDATION per isian (`title`, `plan`, `estimate`, `column`,
 * `project`, `step`, `statusConfirm`, `revision.category`, `revision.note`), atau CONFLICT.
 * Efek samping: satu transaksi: INSERT kartu, revisi estimasi tahapan (bila perlu), UPDATE status project (bila Ya),
 * dan audit kartu, revisi, serta status.
 * Rujukan: FR-17-01, FR-17-02, FR-13-05, BL-24, BL-25, BL-27, BL-38, BL-39; AC: PIC tidak dapat memilih project yang
 * tidak diikutinya; membatalkan pembuatan tidak mengubah status project.
 */
export async function createProjectCard(deps: KanbanDeps, actor: Actor, input: CreateCardInput): Promise<Result<CreateCardResult>> {
  if (actor.role !== 'PIC' || actor.picId === null || actor.picStage === null || actor.picStage === 'DEV') {
    return fail({ code: 'FORBIDDEN', message: MESSAGES.CARD_PIC_ONLY });
  }
  const picId = actor.picId;
  const stage = actor.picStage;
  const common = validateCommonFields(input);
  const fields = { ...common.fields };
  if (input.projectId === null) fields.project = MESSAGES.CARD_PROJECT_REQUIRED;

  const target = input.projectId === null ? null : await getCardStageTarget(deps.project, input.projectId, stage, picId);
  if (input.projectId !== null && !target) fields.project = MESSAGES.CARD_PROJECT_REQUIRED;
  if (target) {
    const issue = checkCardTarget({ projectStatus: target.projectStatus, stageStatus: target.stageStatus, isAssigned: target.isAssigned });
    if (issue) fields.project = targetIssueMessage(issue);
    else if (needsStatusConfirmation(target.projectStatus) && input.confirmStart !== 'YES' && input.confirmStart !== 'NO') {
      fields.statusConfirm = MESSAGES.CARD_STATUS_CONFIRM_REQUIRED;
    }
  }
  const stepName = input.stepName.trim();
  if (stepName !== '') {
    const steps = await deps.reference.listActiveSteps(stage);
    if (!steps.some((s) => s.name === stepName)) fields.step = MESSAGES.CARD_STEP_INACTIVE;
  }
  if (Object.keys(fields).length > 0 || !target || !common.planStart || !common.planEnd) return validationFailure(fields);

  const { planStart, planEnd } = common;
  return catchAbort(() =>
    deps.transactor.run(async (tx) => {
      // Kunci project dan tahapan SEBELUM menyisipkan kartu: INSERT kartu mengambil kunci bersama pada project (foreign
      // key), dan dua transaksi yang sama-sama memegangnya lalu meminta kunci eksklusif akan saling menunggu (deadlock).
      await deps.project.projects.lockProject(tx, target.projectId);
      const created = await deps.cards.insertCard(tx, {
        kind: 'PROJECT',
        ownerPicId: picId,
        projectId: target.projectId,
        stage,
        stepName: stepName === '' ? null : stepName,
        categoryName: null,
        title: common.title,
        column: common.column,
        planStart,
        planEnd,
        estimateMinutes: common.estimateMinutes,
        isAdhoc: input.isAdhoc,
      });

      const revision = must(
        await applyCardRevision(deps.project, tx, actor, {
          stageId: target.stageId,
          projectId: target.projectId,
          cardId: created.id,
          cardCode: created.code,
          plannedStart: planStart,
          plannedEnd: planEnd,
          categoryId: input.revisionCategoryId,
          note: input.revisionNote,
          adoptPlanAsBaseline: input.adoptPlan,
        }),
      );
      if (revision.kind === 'REVISED') await deps.cards.markExtendsStage(tx, created.id, input.revisionNote.trim());

      const projectStarted = input.confirmStart === 'YES' ? must(await startProjectFromCard(deps.project, tx, actor, { projectId: target.projectId, cardCode: created.code })) : false;

      await deps.writeAudit(tx, {
        actorUserId: actor.userId,
        actorLabel: actor.label,
        category: 'CARD',
        action: 'card.created',
        projectCode: target.projectCode,
        entityType: 'card',
        entityId: String(created.id),
        summary: `${created.code}: kartu project dibuat oleh ${actor.label} (${target.projectCode}, ${stage})`.slice(0, 300),
        changes: creationChanges({ ...common, planStart, planEnd, isAdhoc: input.isAdhoc }),
      });
      return ok({ cardId: created.id, code: created.code, revision, projectStarted });
    }),
  );
}

/**
 * Membuat kartu activity di luar project dengan kategori dari master aktif. Tidak memicu revisi estimasi maupun
 * konfirmasi status project.
 * Masukan: dependensi, pelaku PIC, dan `CreateCardInput` (`categoryId` wajib). Keluaran: id dan kode kartu; atau
 * FORBIDDEN, VALIDATION per isian (`title`, `plan`, `estimate`, `column`, `category`).
 * Efek samping: satu transaksi: INSERT kartu dan audit.
 * Rujukan: FR-21-01 butir 1 sampai 3; AC: kartu activity tanpa kategori ditolak.
 */
export async function createActivityCard(deps: KanbanDeps, actor: Actor, input: CreateCardInput): Promise<Result<CreateCardResult>> {
  if (actor.role !== 'PIC' || actor.picId === null) return fail({ code: 'FORBIDDEN', message: MESSAGES.CARD_PIC_ONLY });
  const picId = actor.picId;
  const common = validateCommonFields(input);
  const fields = { ...common.fields };
  const categories = await deps.reference.listActivityCategories();
  const category = categories.find((c) => c.id === input.categoryId);
  if (!category) fields.category = input.categoryId === null ? MESSAGES.CARD_CATEGORY_REQUIRED : MESSAGES.CARD_CATEGORY_INACTIVE;
  if (Object.keys(fields).length > 0 || !category || !common.planStart || !common.planEnd) return validationFailure(fields);

  const { planStart, planEnd } = common;
  return deps.transactor.run(async (tx) => {
    const created = await deps.cards.insertCard(tx, {
      kind: 'ACTIVITY',
      ownerPicId: picId,
      projectId: null,
      stage: null,
      stepName: null,
      categoryName: category.name,
      title: common.title,
      column: common.column,
      planStart,
      planEnd,
      estimateMinutes: common.estimateMinutes,
      isAdhoc: input.isAdhoc,
    });
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'CARD',
      action: 'card.created',
      entityType: 'card',
      entityId: String(created.id),
      summary: `${created.code}: kartu activity dibuat oleh ${actor.label} (${category.name})`.slice(0, 300),
      changes: [{ field: 'Kategori', old: '', new: category.name }, ...creationChanges({ ...common, planStart, planEnd, isAdhoc: input.isAdhoc })],
    });
    return ok({ cardId: created.id, code: created.code, revision: { kind: 'NONE' } as CardRevisionOutcome, projectStarted: false });
  });
}

/** Masukan perintah pada kartu yang sudah ada. */
interface CardCommandInput {
  readonly cardId: number;
  /** Versi kartu yang dilihat pengguna (pengendalian konkurensi optimistis). */
  readonly expectedVersion: number;
}

/**
 * Mengunci kartu, memeriksa hak pemilik dan versi di dalam transaksi.
 * Masukan: dependensi, transaksi, pelaku, dan perintah. Keluaran: kartu terkunci; melempar `AppError` bila ditolak.
 * Efek samping: SELECT ... FOR UPDATE pada kartu.
 * Rujukan: NFR-10, FR-16-02 butir 1.
 */
async function lockOwnedCard(deps: KanbanDeps, tx: Parameters<KanbanDeps['cards']['lockCard']>[0], actor: Actor, input: CardCommandInput): Promise<CardRecord> {
  const card = await deps.cards.lockCard(tx, input.cardId);
  if (!card) must(fail({ code: 'NOT_FOUND', message: MESSAGES.CARD_NOT_FOUND }));
  const forbidden = ownerGuard(actor, card as CardRecord);
  if (forbidden) must(fail(forbidden));
  if ((card as CardRecord).version !== input.expectedVersion) must(fail({ code: 'CONFLICT', message: MESSAGES.CONFLICT }));
  return card as CardRecord;
}

/**
 * Memindahkan kartu ke kolom lain. Ke Done: tanggal selesai hari ini dan progres 100; kembali dari Done: tanggal
 * selesai dikosongkan dan, ke In Progress, progres 0 dengan "Progres perlu diisi"; ke Planned: progres 0. Tidak
 * mengubah status tahapan maupun project.
 * Masukan: dependensi, pelaku, `{cardId, expectedVersion, target}`. Keluaran: berhasil; atau FORBIDDEN, NOT_FOUND,
 * CONFLICT, VALIDATION (kartu dibatalkan atau sudah di kolom itu).
 * Efek samping: satu transaksi: UPDATE kartu, INSERT riwayat progres bila berubah, dan audit.
 * Rujukan: FR-16-02, BL-27, BL-37, BL-40a; AC: ke Done mencatat tanggal selesai hari ini.
 */
export async function moveCard(deps: KanbanDeps, actor: Actor, input: CardCommandInput & { target: string }): Promise<Result<null>> {
  const target = input.target as CardColumn;
  if (!(target in COLUMN_LABEL)) return fail({ code: 'VALIDATION', message: MESSAGES.UNEXPECTED });
  return catchAbort(() =>
    deps.transactor.run(async (tx) => {
      const card = await lockOwnedCard(deps, tx, actor, input);
      const plan = planMove(toCardState(card), target, deps.clock.today());
      if (!plan.ok) return fail({ code: 'VALIDATION', message: plan.issue === 'CANCELLED' ? MESSAGES.CARD_CANCELLED : MESSAGES.CARD_SAME_COLUMN });
      const saved = await deps.cards.saveState(tx, card.id, card.version, plan);
      if (!saved) return fail({ code: 'CONFLICT', message: MESSAGES.CONFLICT });
      if (plan.progressChange) {
        await deps.cards.appendProgressEvent(tx, { cardId: card.id, oldValue: plan.progressChange.from, newValue: plan.progressChange.to, source: 'MOVE', createdBy: actor.userId });
      }
      await deps.writeAudit(tx, {
        actorUserId: actor.userId,
        actorLabel: actor.label,
        category: 'CARD',
        action: 'card.moved',
        projectCode: card.projectCode,
        entityType: 'card',
        entityId: String(card.id),
        summary: `${card.code}: dipindah dari ${COLUMN_LABEL[card.column]} ke ${COLUMN_LABEL[target]} oleh ${actor.label}`,
        changes: [{ field: 'Kolom', old: COLUMN_LABEL[card.column], new: COLUMN_LABEL[target] }],
      });
      return ok(null);
    }),
  );
}

/**
 * Mengisi progres kartu In Progress (0, 25, 50, atau 75). Setiap perubahan tercatat (siapa, kapan, dari-ke).
 * Masukan: dependensi, pelaku, `{cardId, expectedVersion, value}`. Keluaran: berhasil; atau FORBIDDEN, NOT_FOUND,
 * CONFLICT, VALIDATION (bukan In Progress atau nilai di luar pilihan).
 * Efek samping: satu transaksi: UPDATE kartu, INSERT riwayat progres bila nilai berubah, dan audit.
 * Rujukan: FR-16-03, BL-40a; AC: memilih 50% menyimpan 50% dan mencatat dari-ke.
 */
export async function setCardProgress(deps: KanbanDeps, actor: Actor, input: CardCommandInput & { value: number }): Promise<Result<null>> {
  return catchAbort(() =>
    deps.transactor.run(async (tx) => {
      const card = await lockOwnedCard(deps, tx, actor, input);
      const issue = checkCardProgress(toCardState(card), input.value);
      if (issue) return fail({ code: 'VALIDATION', message: progressIssueMessage(issue), fields: { progress: progressIssueMessage(issue) } });
      const saved = await deps.cards.saveState(tx, card.id, card.version, { column: card.column, progress: input.value, progressNeedsInput: false, doneOn: null });
      if (!saved) return fail({ code: 'CONFLICT', message: MESSAGES.CONFLICT });
      if (card.progress !== input.value) {
        await deps.cards.appendProgressEvent(tx, { cardId: card.id, oldValue: card.progress, newValue: input.value, source: 'MANUAL', createdBy: actor.userId });
        await deps.writeAudit(tx, {
          actorUserId: actor.userId,
          actorLabel: actor.label,
          category: 'CARD',
          action: 'card.progress_set',
          projectCode: card.projectCode,
          entityType: 'card',
          entityId: String(card.id),
          summary: `${card.code}: progres ${card.progress}% menjadi ${input.value}% oleh ${actor.label}`,
          changes: [{ field: 'Progres', old: `${card.progress}%`, new: `${input.value}%` }],
        });
      }
      return ok(null);
    }),
  );
}

/** Masukan jadwal ulang. */
export interface RescheduleInput extends CardCommandInput {
  readonly planStart: string;
  readonly planEnd: string;
  readonly reasonId: number | null;
  readonly note: string;
  readonly revisionCategoryId: number | null;
  readonly revisionNote: string;
}

/** Hasil jadwal ulang. */
export interface RescheduleResult {
  readonly warning: RescheduleWarning;
  readonly revision: CardRevisionOutcome;
}

/**
 * Memindahkan rencana kartu ke tanggal lain dengan alasan dari master (rencana awal tetap). Peringatan (tidak
 * memblokir) bila jumlah jadwal ulang mencapai batas master. Pada kartu project yang rencananya melewati estimasi
 * tahapan berlaku revisi otomatis.
 * Masukan: dependensi, pelaku, dan `RescheduleInput`. Keluaran: peringatan batas dan hasil revisi; atau FORBIDDEN,
 * NOT_FOUND, CONFLICT, VALIDATION (`plan`, `reason`, `note`, `card`, `revision.*`).
 * Efek samping: satu transaksi: INSERT riwayat jadwal ulang, UPDATE rencana kartu, revisi estimasi tahapan (bila
 * perlu), dan audit.
 * Rujukan: FR-21-03, FR-13-05, EC-21-03.05; AC: jadwal ulang tanpa alasan ditolak; ketiga pada batas 3 tetap tersimpan.
 */
export async function rescheduleCard(deps: KanbanDeps, actor: Actor, input: RescheduleInput): Promise<Result<RescheduleResult>> {
  const [reasons, threshold] = await Promise.all([deps.reference.listRescheduleReasons(), deps.reference.getRescheduleWarnThreshold()]);
  const reason = reasons.find((r) => r.id === input.reasonId);
  const planStart = parseDateField(input.planStart);
  const planEnd = parseDateField(input.planEnd);

  return catchAbort(() =>
    deps.transactor.run(async (tx) => {
      const card = await lockOwnedCard(deps, tx, actor, input);
      const issues = checkReschedule(toCardState(card), { start: planStart, end: planEnd }, Boolean(reason), input.note);
      if (issues.length > 0 || !reason || !planStart || !planEnd) return validationFailure(rescheduleIssueMessages(issues));

      const count = await deps.cards.appendReschedule(tx, {
        cardId: card.id,
        oldStart: card.planStart,
        oldEnd: card.planEnd,
        newStart: planStart,
        newEnd: planEnd,
        reasonName: reason.name,
        note: input.note.trim() === '' ? null : input.note.trim(),
        createdBy: actor.userId,
      });
      const saved = await deps.cards.savePlan(tx, card.id, card.version, { planStart, planEnd });
      if (!saved) must(fail({ code: 'CONFLICT', message: MESSAGES.CONFLICT })); // sudah ada tulisan: batalkan transaksi

      let revision: CardRevisionOutcome = { kind: 'NONE' };
      if (card.kind === 'PROJECT' && card.projectId !== null && card.stage !== null) {
        const target = await getCardStageTarget(deps.project, card.projectId, card.stage, card.ownerPicId);
        if (target) {
          revision = must(
            await applyCardRevision(deps.project, tx, actor, {
              stageId: target.stageId,
              projectId: card.projectId,
              cardId: card.id,
              cardCode: card.code,
              plannedStart: planStart,
              plannedEnd: planEnd,
              categoryId: input.revisionCategoryId,
              note: input.revisionNote,
              adoptPlanAsBaseline: false,
            }),
          );
          if (revision.kind === 'REVISED') await deps.cards.markExtendsStage(tx, card.id, input.revisionNote.trim());
        }
      }

      await deps.writeAudit(tx, {
        actorUserId: actor.userId,
        actorLabel: actor.label,
        category: 'CARD',
        action: 'card.rescheduled',
        projectCode: card.projectCode,
        entityType: 'card',
        entityId: String(card.id),
        summary: `${card.code}: jadwal ulang ke-${count} oleh ${actor.label} (${reason.name})`.slice(0, 300),
        changes: [
          { field: 'Rencana', old: `${formatDisplayDate(card.planStart)} - ${formatDisplayDate(card.planEnd)}`, new: `${formatDisplayDate(planStart)} - ${formatDisplayDate(planEnd)}` },
          { field: 'Alasan jadwal ulang', old: '', new: reason.name },
          ...(input.note.trim() === '' ? [] : [{ field: 'Catatan', old: '', new: input.note.trim() }]),
        ],
      });
      return ok({ warning: rescheduleWarning(count, threshold), revision });
    }),
  );
}

/**
 * Membatalkan kartu yang belum Done dengan alasan wajib. Kartu keluar dari papan, kepatuhan, dan progres tahapan;
 * log yang sudah ada tetap tersimpan.
 * Masukan: dependensi, pelaku, `{cardId, expectedVersion, reason}`. Keluaran: berhasil; atau FORBIDDEN, NOT_FOUND,
 * CONFLICT, VALIDATION (`reason`).
 * Efek samping: satu transaksi: UPDATE kartu (waktu dan alasan pembatalan) dan audit.
 * Rujukan: FR-21-04, EC-21-04.03, BL-35; AC: pembatalan tanpa alasan ditolak.
 */
export async function cancelCard(deps: KanbanDeps, actor: Actor, input: CardCommandInput & { reason: string }): Promise<Result<null>> {
  return catchAbort(() =>
    deps.transactor.run(async (tx) => {
      const card = await lockOwnedCard(deps, tx, actor, input);
      const issue = checkCancel(toCardState(card), input.reason);
      if (issue) return fail({ code: 'VALIDATION', message: cancelIssueMessage(issue), fields: { reason: cancelIssueMessage(issue) } });
      const saved = await deps.cards.cancel(tx, card.id, card.version, { reason: input.reason.trim(), at: deps.clock.now() });
      if (!saved) return fail({ code: 'CONFLICT', message: MESSAGES.CONFLICT });
      await deps.writeAudit(tx, {
        actorUserId: actor.userId,
        actorLabel: actor.label,
        category: 'CARD',
        action: 'card.cancelled',
        projectCode: card.projectCode,
        entityType: 'card',
        entityId: String(card.id),
        summary: `${card.code}: dibatalkan oleh ${actor.label}`,
        changes: [{ field: 'Alasan pembatalan', old: '', new: input.reason.trim() }],
      });
      return ok(null);
    }),
  );
}
