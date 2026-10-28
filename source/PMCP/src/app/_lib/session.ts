import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireSession, type AuthenticatedSession } from '@/modules/auth';
import { clientAddressFrom } from '@/platform/client-address';
import { getContainer } from '@/platform/container';

/**
 * Nama cookie sesi. Di luar pengembangan memakai awalan `__Host-` (mensyaratkan Secure, Path=/, tanpa Domain).
 * Masukan: tidak ada. Keluaran: nama cookie.
 * Efek samping: tidak ada.
 * Rujukan: Security Design §5.
 */
function cookieName(): string {
  return isSecureCookie() ? '__Host-pmcp_session' : 'pmcp_session';
}

/**
 * Menentukan apakah cookie sesi harus bertanda Secure. Selalu true kecuali lingkungan pengembangan atau uji
 * (localhost tanpa HTTPS). Produksi dan staging wajib HTTPS (Technology Baseline TR-07).
 * Masukan: tidak ada. Keluaran: true bila Secure.
 * Efek samping: tidak ada.
 * Rujukan: Security Design §5 dan §8.
 */
function isSecureCookie(): boolean {
  const env = getContainer().config.appEnv;
  return env === 'production' || env === 'staging';
}

/**
 * Menyimpan token sesi di cookie HttpOnly.
 * Masukan: token mentah dan waktu kedaluwarsa mutlak. Keluaran: janji selesai.
 * Efek samping: menetapkan cookie `HttpOnly`, `SameSite=Lax`, `Path=/` pada respons.
 * Rujukan: FR-01-01, Security Design §5.
 */
export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(cookieName(), token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Menghapus cookie sesi.
 * Masukan: tidak ada. Keluaran: janji selesai.
 * Efek samping: menghapus cookie pada respons.
 * Rujukan: FR-01-03.
 */
export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(cookieName());
}

/**
 * Membaca token sesi dari cookie permintaan.
 * Masukan: tidak ada. Keluaran: token atau undefined.
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: FR-01-04.
 */
export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(cookieName())?.value;
}

/**
 * Memvalidasi sesi di server untuk permintaan saat ini (bukan di middleware, TD-10).
 * Masukan: tidak ada. Keluaran: sesi terautentikasi atau null.
 * Efek samping: dapat memperbarui `last_seen_at` (paling sering sekali per menit).
 * Rujukan: FR-01-04 butir 3, Security Design §5.
 */
export async function currentSession(): Promise<AuthenticatedSession | null> {
  return requireSession(getContainer().auth, await readSessionToken());
}

/**
 * Mewajibkan sesi pada sebuah halaman: tanpa sesi diarahkan ke Login; akun yang wajib ganti password diarahkan
 * ke Ubah Password kecuali halaman itu sendiri.
 * Masukan: opsi `allowMustChange` untuk halaman Ubah Password. Keluaran: sesi terautentikasi.
 * Efek samping: dapat mengarahkan (redirect) sehingga fungsi tidak kembali.
 * Rujukan: FR-01-01 butir 4, EC-01-01.05, FR-01-05 butir 2.
 */
export async function requirePageSession(options: { allowMustChange?: boolean } = {}): Promise<AuthenticatedSession> {
  const session = await currentSession();
  if (!session) redirect('/login');
  if (session.actor.mustChangePassword && !options.allowMustChange) redirect('/ubah-password');
  return session;
}

/**
 * Menentukan alamat sumber permintaan dari header proxy tepercaya.
 * Masukan: tidak ada. Keluaran: alamat atau `tidak-diketahui`.
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: FR-01-01 butir 3, Technical Design §10.
 */
export async function requestSourceAddress(): Promise<string> {
  const forwarded = (await headers()).get('x-forwarded-for');
  return clientAddressFrom(forwarded, getContainer().config.trustedProxyCount);
}
