import type { AuditEventRow } from '@/modules/audit';
import { formatDateTime } from '@/shared/format';
import { PaginationBar } from '@/ui/components/pagination-bar';
import styles from './detail.module.css';

/** Properti riwayat perubahan project. */
interface ProjectHistoryProps {
  readonly rows: ReadonlyArray<AuditEventRow>;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hrefFor: (page: number) => string;
}

/**
 * Riwayat perubahan sebuah project (terbaru di atas): waktu server, pelaku, ringkasan, dan nilai lama dan baru setiap
 * field yang berubah, seperti tabel Jejak Perubahan pada mockup. Berhalaman di server.
 * Masukan: baris jejak, halaman, ukuran, total, dan pembuat alamat. Keluaran: tabel dan pagination, atau kalimat kosong.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-11-01 butir 2, BL-07, NFR-04, FR-15-01, mockup v0.2 (fungsi auditTable).
 */
export function ProjectHistory({ rows, page, pageSize, total, hrefFor }: ProjectHistoryProps) {
  if (rows.length === 0) return <div className={`${styles.muted} ${styles.small}`}>Belum ada perubahan tercatat pada project ini.</div>;
  return (
    <>
      <div className={styles.wrap}>
        <table className={styles.at} aria-label="Riwayat perubahan project">
          <thead><tr><th>Waktu</th><th>Oleh</th><th>Perubahan</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.occurredAt)}</td>
                <td className={styles.small}>{row.actorLabel}</td>
                <td className={styles.small}>
                  <div>{row.summary}</div>
                  {row.changes.length > 0 ? (
                    <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                      {row.changes.map((change) => <li key={change.field}><b>{change.field}</b>: {change.old === '' ? '-' : change.old} → {change.new === '' ? '-' : change.new}</li>)}
                    </ul>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={page} pageSize={pageSize} total={total} pageSizeOptions={[pageSize]} hrefFor={hrefFor} unit="catatan" />
    </>
  );
}
