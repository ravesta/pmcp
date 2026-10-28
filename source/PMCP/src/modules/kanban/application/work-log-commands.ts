/**
 * Use case log activity pada kartu: mencatat dan menghapus (FR-18-01; BL-28, BL-30).
 *
 * Log tidak dapat diubah, hanya dihapus pemilik kartu. Bentrok waktu dijaga dua lapis: pemeriksaan di use case dan
 * trigger database dengan kunci per PIC untuk permintaan yang berlomba (Technical Design TD-15).
 */
import type { Actor } from '@/modules/auth';
import { MESSAGES } from '@/platform/messages';
import { formatDisplayDate } from '@/shared/iso-date';
import { fail, ok, type Result } from '@/shared/result';
import { checkNewLog, exceedsDayWarning, spanMinutes } from '../domain/work-log-rules';
import type { KanbanDeps } from './ports';
import { catchAbort, logIssueMessages, ownerGuard, parseDateField, validationFailure } from './support';

/** Masukan pencatatan log. */
export interface AddWorkLogInput {
  readonly cardId: number;
  /** Tanggal `YYYY-MM-DD`. */
  readonly date: string;
  /** Jam `HH:MM`. */
  readonly start: string;
  readonly end: string;
  /** Step dari master aktif tahapan kartu (kartu project); kosong untuk kartu activity. */
  readonly stepName: string;
  readonly description: string;
}

/** Hasil pencatatan log. */
export interface AddWorkLogResult {
  readonly logId: number;
  /** Total waktu PIC pada tanggal itu setelah log ini, dalam menit. */
  readonly dayMinutes: number;
  /** True bila total hari itu melebihi 8 jam (peringatan, tidak memblokir). */
  readonly overDay: boolean;
}

/**
 * Menulis menit sebagai "n jam m menit" untuk jejak audit.
 * Masukan: menit. Keluaran: teks.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-07.
 */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} jam${rest > 0 ? ` ${rest} menit` : ''}`;
}

/**
 * Mencatat log pada kartu milik PIC (kolom mana pun, selain dibatalkan). Kartu project wajib memilih step aktif tahapan
 * kartu dan nama step disimpan pada log; kartu activity tanpa step. Peringatan bila total waktu PIC pada hari itu
 * melebihi 8 jam.
 * Masukan: dependensi, pelaku, dan `AddWorkLogInput`. Keluaran: id log, total hari, dan penanda peringatan; atau
 * FORBIDDEN, NOT_FOUND, VALIDATION (`date`, `time`, `description`, `step`).
 * Efek samping: satu transaksi: INSERT log dan audit.
 * Rujukan: FR-18-01 butir 1 sampai 8, BL-28, CL-005; AC: log 09:00-11:00 dan 10:00-12:00 pada tanggal sama ditolak.
 */
export async function addWorkLog(deps: KanbanDeps, actor: Actor, input: AddWorkLogInput): Promise<Result<AddWorkLogResult>> {
  const card = await deps.queries.findCard(input.cardId);
  if (!card) return fail({ code: 'NOT_FOUND', message: MESSAGES.CARD_NOT_FOUND });
  const forbidden = ownerGuard(actor, card);
  if (forbidden) return fail(forbidden);
  if (card.cancelledAt !== null) return fail({ code: 'VALIDATION', message: MESSAGES.LOG_ON_CANCELLED });

  const isProjectCard = card.kind === 'PROJECT' && card.stage !== null;
  const activeSteps = isProjectCard && card.stage ? (await deps.reference.listActiveSteps(card.stage)).map((s) => s.name) : [];
  const date = parseDateField(input.date);
  const stepName = input.stepName.trim();

  return catchAbort(() =>
    deps.transactor.run(async (tx) => {
      const spans = date ? await deps.cards.daySpans(tx, card.ownerPicId, date) : [];
      const check = checkNewLog({
        date,
        start: input.start,
        end: input.end,
        description: input.description,
        stepName: stepName === '' ? null : stepName,
        isProjectCard,
        activeSteps,
        today: deps.clock.today(),
        sameDaySpans: spans,
      });
      if (check.issues.length > 0 || !date || !check.span) return validationFailure(logIssueMessages(check.issues));

      const existingMinutes = spans.reduce((sum, span) => sum + spanMinutes(span), 0);
      const minutes = spanMinutes(check.span);
      const logId = await deps.cards.insertLog(tx, {
        cardId: card.id,
        ownerPicId: card.ownerPicId,
        workDate: date,
        span: check.span,
        stepName: isProjectCard ? stepName : null,
        description: input.description.trim(),
      });
      await deps.writeAudit(tx, {
        actorUserId: actor.userId,
        actorLabel: actor.label,
        category: 'CARD',
        action: 'worklog.added',
        projectCode: card.projectCode,
        entityType: 'work_log',
        entityId: String(logId),
        summary: `${card.code}: log ${formatMinutes(minutes)} pada ${formatDisplayDate(date)} dicatat oleh ${actor.label}`.slice(0, 300),
        changes: [
          { field: 'Waktu', old: '', new: `${input.start} - ${input.end}` },
          ...(isProjectCard ? [{ field: 'Step', old: '', new: stepName }] : []),
          { field: 'Uraian', old: '', new: input.description.trim() },
        ],
      });
      return ok({ logId, dayMinutes: existingMinutes + minutes, overDay: exceedsDayWarning(existingMinutes, minutes) });
    }),
  );
}

/**
 * Menghapus log milik PIC pemilik kartu (log tidak dapat diubah). Kartu yang dibatalkan tidak menerima penghapusan
 * agar jam tercatatnya tetap utuh.
 * Masukan: dependensi, pelaku, dan id log. Keluaran: berhasil; atau FORBIDDEN, NOT_FOUND, VALIDATION.
 * Efek samping: satu transaksi: DELETE log dan audit.
 * Rujukan: FR-18-01 butir 4 dan 7, BL-30, CR-001.
 */
export async function deleteWorkLog(deps: KanbanDeps, actor: Actor, input: { logId: number }): Promise<Result<null>> {
  return deps.transactor.run(async (tx) => {
    const log = await deps.cards.findLog(tx, input.logId);
    if (!log) return fail({ code: 'NOT_FOUND', message: MESSAGES.LOG_NOT_FOUND });
    const card = await deps.queries.findCard(log.cardId);
    if (!card) return fail({ code: 'NOT_FOUND', message: MESSAGES.CARD_NOT_FOUND });
    const forbidden = ownerGuard(actor, card);
    if (forbidden) return fail(forbidden);
    if (card.cancelledAt !== null) return fail({ code: 'VALIDATION', message: MESSAGES.LOG_ON_CANCELLED });
    await deps.cards.deleteLog(tx, log.id);
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'CARD',
      action: 'worklog.deleted',
      projectCode: card.projectCode,
      entityType: 'work_log',
      entityId: String(log.id),
      summary: `${card.code}: log ${formatDisplayDate(log.workDate)} dihapus oleh ${actor.label}`.slice(0, 300),
      changes: [{ field: 'Uraian', old: log.description, new: '' }],
    });
    return ok(null);
  });
}
