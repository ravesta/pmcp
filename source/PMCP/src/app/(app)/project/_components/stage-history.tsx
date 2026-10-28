import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { RevisionRow, StageView } from '@/modules/project';
import { formatDateOrDash, formatRange } from '@/ui/format/project-labels';
import { formatDateTime } from '@/shared/format';

/** Properti riwayat estimasi dan penahanan. */
interface StageHistoryProps {
  readonly stages: ReadonlyArray<StageView>;
  readonly revisions: ReadonlyMap<number, ReadonlyArray<RevisionRow>>;
}

/**
 * Riwayat estimasi dan penahanan seluruh tahapan: estimasi awal, setiap revisi bernomor (sebelum dan sesudah,
 * kategori, catatan, pelaku, waktu, kartu asal), dan periode hold dengan alasannya.
 * Masukan: tahapan dan revisi per id tahapan. Keluaran: tabel riwayat, atau kalimat kosong.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-11-01 butir 2, FR-13-01, FR-13-02 butir 3, FR-13-05 butir 2.
 */
export function StageHistory({ stages, revisions }: StageHistoryProps) {
  const rows = stages.flatMap((stage) => {
    const entries: Array<{ key: string; stage: string; kind: string; detail: string; note: string; who: string }> = [];
    if (stage.baseline) entries.push({ key: `${stage.stageId}-awal`, stage: stage.label, kind: 'Estimasi awal', detail: formatRange(stage.baseline), note: '-', who: '-' });
    for (const revision of revisions.get(stage.stageId) ?? []) {
      entries.push({
        key: `${stage.stageId}-rev-${revision.seq}`,
        stage: stage.label,
        kind: `Revisi ${revision.seq}`,
        detail: `${formatRange(revision.previous)} → ${formatRange(revision.next)}`,
        note: `${revision.categoryName}: ${revision.note}${revision.sourceCardCodes.length > 0 ? ` (kartu ${revision.sourceCardCodes.join(', ')})` : ''}`,
        who: `${revision.createdByLabel}, ${formatDateTime(revision.createdAt)}`,
      });
    }
    stage.holdHistory.forEach((hold, index) =>
      entries.push({ key: `${stage.stageId}-hold-${index}`, stage: stage.label, kind: 'Hold', detail: `${formatDateOrDash(hold.since)} - ${formatDateOrDash(hold.resumedOn)}`, note: hold.reason, who: '-' }),
    );
    if (stage.status === 'HELD' && stage.holdSince) {
      entries.push({ key: `${stage.stageId}-hold-now`, stage: stage.label, kind: 'Hold berjalan', detail: `sejak ${formatDateOrDash(stage.holdSince)}`, note: stage.holdReason ?? '-', who: '-' });
    }
    return entries;
  });
  if (rows.length === 0) return <Typography color="text.secondary">Belum ada riwayat estimasi atau penahanan.</Typography>;
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" sx={{ minWidth: 640 }} aria-label="Riwayat estimasi dan penahanan">
          <TableHead><TableRow><TableCell>Tahapan</TableCell><TableCell>Jenis</TableCell><TableCell>Rincian</TableCell><TableCell>Alasan dan catatan</TableCell><TableCell>Oleh</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}><TableCell>{row.stage}</TableCell><TableCell>{row.kind}</TableCell><TableCell>{row.detail}</TableCell><TableCell>{row.note}</TableCell><TableCell>{row.who}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
