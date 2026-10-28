/**
 * Use case modul audit: mencatat dan membaca jejak perubahan.
 */
import type { Actor } from '@/modules/auth';
import { can } from '@/modules/auth';
import { MESSAGES } from '@/platform/messages';
import { fail, ok, type Result } from '@/shared/result';
import type { TxContext } from '@/shared/transaction';
import type { AuditEventInput, AuditEventRow, AuditQuery, AuditRepository } from './ports';

/** Batas panjang ringkasan pada database (varchar 300). */
const SUMMARY_MAX = 300;

/**
 * Mencatat satu peristiwa jejak audit. Ringkasan dipotong aman bila melebihi batas kolom.
 * Masukan: repository, transaksi (atau null untuk transaksi sendiri), dan peristiwa.
 * Keluaran: janji selesai.
 * Efek samping: INSERT satu baris `audit_event`; bila `tx` diberikan, ikut atomik dengan perubahan
 * bisnis (semua atau tidak sama sekali).
 * Rujukan: BL-07, NFR-04, TD-09.
 */
export async function recordAudit(
  repository: AuditRepository,
  tx: TxContext | null,
  event: AuditEventInput,
): Promise<void> {
  const summary = event.summary.length > SUMMARY_MAX ? `${event.summary.slice(0, SUMMARY_MAX - 1)}…` : event.summary;
  await repository.append(tx, { ...event, summary });
}

/**
 * Membaca daftar pelaku untuk saringan Jejak Perubahan (hanya Manager).
 * Masukan: repository dan pelaku. Keluaran: daftar pelaku, atau FORBIDDEN.
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: FR-09-01 butir 3.
 */
export async function listAuditActors(repository: AuditRepository, actor: Actor): Promise<Result<Array<{ userId: number; label: string }>>> {
  if (!can(actor, 'audit.view')) return fail({ code: 'FORBIDDEN', message: MESSAGES.FORBIDDEN });
  return ok(await repository.listActors());
}

/** Ukuran halaman yang diizinkan untuk Jejak Perubahan (FR-09-01 butir 3). */
const ALLOWED_PAGE_SIZES: ReadonlyArray<number> = [10, 20, 50];

/**
 * Membaca daftar Jejak Perubahan untuk Manager (FR-09-01).
 * Masukan: pelaku, saringan jenis dan pelaku, halaman dan ukuran halaman. Keluaran: baris dan total.
 * Efek samping: tidak ada (hanya baca). Pelaku selain Manager ditolak (FORBIDDEN).
 * Rujukan: FR-09-01, FR-15-01 (paging di server), FR-01-04.
 */
export async function listAuditEvents(
  repository: AuditRepository,
  actor: Actor,
  query: AuditQuery,
): Promise<Result<{ rows: AuditEventRow[]; total: number; page: number; pageSize: number }>> {
  if (!can(actor, 'audit.view')) return fail({ code: 'FORBIDDEN', message: MESSAGES.FORBIDDEN });
  const pageSize = ALLOWED_PAGE_SIZES.includes(query.pageSize) ? query.pageSize : 10;
  const page = Math.max(1, Math.floor(query.page) || 1);
  const result = await repository.list({ ...query, page, pageSize });
  return ok({ ...result, page, pageSize });
}
