'use client';

import Box from '@mui/material/Box';
import Link from 'next/link';

/** Satu pilihan pada strip status. */
export interface StripOption {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly href: string;
  /** Variabel CSS warna titik status (mis. `var(--run)`); kosong untuk pilihan "Semua". */
  readonly dotColor?: string;
}

/** Properti strip status. */
interface StatusStripProps {
  readonly title: string;
  readonly options: ReadonlyArray<StripOption>;
  /** Kunci pilihan aktif. */
  readonly active: string;
  readonly hint?: string;
}

/**
 * Strip ringkasan status: deretan pil berisi titik warna, nama status, dan jumlah, yang dapat diklik untuk menyaring.
 * Masukan: judul, pilihan (kunci, label, jumlah, alamat, warna titik), kunci aktif, dan petunjuk. Keluaran: strip.
 * Efek samping: tidak ada (komponen murni; navigasi lewat tautan).
 * Rujukan: FR-14-02 (jumlah per status dapat diklik), mockup v0.2 (kelas pwrap, ps), handoff UX/UI §9.
 */
export function StatusStrip({ title, options, active, hint }: StatusStripProps) {
  return (
    <Box component="nav" aria-label={title} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', bgcolor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', p: '10px 14px' }}>
      <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{title}</Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {options.map((option) => {
          const pressed = option.key === active;
          return (
            <Box
              key={option.key}
              component={Link}
              href={option.href}
              aria-pressed={pressed}
              aria-current={pressed ? 'true' : undefined}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, border: '1px solid', borderColor: pressed ? 'var(--accent)' : 'var(--line)', borderRadius: 999, p: '4px 6px 4px 12px', minHeight: 36, fontWeight: 500, textDecoration: 'none', color: pressed ? 'var(--on-accent)' : 'var(--ink)', bgcolor: pressed ? 'var(--accent)' : 'var(--surface)', '&:hover': { borderColor: 'var(--accent)' } }}
            >
              {option.dotColor ? <Box component="i" aria-hidden sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: option.dotColor, flex: 'none', boxShadow: pressed ? '0 0 0 2px rgba(255,255,255,.75)' : 'none' }} /> : null}
              <span>{option.label}</span>
              <Box component="b" className="mono" sx={{ bgcolor: pressed ? 'rgba(255,255,255,.24)' : 'var(--soft)', borderRadius: 999, minWidth: 28, p: '2px 9px', textAlign: 'center', fontWeight: 600, fontSize: 13 }}>{option.count}</Box>
            </Box>
          );
        })}
      </Box>
      {hint ? <Box component="span" sx={{ fontSize: 12, color: 'var(--muted)', ml: 'auto' }}>{hint}</Box> : null}
    </Box>
  );
}
