import Chip from '@mui/material/Chip';
import type { Tone } from '../format/project-labels';

/** Pemetaan nada ke warna dan gaya chip MUI. Teks selalu ada sehingga status tidak hanya berupa warna (NFR-05). */
const TONE_STYLE: Record<Tone, { color: 'success' | 'warning' | 'error' | 'primary' | 'secondary' | 'default'; variant: 'filled' | 'outlined' }> = {
  ok: { color: 'success', variant: 'filled' },
  warn: { color: 'warning', variant: 'outlined' },
  late: { color: 'error', variant: 'filled' },
  hold: { color: 'secondary', variant: 'outlined' },
  info: { color: 'primary', variant: 'outlined' },
  neutral: { color: 'default', variant: 'outlined' },
};

/** Properti chip bernada. */
interface ToneChipProps {
  readonly text: string;
  readonly tone: Tone;
}

/**
 * Chip status dengan warna menurut nada (ok, warn, late, hold, info, neutral).
 * Masukan: teks dan nada. Keluaran: elemen chip kecil.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: handoff UX/UI §4 (chip status: warna dan teks), NFR-05.
 */
export function ToneChip({ text, tone }: ToneChipProps) {
  const style = TONE_STYLE[tone];
  return <Chip size="small" label={text} color={style.color} variant={style.variant} />;
}
