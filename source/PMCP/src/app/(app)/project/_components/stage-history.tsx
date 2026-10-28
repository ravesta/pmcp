import type { RevisionRow, StageView } from '@/modules/project';
import { formatDateTime } from '@/shared/format';
import { formatDateOrDash, formatRange } from '@/ui/format/project-labels';
import styles from './detail.module.css';

/** Properti riwayat estimasi dan penahanan. */
interface StageHistoryProps {
  readonly stages: ReadonlyArray<StageView>;
  readonly revisions: ReadonlyMap<number, ReadonlyArray<RevisionRow>>;
}

/** Satu baris riwayat. */
interface HistoryRow {
  readonly key: string;
  readonly stage: string;
  readonly kind: string;
  readonly detail: string;
  readonly reason: string;
  readonly by: string;
  readonly at: string;
}

/**
 * Menyusun baris riwayat seluruh tahapan: estimasi awal, periode hold (selesai dan berlangsung), dan revisi bernomor
 * dengan kategori, catatan, kartu asal, pelaku, dan waktu.
 * Masukan: tahapan dan revisi per id tahapan. Keluaran: baris riwayat berurutan menurut tahapan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-11-01 butir 2, FR-13-01, FR-13-02 butir 3, FR-13-05 butir 2, mockup v0.2 (fungsi estHistory).
 */
function buildRows(stages: ReadonlyArray<StageView>, revisions: ReadonlyMap<number, ReadonlyArray<RevisionRow>>): HistoryRow[] {
  return stages.flatMap((stage) => {
    const rows: HistoryRow[] = [];
    if (stage.baseline) rows.push({ key: `${stage.stageId}-awal`, stage: stage.kind, kind: 'Estimasi awal', detail: formatRange(stage.baseline), reason: '-', by: '-', at: '-' });
    stage.holdHistory.forEach((hold, index) =>
      rows.push({ key: `${stage.stageId}-hold-${index}`, stage: stage.kind, kind: 'Ditahan', detail: `sejak ${formatDateOrDash(hold.since)} s.d. ${formatDateOrDash(hold.resumedOn)}`, reason: hold.reason, by: '-', at: '-' }),
    );
    if (stage.status === 'HELD' && stage.holdSince) {
      rows.push({ key: `${stage.stageId}-hold-now`, stage: stage.kind, kind: 'Ditahan (berlangsung)', detail: `sejak ${formatDateOrDash(stage.holdSince)}`, reason: stage.holdReason ?? '-', by: '-', at: '-' });
    }
    for (const revision of revisions.get(stage.stageId) ?? []) {
      rows.push({
        key: `${stage.stageId}-rev-${revision.seq}`,
        stage: stage.kind,
        kind: `Revisi ${revision.seq}`,
        detail: `${formatRange(revision.previous)} → ${formatRange(revision.next)}`,
        reason: `${revision.categoryName}: ${revision.note}${revision.sourceCardCodes.length > 0 ? ` (otomatis dari kartu ${revision.sourceCardCodes.join(', ')})` : ''}`,
        by: revision.createdByLabel,
        at: formatDateTime(revision.createdAt),
      });
    }
    return rows;
  });
}

/**
 * Riwayat estimasi dan penahanan seluruh tahapan sebagai tabel: tahapan, jenis, estimasi atau periode, alasan, pelaku,
 * dan waktu.
 * Masukan: tahapan dan revisi per id tahapan. Keluaran: tabel, atau kalimat kosong.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-11-01 butir 2, FR-13-01, FR-13-02, mockup v0.2.
 */
export function StageHistory({ stages, revisions }: StageHistoryProps) {
  const rows = buildRows(stages, revisions);
  if (rows.length === 0) return <div className={`${styles.muted} ${styles.small}`}>Belum ada estimasi yang tercatat.</div>;
  return (
    <div className={styles.wrap}>
      <table className={styles.at} aria-label="Riwayat estimasi dan penahanan">
        <thead><tr><th>Tahapan</th><th>Jenis</th><th>Estimasi / periode</th><th>Alasan</th><th>Oleh</th><th>Waktu</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className={styles.small}><b>{row.stage}</b></td>
              <td className={styles.small}>{row.kind}</td>
              <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>{row.detail}</td>
              <td className={styles.small}>{row.reason}</td>
              <td className={styles.small}>{row.by}</td>
              <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>{row.at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
