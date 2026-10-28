import { redirect } from 'next/navigation';
import { currentSession } from './_lib/session';

/**
 * Halaman akar: mengarahkan ke Dashboard bila sudah login, selain itu ke Login.
 * Masukan: tidak ada. Keluaran: tidak kembali (selalu redirect).
 * Efek samping: memvalidasi sesi (dapat memperbarui `last_seen_at`) lalu mengarahkan.
 * Rujukan: FR-01-01 butir 6, EC-01-01.05.
 */
export default async function HomePage() {
  redirect((await currentSession()) ? '/dashboard' : '/login');
}
