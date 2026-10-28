import { redirect } from 'next/navigation';

/**
 * Menu Master membuka sub menu pertama (Aplikasi Terdampak).
 * Masukan: tidak ada. Keluaran: tidak kembali (redirect).
 * Efek samping: mengarahkan ke `/master/aplikasi`.
 * Rujukan: FR-08-06 butir 2 (bawaan Aplikasi Terdampak).
 */
export default function MasterIndexPage() {
  redirect('/master/aplikasi');
}
