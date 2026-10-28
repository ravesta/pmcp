import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import type { ProjectLogPage } from '@/modules/kanban';
import { formatDisplayDate } from '@/shared/iso-date';
import { PaginationBar } from '@/ui/components/pagination-bar';
import { PlainSelect } from '@/ui/components/plain-field';
import { formatClock, formatDuration } from '@/ui/format/kanban-labels';
import { STAGE_FULL_TEXT } from '@/ui/format/project-labels';
import styles from './detail.module.css';

/** Properti bagian Log activity pada detail project. */
interface ProjectLogsProps {
  readonly page: ProjectLogPage;
  readonly pageNumber: number;
  readonly pageSize: number;
  /** Filter yang sedang dipilih (kosong = semua). */
  readonly stage: string;
  readonly picId: string;
  /** Alamat halaman ini (tanpa parameter log) sebagai tujuan formulir filter. */
  readonly baseHref: string;
  /** Pembuat alamat untuk nomor halaman log. */
  readonly hrefFor: (page: number) => string;
}

/**
 * Log activity seluruh kartu sebuah project: ringkasan total waktu per tahapan dan per PIC (seluruh project), filter
 * tahapan dan PIC, tabel log berhalaman (tanggal, waktu, durasi, PIC, tahapan, step, uraian). Hanya baca.
 * Masukan: halaman log, nomor halaman, ukuran, filter terpilih, alamat dasar, dan pembuat alamat halaman. Keluaran: bagian log.
 * Efek samping: tidak ada (komponen murni; filter lewat formulir GET).
 * Rujukan: FR-20-01; AC: filter PIC Rina hanya menampilkan log Rina dan ringkasan project tidak berubah.
 */
export function ProjectLogs({ page, pageNumber, pageSize, stage, picId, baseHref, hrefFor }: ProjectLogsProps) {
  return (
    <>
      {page.totalMinutes > 0 ? (
        <div className={styles.small}>
          <b>Total {formatDuration(page.totalMinutes)}</b>
          <span className={styles.muted}> · per tahapan: </span>{page.perStage.map((s) => `${s.stage} ${formatDuration(s.minutes)}`).join(', ')}
          <span className={styles.muted}> · per PIC: </span>{page.perPic.map((p) => `${p.name} ${formatDuration(p.minutes)}`).join(', ')}
        </div>
      ) : null}
      <Box component="form" method="get" action={baseHref} aria-label="Filter log" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'end' }}>
        <PlainSelect id="log-tahapan" name="lstage" label="Tahapan" defaultValue={stage} options={page.perStage.map((s) => ({ value: s.stage, label: STAGE_FULL_TEXT[s.stage] }))} />
        <PlainSelect id="log-pic" name="lpic" label="PIC" defaultValue={picId} options={page.perPic.map((p) => ({ value: String(p.picId), label: p.name }))} />
        <Button type="submit" variant="outlined" size="small">Terapkan</Button>
      </Box>
      {page.rows.length > 0 ? (
        <>
          <div className={styles.wrap}>
            <table className={styles.at} aria-label="Log activity project" style={{ minWidth: 720 }}>
              <thead><tr><th>Tanggal</th><th>Waktu</th><th>Durasi</th><th>PIC</th><th>Tahapan</th><th>Step</th><th>Uraian</th></tr></thead>
              <tbody>
                {page.rows.map((row) => (
                  <tr key={row.id}>
                    <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>{formatDisplayDate(row.workDate)}</td>
                    <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>{formatClock(row.span.start)}-{formatClock(row.span.end)}</td>
                    <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>{formatDuration(row.span.end - row.span.start)}</td>
                    <td className={styles.small}>{row.picName}</td>
                    <td className={styles.small}>{row.stage}</td>
                    <td className={styles.small}>{row.stepName ?? '-'}</td>
                    <td className={styles.small}>{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar page={pageNumber} pageSize={pageSize} total={page.total} pageSizeOptions={[5, 10, 20]} hrefFor={hrefFor} unit="log" sizeParam="lper" pageParam="lhal" defaultSize={10} />
        </>
      ) : (
        <div className={`${styles.muted} ${styles.small}`} style={{ padding: 16, textAlign: 'center' }}>Belum ada log activity pada project ini. Log dicatat PIC lewat kartu Kanban.</div>
      )}
    </>
  );
}
