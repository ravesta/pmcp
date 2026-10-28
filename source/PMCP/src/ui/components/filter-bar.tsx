import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LinkButton } from '@/ui/components/link-controls';

/** Properti bar filter. */
interface FilterBarProps {
  /** Alamat tujuan formulir (GET). */
  readonly action: string;
  /** Nilai tetap yang ikut terkirim agar keadaan lain (tampilan, zoom) tidak hilang saat filter diterapkan. */
  readonly preserve?: Readonly<Record<string, string>>;
  /** Alamat Reset semua (tanpa filter); tombol hanya tampil bila `activeCount` lebih dari nol. */
  readonly resetHref: string;
  readonly activeCount: number;
  readonly children: ReactNode;
}

/**
 * Bar filter berbasis formulir GET: isian di dalamnya, tombol Terapkan, dan penanda serta tombol Reset semua.
 * Masukan: tujuan, nilai yang dipertahankan, alamat reset, jumlah filter aktif, dan isian. Keluaran: kartu filter.
 * Efek samping: tidak ada (komponen murni; pengiriman lewat navigasi GET).
 * Rujukan: BL-41 (satu bar filter bersama), Screen [010] (penanda filter aktif, Reset semua), NFR-05.
 */
export function FilterBar({ action, preserve = {}, resetHref, activeCount, children }: FilterBarProps) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box component="form" method="get" action={action} role="search" aria-label="Filter">
        {Object.entries(preserve).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', alignItems: 'start' }}>{children}</Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button type="submit" variant="contained">Terapkan</Button>
          {activeCount > 0 ? <LinkButton href={resetHref} variant="outlined">Reset semua ({activeCount} filter aktif)</LinkButton> : null}
        </Box>
      </Box>
    </Paper>
  );
}
