'use server';

import { redirect } from 'next/navigation';
import { changeOwnPassword, logout } from '@/modules/auth';
import { getContainer } from '@/platform/container';
import { nextStamp, type ActionState } from '../_lib/action-state';
import { clearSessionCookie, currentSession, readSessionToken } from '../_lib/session';

/**
 * Aksi formulir Ubah Password (wajib ganti maupun sukarela).
 * Masukan: state sebelumnya dan FormData (current, next, confirm). Keluaran: state dengan galat per isian bila
 * gagal; bila berhasil pada mode wajib ganti diarahkan ke Dashboard, selain itu state berhasil.
 * Efek samping: mengganti hash password, mengakhiri sesi lain akun, mencatat audit (lihat `changeOwnPassword`).
 * Rujukan: FR-01-02, FR-01-05, Screen [002].
 */
export async function changePasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const session = await currentSession();
  if (!session) redirect('/login');
  const wasForced = session.actor.mustChangePassword;
  const result = await changeOwnPassword(getContainer().auth, session, {
    current: String(formData.get('current') ?? ''),
    next: String(formData.get('next') ?? ''),
    confirm: String(formData.get('confirm') ?? ''),
  });
  if (!result.ok) return { ok: false, message: result.error.message, fields: result.error.fields, stamp: nextStamp() };
  if (wasForced) redirect('/dashboard');
  return { ok: true, message: 'Password berhasil diganti. Sesi lain Anda telah diakhiri.', stamp: nextStamp() };
}

/**
 * Aksi Keluar: mengakhiri sesi dan membuka halaman Login.
 * Masukan: tidak ada. Keluaran: tidak kembali (redirect ke Login).
 * Efek samping: mencabut sesi di database dan menghapus cookie.
 * Rujukan: FR-01-03.
 */
export async function logoutAction(): Promise<void> {
  await logout(getContainer().auth, await readSessionToken());
  await clearSessionCookie();
  redirect('/login');
}
