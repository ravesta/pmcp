import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { can } from '@/modules/auth';
import { requirePageSession } from '../../_lib/session';
import { MasterNav } from './master-nav';

/**
 * Kerangka menu Master: hanya Manager (hak dicek di server, bukan hanya disembunyikan di menu).
 * Masukan: isi sub menu. Keluaran: judul, sub menu, dan isi; PIC melihat pesan tanpa akses.
 * Efek samping: memvalidasi sesi di server.
 * Rujukan: FR-01-04 butir 4, EC-01-04.01, FR-08-06.
 */
export default async function MasterLayout({ children }: { children: ReactNode }) {
  const { actor } = await requirePageSession();
  if (!can(actor, 'master.manage')) {
    return <Alert severity="error" role="alert">Anda tidak memiliki akses ke halaman ini.</Alert>;
  }
  return (
    <>
      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div>
          <Typography variant="h1">Master</Typography>
          <Typography variant="body2" color="text.secondary">Pilih data master yang ingin dikelola</Typography>
        </div>
        <MasterNav />
      </Paper>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
    </>
  );
}
