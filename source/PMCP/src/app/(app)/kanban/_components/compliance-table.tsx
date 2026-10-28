import type { ComplianceView } from '@/modules/kanban';
import { formatDisplayDate } from '@/shared/iso-date';
import styles from './kanban.module.css';

/** Properti tabel kepatuhan rencana. */
interface ComplianceTableProps {
  readonly view: ComplianceView;
  /** Id PIC pelaku untuk menyorot barisnya; null untuk Manager. */
  readonly myPicId: number | null;
}

/**
 * Tabel kepatuhan rencana per PIC pada periode papan, terlihat semua pengguna: Direncanakan, Selesai tepat waktu,
 * Selesai terlambat, Lewat belum selesai, Belum jatuh tempo, Jadwal ulang, Dadakan, dan Kepatuhan (atau "-" bila belum
 * ada kartu jatuh tempo). Baris PIC tanpa rencana maupun dadakan tidak tampil.
 * Masukan: tampilan kepatuhan dan id PIC pelaku. Keluaran: bagian yang dapat dilipat berisi tabel.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-21-05, BL-34, mockup v0.2 (details.kstat).
 */
export function ComplianceTable({ view, myPicId }: ComplianceTableProps) {
  return (
    <details className={styles.details} open>
      <summary><b>Kepatuhan rencana</b> <span className={`${styles.muted} ${styles.small}`}>{formatDisplayDate(view.range.start)} - {formatDisplayDate(view.range.end)}, terlihat semua orang</span></summary>
      {view.rows.length > 0 ? (
        <>
          <div className={styles.wrap}>
            <table className={styles.table} aria-label="Kepatuhan rencana per PIC" style={{ minWidth: 720 }}>
              <thead>
                <tr><th>PIC</th><th>Direncanakan</th><th>Selesai tepat waktu</th><th>Selesai terlambat</th><th>Lewat, belum selesai</th><th>Belum jatuh tempo</th><th>Jadwal ulang</th><th>Dadakan</th><th>Kepatuhan</th></tr>
              </thead>
              <tbody>
                {view.rows.map((row) => (
                  <tr key={row.picId} className={row.picId === myPicId ? styles.mine : ''}>
                    <td>{row.name}{row.picId === myPicId ? <span className={`${styles.muted} ${styles.small}`}> (saya)</span> : null}</td>
                    <td className={styles.mono}>{row.planned}</td>
                    <td className={styles.mono}>{row.onTime}</td>
                    <td className={styles.mono}>{row.late}</td>
                    <td className={styles.mono}>{row.overdueOpen}</td>
                    <td className={styles.mono}>{row.notDue}</td>
                    <td className={styles.mono}>{row.rescheduled}</td>
                    <td className={styles.mono}>{row.adhoc}</td>
                    <td><b>{row.percent === null ? '-' : `${row.percent}%`}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.hint}>Kepatuhan = selesai tepat waktu ÷ rencana yang sudah jatuh tempo pada periode ini. Pekerjaan dadakan tidak masuk penyebut. &quot;Lewat, belum selesai&quot; dan &quot;Selesai terlambat&quot; dihitung tidak tepat waktu.</p>
        </>
      ) : (
        <div className={`${styles.muted} ${styles.small}`} style={{ padding: '6px 0' }}>Belum ada rencana pada periode ini.</div>
      )}
    </details>
  );
}
