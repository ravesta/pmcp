/**
 * Use case Master PIC dan akun PIC (FR-08-01, FR-01-05).
 * PIC dan akun login dikelola bersama karena satu langkah Manager (menambah PIC beserta akunnya).
 */
import { can, generateTemporaryPassword, isValidUsername, normalizeUsername, type Actor } from '@/modules/auth';
import { MESSAGES, maxLengthMessage } from '@/platform/messages';
import { fail, ok, type Result } from '@/shared/result';
import { checkPicInput, PIC_NAME_MAX } from '../domain/master-rules';
import type { MasterDeps, OpenAssignment, PicRow } from './ports';

/** Hasil pembuatan PIC: id, dan password sementara bila akun login dibuat (tampil sekali). */
export interface CreatePicResult {
  readonly picId: number;
  readonly username: string | null;
  readonly temporaryPassword: string | null;
}

/** Hasil reset password: password sementara (tampil sekali) beserta identitas PIC. */
export interface ResetPasswordResult {
  readonly picName: string;
  readonly username: string;
  readonly temporaryPassword: string;
}

/**
 * Menolak pelaku yang bukan Manager untuk pengelolaan akun.
 * Masukan: pelaku. Keluaran: hasil gagal FORBIDDEN, atau null bila diizinkan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-04, FR-08-01 butir 9.
 */
function denyUnlessManager(actor: Actor): Result<never> | null {
  return can(actor, 'account.manage') ? null : fail({ code: 'FORBIDDEN', message: MESSAGES.FORBIDDEN });
}

/**
 * Membaca daftar PIC beserta status akunnya (hanya Manager).
 * Masukan: dependensi dan pelaku. Keluaran: daftar PIC.
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: FR-08-01 butir 1.
 */
export async function listPics(deps: MasterDeps, actor: Actor): Promise<Result<PicRow[]>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  return ok(await deps.pics.list());
}

/**
 * Menambah PIC, dengan atau tanpa akun login.
 * Masukan: dependensi, pelaku, nama, tahapan, apakah memakai akun, dan username. Keluaran: id PIC dan, bila
 * akun dibuat, username serta password sementara (tampil sekali), atau galat VALIDATION per isian
 * (`name`, `stage`, `login`, `username`): PIC Development tidak boleh punya akun, username format salah atau
 * sudah dipakai (tanpa membedakan huruf besar kecil).
 * Efek samping: dalam satu transaksi INSERT PIC, INSERT akun (wajib ganti password), dan audit Akun tanpa
 * password. Password sementara tidak disimpan dalam bentuk dapat dibaca.
 * Rujukan: FR-08-01 butir 2 dan 3, FR-01-05 butir 1 sampai 3, EC-08-01.01, EC-08-01.02.
 */
export async function createPic(
  deps: MasterDeps,
  actor: Actor,
  input: { name: string; stage: string; withLogin: boolean; username?: string },
): Promise<Result<CreatePicResult>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;

  const check = checkPicInput(input);
  const fields: Record<string, string> = {};
  if (!check.ok) {
    if (check.fields.name === 'EMPTY') fields.name = MESSAGES.PIC_NAME_REQUIRED;
    if (check.fields.name === 'TOO_LONG') fields.name = maxLengthMessage('Nama', PIC_NAME_MAX);
    if (check.fields.stage) fields.stage = MESSAGES.PIC_STAGE_REQUIRED;
    if (check.fields.login) fields.login = MESSAGES.PIC_DEV_NO_LOGIN;
  }
  const username = normalizeUsername(input.username ?? '');
  if (input.withLogin && input.stage !== 'DEV' && !isValidUsername(username)) fields.username = MESSAGES.USERNAME_INVALID;
  if (Object.keys(fields).length > 0 || !check.ok) {
    return fail({ code: 'VALIDATION', message: Object.values(fields)[0] ?? MESSAGES.UNEXPECTED, fields });
  }

  const temporaryPassword = check.withLogin ? generateTemporaryPassword(deps.randomIndex) : null;
  const passwordHash = temporaryPassword ? await deps.hasher.hash(temporaryPassword) : null;
  const now = deps.clock.now();

  return deps.transactor.run(async (tx) => {
    if (check.withLogin && (await deps.pics.usernameExists(tx, username))) {
      return fail({ code: 'VALIDATION', message: MESSAGES.USERNAME_EXISTS, fields: { username: MESSAGES.USERNAME_EXISTS } });
    }
    const picId = await deps.pics.create(tx, { name: check.name, stage: check.stage });
    if (check.withLogin && passwordHash) await deps.pics.createAccount(tx, { picId, username, passwordHash, now });
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'ACCOUNT',
      action: 'pic.created',
      entityType: 'pic',
      entityId: String(picId),
      summary: check.withLogin
        ? `PIC "${check.name}" (${check.stage}) ditambahkan dengan akun ${username}`
        : `PIC "${check.name}" (${check.stage}) ditambahkan tanpa akun login`,
    });
    return ok({ picId, username: check.withLogin ? username : null, temporaryPassword });
  });
}

/**
 * Mengubah nama PIC (tahapan dan username tidak dapat diubah, FR-08-01 butir 4).
 * Masukan: dependensi, pelaku, id PIC, nama baru. Keluaran: berhasil, atau VALIDATION (kosong/terlalu panjang)
 * atau NOT_FOUND.
 * Efek samping: UPDATE nama dan satu peristiwa audit dengan nilai lama dan baru, dalam satu transaksi.
 * Rujukan: FR-08-01 butir 4, FR-08-02 butir b.
 */
export async function renamePic(deps: MasterDeps, actor: Actor, input: { picId: number; name: string }): Promise<Result<null>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  const name = input.name.trim();
  if (name.length === 0) return fail({ code: 'VALIDATION', message: MESSAGES.PIC_NAME_REQUIRED, fields: { name: MESSAGES.PIC_NAME_REQUIRED } });
  if ([...name].length > PIC_NAME_MAX) {
    const message = maxLengthMessage('Nama', PIC_NAME_MAX);
    return fail({ code: 'VALIDATION', message, fields: { name: message } });
  }
  return deps.transactor.run(async (tx) => {
    const pic = await deps.pics.findForUpdate(tx, input.picId);
    if (!pic) return fail({ code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND });
    if (pic.name === name) return ok(null);
    await deps.pics.rename(tx, pic.id, name);
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'ACCOUNT',
      action: 'pic.renamed',
      entityType: 'pic',
      entityId: String(pic.id),
      summary: `PIC "${pic.name}" diubah namanya menjadi "${name}"`,
      changes: [{ field: 'Nama', old: pic.name, new: name }],
    });
    return ok(null);
  });
}

/**
 * Mengaktifkan atau menonaktifkan PIC beserta akunnya.
 * Masukan: dependensi, pelaku, id PIC, status baru, dan `confirmed` (konfirmasi menonaktifkan PIC yang masih
 * bertugas). Keluaran: berhasil, atau BUSINESS_RULE `PIC_HAS_ASSIGNMENTS` dengan `details` daftar project
 * terdampak bila PIC masih menjadi PIC pada tahapan belum Selesai dan belum dikonfirmasi; penugasan TIDAK dilepas
 * otomatis.
 * Efek samping: UPDATE status PIC dan akun; saat dinonaktifkan semua sesi akun diakhiri; satu peristiwa audit.
 * Rujukan: FR-08-01 butir 5 sampai 7, EC-08-01.03, EC-08-01.05.
 */
export async function setPicActive(
  deps: MasterDeps,
  actor: Actor,
  input: { picId: number; active: boolean; confirmed?: boolean },
): Promise<Result<null>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;

  let assignments: OpenAssignment[] = [];
  if (!input.active) {
    assignments = await deps.pics.listOpenAssignments(input.picId);
    if (assignments.length > 0 && !input.confirmed) {
      return fail({ code: 'BUSINESS_RULE', rule: 'PIC_HAS_ASSIGNMENTS', message: MESSAGES.PIC_HAS_ASSIGNMENTS, details: assignments });
    }
  }
  const now = deps.clock.now();
  return deps.transactor.run(async (tx) => {
    const pic = await deps.pics.findForUpdate(tx, input.picId);
    if (!pic) return fail({ code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND });
    if (pic.isActive === input.active) return ok(null);
    const accountId = await deps.pics.setActive(tx, pic.id, input.active);
    if (!input.active && accountId !== null) await deps.auth.revokeUserSessions(tx, accountId, now);
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'ACCOUNT',
      action: input.active ? 'pic.activated' : 'pic.deactivated',
      entityType: 'pic',
      entityId: String(pic.id),
      summary: `PIC "${pic.name}" ${input.active ? 'diaktifkan' : 'dinonaktifkan'}${assignments.length > 0 ? ` (masih bertugas pada ${assignments.length} tahapan)` : ''}`,
    });
    return ok(null);
  });
}

/**
 * Mereset password akun PIC: membuat password sementara baru (tampil sekali).
 * Masukan: dependensi, pelaku, id PIC. Keluaran: nama, username, dan password sementara, atau NOT_FOUND, atau
 * BUSINESS_RULE bila PIC tidak punya akun login aktif.
 * Efek samping: dalam satu transaksi menyimpan hash baru dengan penanda wajib ganti, mengakhiri SEMUA sesi akun,
 * menghapus penundaan login, dan mencatat audit Akun tanpa password. Manager tidak pernah melihat password yang
 * sedang dipakai.
 * Rujukan: FR-01-05 butir 1 sampai 5, FR-08-01, EC-01-05.02.
 */
export async function resetPicPassword(deps: MasterDeps, actor: Actor, input: { picId: number }): Promise<Result<ResetPasswordResult>> {
  const denied = denyUnlessManager(actor);
  if (denied) return denied;
  const temporaryPassword = generateTemporaryPassword(deps.randomIndex);
  const passwordHash = await deps.hasher.hash(temporaryPassword);
  const now = deps.clock.now();

  return deps.transactor.run(async (tx) => {
    const pic = await deps.pics.findForUpdate(tx, input.picId);
    if (!pic) return fail({ code: 'NOT_FOUND', message: MESSAGES.NOT_FOUND });
    const accountId = await deps.pics.findAccountId(tx, pic.id);
    if (accountId === null || !pic.username) {
      return fail({ code: 'BUSINESS_RULE', rule: 'PIC_NO_LOGIN_ACCOUNT', message: MESSAGES.PIC_NO_LOGIN_ACCOUNT });
    }
    await deps.auth.updatePassword(tx, accountId, passwordHash, true, now);
    await deps.auth.revokeUserSessions(tx, accountId, now);
    await deps.auth.clearThrottle(tx, 'USER', pic.username);
    await deps.writeAudit(tx, {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      category: 'ACCOUNT',
      action: 'account.password_reset',
      entityType: 'app_user',
      entityId: String(accountId),
      summary: `Password ${pic.name} direset oleh ${actor.label}`,
    });
    return ok({ picName: pic.name, username: pic.username, temporaryPassword });
  });
}
