/**
 * Port dan bentuk data modul audit (jejak perubahan append-only, BL-07, NFR-04).
 */
import type { AuditCategory, AuditChange, AuditEventInput } from '@/shared/audit';
import type { TxContext } from '@/shared/transaction';

export type { AuditCategory, AuditChange, AuditEventInput } from '@/shared/audit';

/** Satu baris jejak yang dibaca kembali. */
export interface AuditEventRow {
  readonly id: number;
  readonly occurredAt: Date;
  readonly actorLabel: string;
  readonly category: AuditCategory;
  readonly action: string;
  readonly projectCode: string | null;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly summary: string;
  readonly changes: ReadonlyArray<AuditChange>;
}

/** Saringan dan halaman untuk daftar jejak. */
export interface AuditQuery {
  readonly category?: AuditCategory;
  readonly actorUserId?: number;
  /** Hanya peristiwa project tertentu (riwayat perubahan di Detail Project, FR-11-01). */
  readonly projectCode?: string;
  readonly page: number;
  readonly pageSize: number;
}

/** Akses data jejak audit. Hanya INSERT dan SELECT; tidak pernah UPDATE atau DELETE (TD-09). */
export interface AuditRepository {
  /** Menambah peristiwa; di dalam transaksi bila `tx` diberikan, selain itu transaksi kecil sendiri. */
  append(tx: TxContext | null, event: AuditEventInput): Promise<void>;
  /** Membaca daftar jejak, terbaru di atas, berhalaman di server (FR-15-01). */
  list(query: AuditQuery): Promise<{ rows: AuditEventRow[]; total: number }>;
  /** Daftar pelaku (akun) yang pernah tercatat, untuk saringan Pelaku. */
  listActors(): Promise<Array<{ userId: number; label: string }>>;
}
