'use client';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** Sub menu Master, satu master tampil dalam satu waktu (BL-47). */
export const MASTER_TABS: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: 'aplikasi', label: 'Aplikasi Terdampak' },
  { slug: 'kategori-revisi', label: 'Kategori Alasan Revisi' },
  { slug: 'step', label: 'Step Tahapan' },
  { slug: 'kategori-activity', label: 'Kategori Activity' },
  { slug: 'alasan-jadwal-ulang', label: 'Alasan Jadwal Ulang' },
  { slug: 'pic', label: 'PIC' },
  { slug: 'jejak', label: 'Jejak Perubahan' },
];

/**
 * Sub menu Master berupa tab yang dapat digulir pada layar sempit.
 * Masukan: tidak ada. Keluaran: elemen tab.
 * Efek samping: tidak ada (navigasi lewat tautan).
 * Rujukan: FR-08-06, BL-47, handoff UX/UI §4.
 */
export function MasterNav() {
  const pathname = usePathname();
  const index = MASTER_TABS.findIndex((tab) => pathname === `/master/${tab.slug}`);
  return (
    <Tabs value={index === -1 ? false : index} variant="scrollable" scrollButtons="auto" aria-label="Data master">
      {MASTER_TABS.map((tab) => (
        <Tab key={tab.slug} label={tab.label} component={Link} href={`/master/${tab.slug}`} />
      ))}
    </Tabs>
  );
}
