import Paper from '@mui/material/Paper';
import { redirect } from 'next/navigation';
import { currentSession } from '../_lib/session';
import { LoginForm } from './login-form';

/** Halaman login tidak boleh di-cache. */
export const dynamic = 'force-dynamic';

/**
 * Halaman Login (Screen [001]). Pengguna yang sudah login langsung diarahkan ke Dashboard.
 * Masukan: tidak ada. Keluaran: elemen halaman.
 * Efek samping: memvalidasi sesi yang ada.
 * Rujukan: FR-01-01, Screen [001].
 */
export default async function LoginPage() {
  if (await currentSession()) redirect('/dashboard');
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 380, p: 3 }}>
        <LoginForm />
      </Paper>
    </main>
  );
}
