import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { requirePageSession } from '../../_lib/session';

/**
 * Dashboard sementara (irisan 1). Dashboard Head dan PIC dibangun pada irisan 4.
 * Masukan: tidak ada. Keluaran: elemen halaman.
 * Efek samping: memvalidasi sesi.
 * Rujukan: FR-01-01 butir 6 (setelah login pengguna masuk Dashboard), Technical Design Lampiran A.
 */
export default async function DashboardPage() {
  const { actor } = await requirePageSession();
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Typography variant="h1">Dashboard</Typography>
      <Typography>Selamat datang, {actor.label}.</Typography>
      <Alert severity="info">
        Dashboard {actor.role === 'MANAGER' ? 'Head BA & QA' : 'PIC'} belum tersedia pada tahap ini. Fitur Project, Kanban, dan Riwayat
        ditambahkan pada tahap berikutnya.
      </Alert>
    </Paper>
  );
}
