'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useState, useTransition } from 'react';
import { initialActionState, type ActionState } from '../action-state';

/** Properti tombol yang langsung menjalankan Server Action. */
interface ActionButtonProps {
  /** Server Action yang menerima FormData dan mengembalikan `ActionState`. */
  readonly action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  /** Isian yang dikirim (mis. id dan versi baris). */
  readonly fields: Readonly<Record<string, string | number>>;
  readonly label: string;
  readonly ariaLabel?: string;
  readonly variant?: 'contained' | 'outlined' | 'text';
  readonly color?: 'primary' | 'error';
  readonly size?: 'small' | 'medium';
  readonly disabled?: boolean;
  /** Menandai tombol sebagai terpilih (untuk pilihan seperti progres 0/25/50/75). */
  readonly pressed?: boolean;
  /** Menampilkan pesan galat di bawah tombol (matikan bila pemanggil menampilkan galatnya sendiri). */
  readonly showError?: boolean;
}

/**
 * Tombol kecil yang langsung mengirim Server Action tanpa formulir: pindah kolom, pilih progres, hapus log. Halaman
 * disegarkan otomatis oleh `revalidatePath` pada aksi; galat ditampilkan di bawah tombol.
 * Masukan: aksi, isian, label, dan gaya. Keluaran: tombol (dan pesan galat bila gagal).
 * Efek samping: mengirim Server Action saat diklik.
 * Rujukan: FR-16-02 butir 1 (tombol panah), FR-16-03, FR-18-01 butir 4, handoff UX/UI §6 (galat terlihat).
 */
export function ActionButton({ action, fields, label, ariaLabel, variant = 'outlined', color = 'primary', size = 'small', disabled, pressed, showError = true }: ActionButtonProps) {
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, startTransition] = useTransition();

  /** Mengirim aksi dalam transisi dan menyimpan hasilnya. Efek samping: memanggil Server Action. */
  function run(): void {
    const formData = new FormData();
    for (const [name, value] of Object.entries(fields)) formData.set(name, String(value));
    startTransition(async () => setState(await action(initialActionState, formData)));
  }

  return (
    <Box component="span" sx={{ display: 'inline-flex', flexDirection: 'column', gap: 0.5 }}>
      <Button type="button" size={size} variant={variant} color={color} disabled={disabled || pending} aria-label={ariaLabel ?? label} aria-pressed={pressed} onClick={(event) => { event.stopPropagation(); run(); }}>
        {label}
      </Button>
      {showError && !state.ok && state.message ? <Alert severity="error" role="alert" sx={{ py: 0 }}>{state.message}</Alert> : null}
    </Box>
  );
}
