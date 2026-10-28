import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

/** Properti satu pasang label dan nilai. */
interface InfoItemProps {
  readonly label: string;
  readonly children: ReactNode;
}

/**
 * Satu pasang label kecil dan nilai untuk bagian informasi hanya baca (Detail Project).
 * Masukan: label dan isi nilai. Keluaran: blok dengan label di atas nilai.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: Screen [014] (kosong tampil "-").
 */
export function InfoItem({ label, children }: InfoItemProps) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="div">{label}</Typography>
      <Typography component="div" sx={{ overflowWrap: 'anywhere' }}>{children}</Typography>
    </Box>
  );
}
