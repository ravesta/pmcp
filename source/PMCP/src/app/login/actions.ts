'use server';

import { redirect } from 'next/navigation';
import { login } from '@/modules/auth';
import { getContainer } from '@/platform/container';
import { nextStamp, type ActionState } from '../_lib/action-state';
import { requestSourceAddress, setSessionCookie } from '../_lib/session';

/**
 * Aksi formulir Login.
 * Masukan: state sebelumnya dan FormData (username, password). Keluaran: state galat bila gagal; bila
 * berhasil tidak kembali (diarahkan ke Dashboard, atau ke Ubah Password bila wajib ganti password).
 * Efek samping: membuat sesi dan cookie, menulis throttle dan audit (lihat `login`).
 * Rujukan: FR-01-01, Screen [001].
 */
export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const result = await login(getContainer().auth, {
    username: String(formData.get('username') ?? ''),
    password: String(formData.get('password') ?? ''),
    sourceAddress: await requestSourceAddress(),
  });
  if (!result.ok) return { ok: false, message: result.error.message, stamp: nextStamp() };
  await setSessionCookie(result.data.token, result.data.expiresAt);
  redirect(result.data.mustChangePassword ? '/ubah-password' : '/dashboard');
}
