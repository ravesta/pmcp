'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useActionState } from 'react';
import { initialActionState } from '../_lib/action-state';
import { PasswordField } from '@/ui/components/password-field';
import { useRetainedSubmit } from '@/ui/hooks/use-retained-submit';
import { loginAction } from './actions';

/**
 * Formulir Login: username, password, dan satu pesan galat generik (tidak menyorot isian mana yang salah).
 * Masukan: tidak ada. Keluaran: elemen formulir.
 * Efek samping: mengirim Server Action `loginAction`.
 * Rujukan: FR-01-01, Screen [001], handoff UX/UI §5.1.
 */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialActionState);
  const onSubmit = useRetainedSubmit(formAction);
  return (
    <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-labelledby="judul-login">
      <div>
        <Typography id="judul-login" variant="h1">PMCP</Typography>
        <Typography color="text.secondary">Masuk untuk melihat dan mengelola pekerjaan tim</Typography>
      </div>
      {state.message ? (
        <Alert severity="error" role="alert" id="galat-login">
          {state.message}
        </Alert>
      ) : null}
      <TextField
        name="username"
        label="Username"
        autoComplete="username"
        autoFocus
        slotProps={{ htmlInput: { autoCapitalize: 'none', spellCheck: false, 'aria-describedby': state.message ? 'galat-login' : undefined } }}
      />
      <PasswordField key={state.stamp} name="password" label="Password" autoComplete="current-password" describedBy={state.message ? 'galat-login' : undefined} />
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? 'Memeriksa...' : 'Masuk'}
      </Button>
      <Typography variant="caption" color="text.secondary">
        Lupa password? Hubungi Manager untuk direset. Aplikasi ini hanya dapat dibuka dari jaringan kantor.
      </Typography>
    </Box>
  );
}
