'use client';

import { startTransition, type FormEvent } from 'react';

/**
 * Membuat penangan submit yang mengirim Server Action TANPA mengosongkan isian formulir.
 *
 * React 19 mereset formulir setelah `<form action={...}>` selesai, termasuk saat aksi gagal sehingga pengguna harus
 * mengetik ulang semua isian. Penangan ini mengirim FormData lewat transisi dan mencegah reset otomatis; isian
 * yang perlu dikosongkan (mis. setelah sukses) dikosongkan pemanggil dengan `key`.
 * Masukan: fungsi aksi hasil `useActionState`. Keluaran: penangan `onSubmit` untuk elemen form.
 * Efek samping: mencegah submit bawaan browser dan memanggil aksi dalam transisi (menyala `pending`).
 * Rujukan: handoff UX/UI §7 (galat per isian tanpa kehilangan isian), FR-01-02, FR-08-01.
 */
export function useRetainedSubmit(formAction: (formData: FormData) => void): (event: FormEvent<HTMLFormElement>) => void {
  return (event) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => formAction(formData));
  };
}
