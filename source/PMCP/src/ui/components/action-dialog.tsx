'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import { useId } from 'react';
import type { ActionState } from '../action-state';
import { ActionForm, type ActionFormContext } from './action-form';

/** Properti dialog formulir. */
interface ActionDialogProps {
  readonly title: string;
  readonly submitLabel: string;
  readonly cancelLabel?: string;
  /** Server Action yang menerima FormData dan mengembalikan `ActionState`. */
  readonly action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  /** Dipanggil saat dialog ditutup (batal, atau setelah sukses bila `closeOnSuccess`). */
  readonly onClose: () => void;
  /** Dipanggil sekali setiap hasil berhasil baru. */
  readonly onSuccess?: (state: ActionState) => void;
  /** Menutup dialog otomatis setelah sukses (bawaan true). */
  readonly closeOnSuccess?: boolean;
  /** Nilai tersembunyi yang selalu dikirim (mis. id, versi baris). */
  readonly hidden?: Readonly<Record<string, string | number>>;
  readonly submitColor?: 'primary' | 'error';
  readonly maxWidth?: 'xs' | 'sm' | 'md';
  readonly children: (context: ActionFormContext) => React.ReactNode;
}

/**
 * Dialog formulir serba guna: judul, isi, pesan hasil, dan tombol Simpan/Batal di atas `ActionForm`. Dialog
 * menutup otomatis setelah sukses dan tidak dapat ditutup selagi mengirim.
 * Masukan: judul, label tombol, aksi, penutup, isian tersembunyi, dan fungsi yang menggambar isi. Keluaran: dialog.
 * Efek samping: mengirim Server Action saat Simpan; memanggil `onSuccess` dan `onClose` setelah sukses.
 * Rujukan: handoff UX/UI §4 (dialog: fokus masuk dan kembali), §9 (`aria-labelledby`).
 */
export function ActionDialog({
  title,
  submitLabel,
  cancelLabel = 'Batal',
  action,
  onClose,
  onSuccess,
  closeOnSuccess = true,
  hidden,
  submitColor,
  maxWidth = 'sm',
  children,
}: ActionDialogProps) {
  const titleId = useId();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth={maxWidth} aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <ActionForm
        action={action}
        submitLabel={submitLabel}
        hidden={hidden}
        submitColor={submitColor}
        layout="dialog"
        showSuccess={!closeOnSuccess}
        onSuccess={(state) => {
          onSuccess?.(state);
          if (closeOnSuccess) onClose();
        }}
        secondary={<Button onClick={onClose}>{cancelLabel}</Button>}
      >
        {children}
      </ActionForm>
    </Dialog>
  );
}
