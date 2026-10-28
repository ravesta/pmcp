import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { AuditEventRow } from '@/modules/audit';
import { EmptyState } from '@/ui/components/empty-state';
import { PaginationBar } from '@/ui/components/pagination-bar';
import { formatDateTime } from '@/shared/format';

/** Properti riwayat perubahan project. */
interface ProjectHistoryProps {
  readonly rows: ReadonlyArray<AuditEventRow>;
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hrefFor: (page: number) => string;
}

/**
 * Riwayat perubahan sebuah project (terbaru di atas): waktu server, pelaku, ringkasan, dan nilai lama dan baru
 * setiap field yang berubah. Berhalaman di server.
 * Masukan: baris jejak, halaman, ukuran, total, dan pembuat alamat. Keluaran: tabel dan pagination.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-11-01 butir 2, BL-07, NFR-04, FR-15-01.
 */
export function ProjectHistory({ rows, page, pageSize, total, hrefFor }: ProjectHistoryProps) {
  if (rows.length === 0) return <EmptyState message="Belum ada riwayat perubahan." />;
  return (
    <>
      <Paper variant="outlined">
        <TableContainer>
          <Table size="small" sx={{ minWidth: 640 }} aria-label="Riwayat perubahan project">
            <TableHead><TableRow><TableCell>Waktu</TableCell><TableCell>Pelaku</TableCell><TableCell>Perubahan</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} sx={{ verticalAlign: 'top' }}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(row.occurredAt)}</TableCell>
                  <TableCell>{row.actorLabel}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.summary}</Typography>
                    {row.changes.map((change) => (
                      <Typography key={change.field} variant="caption" color="text.secondary" component="div">
                        {change.field}: {change.old === '' ? '-' : change.old} → {change.new === '' ? '-' : change.new}
                      </Typography>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <PaginationBar page={page} pageSize={pageSize} total={total} pageSizeOptions={[pageSize]} hrefFor={(next) => hrefFor(next)} unit="catatan" />
    </>
  );
}
