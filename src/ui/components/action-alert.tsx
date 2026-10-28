import Alert from '@mui/material/Alert';
import type { ActionState } from '../action-state';

/** Properti pesan hasil aksi. */
interface ActionAlertProps {
  readonly state: ActionState;
  /** Menampilkan pesan sukses (bawaan true). Dialog yang langsung menutup dapat mematikannya. */
  readonly showSuccess?: boolean;
}

/**
 * Menampilkan pesan hasil sebuah aksi: galat dengan `role="alert"`, sukses dengan `role="status"`.
 * Masukan: state aksi. Keluaran: elemen pesan, atau tidak ada bila belum ada hasil atau pesan kosong.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: handoff UX/UI §6 dan §9 (pesan dinamis diumumkan), EC-15-01.01.
 */
export function ActionAlert({ state, showSuccess = true }: ActionAlertProps) {
  if (state.stamp === 0 || !state.message) return null;
  if (state.ok && !showSuccess) return null;
  return (
    <Alert severity={state.ok ? 'success' : 'error'} role={state.ok ? 'status' : 'alert'}>
      {state.message}
    </Alert>
  );
}
