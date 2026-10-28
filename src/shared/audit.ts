/**
 * Bentuk peristiwa jejak audit yang dipakai bersama semua modul.
 *
 * Disimpan di `shared` agar modul auth dan master dapat mencatat audit tanpa bergantung pada modul
 * audit (menghindari siklus dependensi, Technical Design §5.2). Modul audit mengimplementasikan penulisnya.
 */
import type { TxContext } from './transaction';

/** Jenis peristiwa untuk saringan Jejak Perubahan (FR-09-01 butir 3). */
export type AuditCategory = 'PROJECT' | 'CARD' | 'MASTER' | 'ACCOUNT' | 'SECURITY';

/** Satu perubahan field: nilai lama dan baru (teks). Tidak pernah memuat password atau token. */
export interface AuditChange {
  readonly field: string;
  readonly old: string;
  readonly new: string;
}

/** Peristiwa yang akan dicatat. */
export interface AuditEventInput {
  /** Id akun pelaku; null bila pelaku tidak dikenal (mis. login username tak dikenal). */
  readonly actorUserId: number | null;
  /** Nama pelaku saat itu. */
  readonly actorLabel: string;
  readonly category: AuditCategory;
  /** Kode aksi, mis. `master.created`, `account.password_reset`. */
  readonly action: string;
  readonly projectCode?: string | null;
  readonly entityType: string;
  readonly entityId?: string | null;
  /** Ringkasan terbaca (maksimum 300 karakter). */
  readonly summary: string;
  readonly changes?: ReadonlyArray<AuditChange>;
}

/** Fungsi penulis audit yang disuntikkan ke use case; `tx` null berarti transaksi kecil sendiri. */
export type AuditWriter = (tx: TxContext | null, event: AuditEventInput) => Promise<void>;
