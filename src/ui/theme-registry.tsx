'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { createAppTheme } from './theme';

const theme = createAppTheme();

/**
 * Menyediakan tema MUI dan cache gaya sisi server untuk seluruh aplikasi.
 * Masukan: isi halaman. Keluaran: pembungkus tema.
 * Efek samping: tidak ada (hanya menyediakan konteks tema dan menyuntikkan gaya bawaan).
 * Rujukan: handoff UX/UI §4, Technical Design TDR-05 (integrasi App Router resmi MUI).
 */
export function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme} defaultMode="system">
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
