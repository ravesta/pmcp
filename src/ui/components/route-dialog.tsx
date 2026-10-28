'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import { useRouter } from 'next/navigation';
import { useId, type ReactNode } from 'react';

/** Properti dialog yang keadaan bukanya disimpan di URL. */
interface RouteDialogProps {
  readonly title: ReactNode;
  /** Alamat tujuan saat dialog ditutup (alamat halaman tanpa parameter dialog). */
  readonly closeHref: string;
  readonly maxWidth?: 'xs' | 'sm' | 'md' | 'lg';
  readonly children: ReactNode;
}

/**
 * Dialog yang terbuka selama parameter URL-nya ada: menutup dialog berarti menavigasi ke alamat tanpa parameter itu,
 * sehingga tombol kembali dan tautan langsung ke kartu berfungsi. Isi dirender server lalu diteruskan ke sini.
 * Masukan: judul, alamat penutup, lebar, dan isi. Keluaran: dialog dengan tombol tutup.
 * Efek samping: menavigasi (`router.replace`) saat ditutup.
 * Rujukan: handoff UX/UI §4 (dialog: fokus masuk dan kembali), §9 (`aria-labelledby`), FR-17-03 (klik kartu membuka rincian).
 */
export function RouteDialog({ title, closeHref, maxWidth = 'md', children }: RouteDialogProps) {
  const router = useRouter();
  const titleId = useId();
  return (
    <Dialog open onClose={() => router.replace(closeHref)} fullWidth maxWidth={maxWidth} aria-labelledby={titleId} scroll="paper">
      <DialogTitle id={titleId} sx={{ pr: 6 }}>
        {title}
        <IconButton aria-label="Tutup" onClick={() => router.replace(closeHref)} sx={{ position: 'absolute', right: 8, top: 8, fontSize: 22, lineHeight: 1 }}>
          ×
        </IconButton>
      </DialogTitle>
      {children}
    </Dialog>
  );
}
