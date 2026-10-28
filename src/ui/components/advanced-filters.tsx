'use client';

import Box from '@mui/material/Box';
import { useState, type ReactNode } from 'react';

/** Properti blok filter lanjutan. */
interface AdvancedFiltersProps {
  /** Jumlah filter lanjutan yang aktif (ditampilkan sebagai lencana). */
  readonly activeCount: number;
  readonly children: ReactNode;
  /** Id blok untuk `aria-controls`. */
  readonly id: string;
}

/**
 * Tombol "Filter lanjutan" yang membuka dan menutup blok isian tambahan. Isian tetap berada di DOM saat tertutup
 * (hanya disembunyikan) sehingga nilainya tetap ikut terkirim saat filter diterapkan. Terbuka otomatis bila ada
 * filter lanjutan aktif.
 * Masukan: jumlah filter aktif, isi, dan id. Keluaran: tombol dan blok isian.
 * Efek samping: menyimpan keadaan buka/tutup di state komponen.
 * Rujukan: mockup v0.2 (Filter lanjutan, lencana jumlah), handoff UX/UI §9 (aria-expanded, aria-controls).
 */
export function AdvancedFilters({ activeCount, children, id }: AdvancedFiltersProps) {
  const [open, setOpen] = useState(activeCount > 0);
  return (
    <>
      <Box
        component="button"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        sx={{ position: 'absolute', top: 12, right: 14, background: 'none', border: 0, color: 'var(--accent)', fontWeight: 500, cursor: 'pointer', font: 'inherit', p: 0 }}
      >
        Filter lanjutan {open ? '▴' : '▾'}
        {activeCount > 0 ? <Box component="span" sx={{ bgcolor: 'var(--accent)', color: 'var(--on-accent)', borderRadius: '10px', fontSize: 11, p: '0 7px', ml: '6px' }}>{activeCount}</Box> : null}
      </Box>
      <Box id={id} hidden={!open} sx={{ display: open ? 'grid' : 'none', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px 16px', alignItems: 'end' }}>
        {children}
      </Box>
    </>
  );
}
