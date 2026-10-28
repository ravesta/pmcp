import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { MonthWindow, Zoom } from '@/ui/gantt/timeline';
import { LinkButton } from '@/ui/components/link-controls';

/** Nama zoom untuk tombol. */
const ZOOM_TEXT: Readonly<Record<Zoom, string>> = { DAY: 'Hari', WEEK: 'Minggu', MONTH: 'Bulan' };

/** Properti kontrol Gantt. Semua tujuan berupa alamat yang sudah menjaga filter lain. */
interface GanttControlsProps {
  readonly window: MonthWindow;
  readonly zoom: Zoom;
  readonly showLayers: boolean;
  readonly hrefs: {
    readonly previous: string;
    readonly next: string;
    readonly today: string;
    readonly zoom: Readonly<Record<Zoom, string>>;
    readonly toggleLayers: string;
  };
}

/**
 * Kontrol Gantt: geser periode per bulan, kembali ke bulan ini, pilihan zoom Hari/Minggu/Bulan, dan tombol
 * menampilkan atau menyembunyikan lapisan estimasi awal dan aktual. Semua berupa tautan (dirender server).
 * Masukan: jendela, zoom, penanda lapisan, dan alamat tujuan. Keluaran: baris kontrol.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-12-01 butir 2 dan 3, FR-12-02 butir 7, Screen [011] (Table 21).
 */
export function GanttControls({ window, zoom, showLayers, hrefs }: GanttControlsProps) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      <LinkButton href={hrefs.previous} size="small" variant="outlined">Bulan sebelumnya</LinkButton>
      <LinkButton href={hrefs.today} size="small" variant="outlined">Bulan ini</LinkButton>
      <LinkButton href={hrefs.next} size="small" variant="outlined">Bulan berikutnya</LinkButton>
      <Typography variant="body2" color="text.secondary" role="status">Periode {window.from} sampai {window.to}</Typography>
      <Box role="group" aria-label="Zoom" sx={{ display: 'flex', gap: 0.5, ml: { sm: 'auto' } }}>
        {(Object.keys(ZOOM_TEXT) as Zoom[]).map((value) => (
          <LinkButton key={value} href={hrefs.zoom[value]} size="small" variant={zoom === value ? 'contained' : 'outlined'} aria-pressed={zoom === value}>
            {ZOOM_TEXT[value]}
          </LinkButton>
        ))}
      </Box>
      <LinkButton href={hrefs.toggleLayers} size="small" variant="outlined" aria-pressed={showLayers}>
        {showLayers ? 'Sembunyikan estimasi awal dan aktual' : 'Tampilkan estimasi awal dan aktual'}
      </LinkButton>
    </Box>
  );
}
