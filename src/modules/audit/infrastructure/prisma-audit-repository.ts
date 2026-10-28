/**
 * Implementasi Prisma untuk jejak audit. Hanya INSERT dan SELECT (TD-09).
 */
import type { PrismaClient } from '@/generated/prisma/client';
import type { TxContext } from '@/shared/transaction';
import type { AuditCategory, AuditChange, AuditEventInput, AuditEventRow, AuditQuery, AuditRepository } from '../application/ports';

/** Klien Prisma atau transaksi Prisma (keduanya menyediakan delegasi model yang sama). */
type Db = Pick<PrismaClient, 'audit_event'>;

/**
 * Membuat repository audit di atas klien Prisma.
 * Masukan: klien Prisma. Keluaran: `AuditRepository`.
 * Efek samping: tidak ada pada pembuatan; metode yang dikembalikan menulis atau membaca `audit_event`.
 * Rujukan: Technical Design §6.1, database-design §7.
 */
export function createPrismaAuditRepository(prisma: PrismaClient): AuditRepository {
  return {
    /**
     * Menambah satu peristiwa. Memakai transaksi pemanggil bila ada.
     * Masukan: transaksi atau null, peristiwa. Keluaran: janji selesai.
     * Efek samping: INSERT satu baris `audit_event`.
     * Rujukan: BL-07, NFR-04.
     */
    async append(tx: TxContext | null, event: AuditEventInput): Promise<void> {
      const db = (tx as unknown as Db | null) ?? prisma;
      await db.audit_event.create({
        data: {
          actor_user_id: event.actorUserId === null ? null : BigInt(event.actorUserId),
          actor_label: event.actorLabel,
          category: event.category,
          action: event.action,
          project_code: event.projectCode ?? null,
          entity_type: event.entityType,
          entity_id: event.entityId ?? null,
          summary: event.summary,
          changes: (event.changes ?? []) as unknown as object,
        },
      });
    },

    /**
     * Daftar pelaku yang pernah tercatat (akun saja), terurut menurut nama.
     * Masukan: tidak ada. Keluaran: id akun dan nama.
     * Efek samping: tidak ada (hanya baca).
     * Rujukan: FR-09-01 butir 3.
     */
    async listActors() {
      const rows = await prisma.audit_event.findMany({ where: { actor_user_id: { not: null } }, distinct: ['actor_user_id'], select: { actor_user_id: true, actor_label: true }, orderBy: { actor_label: 'asc' } });
      return rows.map((row) => ({ userId: Number(row.actor_user_id), label: row.actor_label }));
    },

    /**
     * Membaca jejak terbaru di atas dengan saringan dan halaman di server.
     * Masukan: saringan jenis dan pelaku, halaman, ukuran halaman. Keluaran: baris dan total.
     * Efek samping: tidak ada (hanya baca).
     * Rujukan: FR-09-01, FR-15-01.
     */
    async list(query: AuditQuery): Promise<{ rows: AuditEventRow[]; total: number }> {
      const where = {
        ...(query.category ? { category: query.category } : {}),
        ...(query.actorUserId !== undefined ? { actor_user_id: BigInt(query.actorUserId) } : {}),
      };
      const [total, records] = await Promise.all([
        prisma.audit_event.count({ where }),
        prisma.audit_event.findMany({
          where,
          orderBy: { id: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ]);
      const rows: AuditEventRow[] = records.map((record) => ({
        id: Number(record.id),
        occurredAt: record.occurred_at,
        actorLabel: record.actor_label,
        category: record.category as AuditCategory,
        action: record.action,
        projectCode: record.project_code,
        entityType: record.entity_type,
        entityId: record.entity_id,
        summary: record.summary,
        changes: record.changes as unknown as AuditChange[],
      }));
      return { rows, total };
    },
  };
}
