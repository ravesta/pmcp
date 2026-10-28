import type { ReactNode } from 'react';
import { ThemeRegistry } from '@/ui/theme-registry';

/** Metadata dasar halaman. */
export const metadata = {
  title: 'PMCP',
  description: 'Pemantauan project dan perencanaan kapasitas tim BA dan QA',
};

/**
 * Kerangka dasar semua halaman PMCP (bahasa antarmuka Indonesia) dengan tema MUI.
 * Masukan: isi halaman. Keluaran: elemen html dan body.
 * Efek samping: tidak ada. Menu per peran ada pada layout grup `(app)`.
 * Rujukan: CL-010, Screen [025], handoff UX/UI §4.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
