/**
 * Use case master pilihan (Aplikasi, Kategori Alasan Revisi, Kategori Activity, Alasan Jadwal Ulang, Step)
 * dan pengaturan ambang peringatan. Aturan umum FR-08-02 berlaku untuk semuanya.
 */
import { can, type Actor } from '@/modules/auth';
import { MESSAGES, maxLengthMessage } from '@/platform/messages';
import { fail, ok, type Result } from '@/shared/result';
import { checkMasterName, isValidThreshold, MASTER_RULES, type MasterKind } from '../domain/master-rules';
import type { MasterDeps, MasterItem, ThresholdKey } from './ports';

/**
 * Menolak pelaku yang bukan Manager.
 * Masukan: pelaku. Keluaran: hasil gagal FORBIDDEN, atau null bila diizinkan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-04, FR-08-02 butir g.
 */
function denyUnlessManager(actor: Actor): Result<never> | null {
  return can(actor, 'master.manage') ? null : fail({ code: 'FORBIDDEN', message: MESSAGES.FORBIDDEN });
}

/**
 * Membaca daftar item sebuah master (hanya Manager).
 * Masukan: dependensi, pelaku, jenis master, dan tahapan (khusus step). Keluaran: daftar item dengan
 * jumlah pemakaian ("Dipakai"); step terurut menurut urutan.
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: FR-08-02 butir e, FR-19-01.
 */
export async function listMaster(deps: MasterDeps, actor: Actor, kind: MasterKind, stage?: 'BA' | 'QA'): Promise<Result<MasterItem[]>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  return ok(await deps.masters.list(kind, stage));
}

/**
 * Menambah item master.
 * Masukan: dependensi, pelaku, jenis, nama, dan tahapan (wajib untuk step). Keluaran: id item baru, atau
 * galat VALIDATION (kosong, melebihi panjang, nama sudah ada tanpa membedakan huruf besar kecil).
 * Efek samping: INSERT item dan satu peristiwa audit Master, dalam satu transaksi. Dua penambahan nama sama
 * serentak: satu berhasil, satu ditolak "Nama itu sudah ada." (EC-08-02.06).
 * Rujukan: FR-08-02 butir a dan f, FR-19-01, EC-08-02.01 sampai EC-08-02.03.
 */
export async function addMasterItem(
  deps: MasterDeps,
  actor: Actor,
  input: { kind: MasterKind; name: string; stage?: 'BA' | 'QA' },
): Promise<Result<{ id: number }>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  const stage = input.kind === 'stage_step' ? (input.stage ?? null) : null;
  if (input.kind === 'stage_step' && stage === null) {
    return fail({ code: 'VALIDATION', message: MESSAGES.PIC_STAGE_REQUIRED, fields: { stage: MESSAGES.PIC_STAGE_REQUIRED } });
  }
  const check = checkMasterName(input.kind, input.name);
  if (!check.ok) return nameFailure(input.kind, check.reason);
  const rule = MASTER_RULES[input.kind];

  return deps.transactor.run(async (tx) => {
    if (await deps.masters.nameExists(tx, input.kind, check.name, stage)) {
      return fail({ code: 'VALIDATION', message: MESSAGES.NAME_EXISTS, fields: { name: MESSAGES.NAME_EXISTS } });
    }
    const id = await deps.masters.add(tx, input.kind, check.name, stage);
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'MASTER',
      action: 'master.created',
      entityType: input.kind,
      entityId: String(id),
      summary: `${rule.label}: "${check.name}" ditambahkan`,
    });
    return ok({ id });
  });
}

/**
 * Membangun galat nama kosong atau terlalu panjang.
 * Masukan: jenis master dan alasan. Keluaran: hasil gagal VALIDATION dengan isian `name`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: EC-08-02.01, EC-08-02.03.
 */
function nameFailure(kind: MasterKind, reason: 'EMPTY' | 'TOO_LONG'): Result<never> {
  const message = reason === 'EMPTY' ? MESSAGES.NAME_REQUIRED : maxLengthMessage('Nama', MASTER_RULES[kind].maxLength);
  return fail({ code: 'VALIDATION', message, fields: { name: message } });
}

/**
 * Mengubah nama item master.
 * Masukan: dependensi, pelaku, jenis, id item, nama baru. Keluaran: berhasil, atau galat VALIDATION,
 * NOT_FOUND, atau BUSINESS_RULE (kategori bawaan sistem terkunci).
 * Efek samping: UPDATE nama dan satu peristiwa audit dengan nilai lama dan baru, dalam satu transaksi.
 * Nama yang sudah tersimpan pada data transaksi lama tidak ikut berubah (disimpan di transaksi).
 * Rujukan: FR-08-02 butir b, FR-08-03 butir 3, EC-08-02.02.
 */
export async function renameMasterItem(
  deps: MasterDeps,
  actor: Actor,
  input: { kind: MasterKind; id: number; name: string },
): Promise<Result<null>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  const check = checkMasterName(input.kind, input.name);
  if (!check.ok) return nameFailure(input.kind, check.reason);
  const rule = MASTER_RULES[input.kind];

  return deps.transactor.run(async (tx) => {
    const item = await deps.masters.findForUpdate(tx, input.kind, input.id);
    if (!item) return fail({ code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND });
    if (item.systemKey) return fail({ code: 'BUSINESS_RULE', rule: 'MASTER_LOCKED', message: MESSAGES.MASTER_LOCKED });
    if (item.name === check.name) return ok(null);
    if (await deps.masters.nameExists(tx, input.kind, check.name, item.stage, item.id)) {
      return fail({ code: 'VALIDATION', message: MESSAGES.NAME_EXISTS, fields: { name: MESSAGES.NAME_EXISTS } });
    }
    await deps.masters.rename(tx, input.kind, item.id, check.name);
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'MASTER',
      action: 'master.renamed',
      entityType: input.kind,
      entityId: String(item.id),
      summary: `${rule.label}: "${item.name}" diubah menjadi "${check.name}"`,
      changes: [{ field: 'Nama', old: item.name, new: check.name }],
    });
    return ok(null);
  });
}

/**
 * Mengaktifkan atau menonaktifkan item master (tidak ada hapus permanen, BL-10).
 * Masukan: dependensi, pelaku, jenis, id, status baru. Keluaran: berhasil, atau galat NOT_FOUND, atau
 * BUSINESS_RULE: kategori bawaan terkunci, atau "Minimal satu pilihan harus aktif." bila item aktif terakhir.
 * Efek samping: UPDATE status dan satu peristiwa audit; baris sejenis dikunci agar dua penonaktifan serentak
 * tidak melewati batas minimum (EC-08-02.06).
 * Rujukan: FR-08-02 butir c, d, e; FR-08-03 butir 3; EC-08-02.04.
 */
export async function setMasterItemActive(
  deps: MasterDeps,
  actor: Actor,
  input: { kind: MasterKind; id: number; active: boolean },
): Promise<Result<null>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  const rule = MASTER_RULES[input.kind];

  return deps.transactor.run(async (tx) => {
    const item = await deps.masters.findForUpdate(tx, input.kind, input.id);
    if (!item) return fail({ code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND });
    if (item.isActive === input.active) return ok(null);
    if (item.systemKey) return fail({ code: 'BUSINESS_RULE', rule: 'MASTER_LOCKED', message: MESSAGES.MASTER_LOCKED });
    if (!input.active && rule.requiresOneActive) {
      const activeCount = await deps.masters.countActiveForUpdate(tx, input.kind, item.stage);
      if (activeCount <= 1) {
        return fail({ code: 'BUSINESS_RULE', rule: 'AT_LEAST_ONE_ACTIVE', message: MESSAGES.AT_LEAST_ONE_ACTIVE });
      }
    }
    await deps.masters.setActive(tx, input.kind, item.id, input.active);
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'MASTER',
      action: input.active ? 'master.activated' : 'master.deactivated',
      entityType: input.kind,
      entityId: String(item.id),
      summary: `${rule.label}: "${item.name}" ${input.active ? 'diaktifkan' : 'dinonaktifkan'}`,
    });
    return ok(null);
  });
}

/**
 * Menaikkan atau menurunkan urutan sebuah step.
 * Masukan: dependensi, pelaku, id step, arah. Keluaran: berhasil (tanpa perubahan bila sudah di ujung), atau
 * galat NOT_FOUND.
 * Efek samping: menukar urutan dengan tetangga dan mencatat satu peristiwa audit, dalam satu transaksi.
 * Rujukan: FR-19-01 butir 3, EC-19-01.03.
 */
export async function moveStep(deps: MasterDeps, actor: Actor, input: { id: number; direction: 'up' | 'down' }): Promise<Result<null>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  return deps.transactor.run(async (tx) => {
    const item = await deps.masters.findForUpdate(tx, 'stage_step', input.id);
    if (!item) return fail({ code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND });
    const moved = await deps.masters.swapOrder(tx, item.id, input.direction);
    if (moved) {
      await deps.writeAudit(tx, {
        actorUserId: actor.userId,
        actorLabel: actor.label,
        category: 'MASTER',
        action: 'master.reordered',
        entityType: 'stage_step',
        entityId: String(item.id),
        summary: `${MASTER_RULES.stage_step.label}: urutan "${item.name}" ${input.direction === 'up' ? 'dinaikkan' : 'diturunkan'}`,
      });
    }
    return ok(null);
  });
}

/**
 * Membaca ambang peringatan revisi dan jadwal ulang.
 * Masukan: dependensi dan pelaku. Keluaran: kedua ambang (1 sampai 20).
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: FR-08-03 butir 4, FR-08-05 butir 3.
 */
export async function getThresholds(deps: MasterDeps, actor: Actor): Promise<Result<{ revision: number; reschedule: number }>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  const [revision, reschedule] = await Promise.all([
    deps.masters.getThreshold('revision_warn_threshold'),
    deps.masters.getThreshold('reschedule_warn_threshold'),
  ]);
  return ok({ revision, reschedule });
}

/**
 * Mengubah ambang peringatan revisi atau jadwal ulang.
 * Masukan: dependensi, pelaku, kunci ambang, nilai. Keluaran: berhasil, atau VALIDATION bila bukan bilangan
 * bulat 1 sampai 20.
 * Efek samping: UPDATE pengaturan dan satu peristiwa audit dengan nilai lama dan baru (hanya bila berubah).
 * Rujukan: FR-08-03 butir 4, FR-08-05 butir 3, EC-08-03.01, EC-08-03.02.
 */
export async function setThreshold(
  deps: MasterDeps,
  actor: Actor,
  input: { key: ThresholdKey; value: number },
): Promise<Result<null>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  if (!isValidThreshold(input.value)) {
    return fail({ code: 'VALIDATION', message: MESSAGES.THRESHOLD_RANGE, fields: { value: MESSAGES.THRESHOLD_RANGE } });
  }
  return deps.transactor.run(async (tx) => {
    const previous = await deps.masters.getThreshold(input.key);
    if (previous === input.value) return ok(null);
    await deps.masters.setThreshold(tx, input.key, input.value);
    const label = input.key === 'revision_warn_threshold' ? 'batas peringatan revisi estimasi' : 'batas peringatan jadwal ulang kartu';
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'MASTER',
      action: 'setting.changed',
      entityType: 'app_setting',
      entityId: input.key,
      summary: `Pengaturan: ${label} diubah ${previous}× -> ${input.value}×`,
      changes: [{ field: label, old: String(previous), new: String(input.value) }],
    });
    return ok(null);
  });
}
