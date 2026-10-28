'use client';

import Box from '@mui/material/Box';
import Link from 'next/link';

/** Satu pilihan pada kontrol segmen. */
export interface SegmentOption {
  readonly key: string;
  readonly label: string;
  readonly href: string;
}

/** Properti kontrol segmen berbasis tautan. */
interface SegmentedLinksProps {
  readonly label: string;
  readonly options: ReadonlyArray<SegmentOption>;
  /** Kunci pilihan yang sedang aktif. */
  readonly active: string;
}

/**
 * Kontrol segmen berbasis tautan (dirender server): deretan tombol menyatu dengan satu pilihan aktif, dipakai untuk
 * Daftar/Gantt dan Hari/Minggu/Bulan. Berpindah pilihan berarti berpindah alamat sehingga tahan tombol kembali.
 * Masukan: nama grup, pilihan (kunci, label, alamat), dan kunci aktif. Keluaran: kontrol segmen.
 * Efek samping: tidak ada (komponen murni; navigasi lewat tautan).
 * Rujukan: mockup v0.2 (kelas seg), handoff UX/UI §4 (ToggleButtonGroup, aria-pressed).
 */
export function SegmentedLinks({ label, options, active }: SegmentedLinksProps) {
  return (
    <Box role="group" aria-label={label} sx={{ display: 'inline-flex', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden', bgcolor: 'var(--surface)' }}>
      {options.map((option, index) => {
        const pressed = option.key === active;
        return (
          <Box
            key={option.key}
            component={Link}
            href={option.href}
            aria-pressed={pressed}
            sx={{ px: '14px', minHeight: 34, display: 'inline-flex', alignItems: 'center', fontWeight: 500, textDecoration: 'none', color: pressed ? 'var(--on-accent)' : 'var(--muted)', bgcolor: pressed ? 'var(--accent)' : 'transparent', borderRight: index < options.length - 1 ? '1px solid var(--line)' : 0, '&:hover': { bgcolor: pressed ? 'var(--accent)' : 'var(--soft)' } }}
          >
            {option.label}
          </Box>
        );
      })}
    </Box>
  );
}
