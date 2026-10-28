'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useActionState, useState } from 'react';
import { isCommonPassword, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/modules/auth/client';
import { PasswordField } from '@/ui/components/password-field';
import { useRetainedSubmit } from '@/ui/hooks/use-retained-submit';
import { initialActionState } from '../_lib/action-state';
import { changePasswordAction, logoutAction } from './actions';

/** Properti formulir Ubah Password. */
interface ChangePasswordFormProps {
  /** True bila akun wajib ganti password (login dengan password sementara). */
  readonly forced: boolean;
  /** Username akun, untuk aturan "berbeda dari username". */
  readonly username: string;
}

/**
 * Menghitung status tiap aturan password untuk ditampilkan langsung saat mengetik.
 * Masukan: password baru dan username. Keluaran: daftar aturan dengan status lulus atau gagal; belum ada
 * isi berarti status netral (null).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-02 butir 2, handoff UX/UI §5.2.
 */
function ruleStates(password: string, username: string): Array<{ label: string; pass: boolean | null }> {
  const typed = password.length > 0;
  const length = [...password].length;
  return [
    { label: `Minimal ${PASSWORD_MIN_LENGTH} karakter`, pass: typed ? length >= PASSWORD_MIN_LENGTH : null },
    { label: `Maksimal ${PASSWORD_MAX_LENGTH} karakter`, pass: typed ? length <= PASSWORD_MAX_LENGTH : null },
    { label: 'Berbeda dari username', pass: typed ? password.toLowerCase() !== username : null },
    { label: 'Bukan password yang umum dipakai', pass: typed ? !isCommonPassword(password) : null },
  ];
}

/**
 * Formulir Ubah Password dengan daftar aturan yang berubah saat mengetik (diumumkan pembaca layar).
 * Masukan: mode wajib/sukarela dan username. Keluaran: elemen formulir.
 * Efek samping: mengirim Server Action `changePasswordAction`.
 * Rujukan: FR-01-02, FR-01-05, Screen [002], NFR-05.
 */
export function ChangePasswordForm({ forced, username }: ChangePasswordFormProps) {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialActionState);
  const [next, setNext] = useState('');
  const onSubmit = useRetainedSubmit(formAction);
  const fields = state.fields ?? {};
  return (
    <>
    <Box component="form" id="form-keluar" action={logoutAction} />
    <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 460 }} aria-labelledby="judul-ubah-password">
      <Typography id="judul-ubah-password" variant="h2">{forced ? 'Buat password baru Anda' : 'Ganti password'}</Typography>
      {forced ? (
        <Alert severity="warning">Anda masuk dengan password sementara. Buat password baru sebelum memakai aplikasi.</Alert>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Setelah password diganti, perangkat lain yang sedang masuk dengan akun ini akan keluar. Perangkat ini tetap masuk.
        </Typography>
      )}
      <PasswordField name="current" label={forced ? 'Password sementara' : 'Password saat ini'} autoComplete="current-password" error={fields.current} />
      <PasswordField name="next" label="Password baru" autoComplete="new-password" error={fields.next} onValueChange={setNext} />
      <Box component="ul" aria-live="polite" sx={{ listStyle: 'none', m: 0, p: 0, fontSize: 12 }}>
        {ruleStates(next, username).map((rule) => (
          <li key={rule.label} style={{ color: rule.pass === null ? 'inherit' : rule.pass ? 'var(--mui-palette-success-main)' : 'var(--mui-palette-error-main)' }}>
            {rule.pass === null ? '○' : rule.pass ? '✓' : '✕'} {rule.label}
          </li>
        ))}
      </Box>
      <PasswordField name="confirm" label="Ulangi password baru" autoComplete="new-password" error={fields.confirm} />
      {state.message && !state.ok && Object.keys(fields).length === 0 ? <Alert severity="error" role="alert">{state.message}</Alert> : null}
      {state.ok ? <Alert severity="success" role="status">{state.message}</Alert> : null}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button type="submit" variant="contained" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan password'}</Button>
        {forced ? <Button type="submit" form="form-keluar" variant="outlined">Keluar</Button> : null}
      </Box>
      <Typography variant="caption" color="text.secondary">
        Gunakan kalimat yang mudah diingat dan panjang. Tidak perlu simbol atau huruf besar. Password tidak perlu diganti berkala.
      </Typography>
    </Box>
    </>
  );
}
