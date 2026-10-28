import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** Properti keadaan kosong. */
interface EmptyStateProps {
  readonly message: string;
  /** Tindakan lanjutan (mis. tombol Reset filter), bila ada. */
  readonly action?: ReactNode;
}

/**
 * Keadaan kosong sebuah daftar: satu kalimat dari FSD dan tindakan lanjutan.
 * Masukan: kalimat dan tindakan opsional. Keluaran: kartu bertepi.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: handoff UX/UI §6 (keadaan kosong), FR-10-01 ("Tidak ada project yang cocok dengan filter.").
 */
export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <Paper variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center' }}>
      <Typography color="text.secondary">{message}</Typography>
      {action}
    </Paper>
  );
}
