import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { getContainer } from '@/platform/container';
import { requirePageSession } from '../_lib/session';
import { ChangePasswordForm } from './change-password-form';

/** Halaman ber-sesi tidak boleh di-cache. */
export const dynamic = 'force-dynamic';

/**
 * Halaman Ubah Password (Screen [002]). Untuk akun wajib ganti, menu aplikasi tidak ditampilkan di sini
 * (halaman ini di luar grup `(app)`), hanya Simpan dan Keluar.
 * Masukan: tidak ada. Keluaran: elemen halaman.
 * Efek samping: memvalidasi sesi dan membaca username akun.
 * Rujukan: FR-01-02, FR-01-05 butir 2, Screen [002].
 */
export default async function ChangePasswordPage() {
  const session = await requirePageSession({ allowMustChange: true });
  const user = await getContainer().auth.repository.findUserById(session.actor.userId);
  return (
    <Box component="main" sx={{ minHeight: '100vh', p: 2, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
      <Paper variant="outlined" sx={{ p: 3, mt: 4, width: '100%', maxWidth: 520 }}>
        <ChangePasswordForm forced={session.actor.mustChangePassword} username={user?.username ?? ''} />
      </Paper>
    </Box>
  );
}
