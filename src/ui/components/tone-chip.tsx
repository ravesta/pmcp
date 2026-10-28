import Box from '@mui/material/Box';
import type { Tone } from '../format/project-labels';

/** Warna latar, teks, dan tepi tiap nada, memakai token mockup (variabel CSS). */
const TONE_STYLE: Record<Tone, { bg: string; fg: string; border?: string }> = {
  ok: { bg: 'var(--ok-bg)', fg: 'var(--ok)' },
  warn: { bg: 'var(--warn-bg)', fg: 'var(--warn)' },
  late: { bg: 'var(--late-bg)', fg: 'var(--late)' },
  info: { bg: 'var(--run-bg)', fg: 'var(--run)' },
  hold: { bg: 'var(--hold-bg)', fg: 'var(--hold)' },
  backlog: { bg: 'var(--bk-bg)', fg: 'var(--bk)' },
  cancel: { bg: 'var(--cancel-bg)', fg: 'var(--cancel)' },
  rev: { bg: 'var(--soft)', fg: 'var(--ink)', border: 'var(--line)' },
  neutral: { bg: 'transparent', fg: 'inherit', border: 'var(--line)' },
};

/** Properti chip bernada. */
interface ToneChipProps {
  readonly text: string;
  readonly tone: Tone;
}

/**
 * Chip status berbentuk pil dengan warna menurut nada. Teks selalu ada sehingga status tidak hanya berupa warna.
 * Masukan: teks dan nada. Keluaran: chip kecil.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: handoff UX/UI §4 (chip status: warna dan teks), mockup v0.2 (kelas chip c-ok, c-warn, c-late, c-run, c-hold), NFR-05.
 */
export function ToneChip({ text, tone }: ToneChipProps) {
  const style = TONE_STYLE[tone];
  return (
    <Box
      component="span"
      sx={{ display: 'inline-block', fontSize: 11, lineHeight: 1.45, px: '8px', py: '1px', borderRadius: '10px', whiteSpace: 'nowrap', bgcolor: style.bg, color: style.fg, border: '1px solid', borderColor: style.border ?? 'transparent' }}
    >
      {text}
    </Box>
  );
}
