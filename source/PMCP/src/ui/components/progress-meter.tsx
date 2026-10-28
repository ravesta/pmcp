import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

/** Properti bar progres. */
interface ProgressMeterProps {
  /** Progres 0..100. */
  readonly value: number;
  /** Nama yang dibacakan pembaca layar, mis. "Progres tahapan BA". */
  readonly label: string;
}

/**
 * Bar progres dengan angka persen di sampingnya (angka selalu terlihat, tidak hanya bar).
 * Masukan: nilai dan label aksesibilitas. Keluaran: bar dan teks persen.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: handoff UX/UI §4 (bar progres dengan teks persen), FR-05-02.
 */
export function ProgressMeter({ value, label }: ProgressMeterProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 110 }}>
      <LinearProgress variant="determinate" value={clamped} aria-label={label} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
      <Typography variant="body2" sx={{ minWidth: 34, textAlign: 'right' }}>{clamped}%</Typography>
    </Box>
  );
}
