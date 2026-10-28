'use client';

import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

/** Properti kotak centang berlabel. */
interface CheckboxFieldProps {
  readonly name: string;
  readonly label: string;
  /** Nilai yang dikirim bila dicentang (bawaan "1"). */
  readonly value?: string;
  readonly defaultChecked?: boolean;
}

/**
 * Kotak centang berlabel untuk formulir. Dibuat sebagai komponen klien karena `FormControlLabel` MUI tidak dapat
 * menerima elemen kontrol dari Server Component.
 * Masukan: nama, label, nilai terkirim, dan keadaan awal. Keluaran: kotak centang dengan label terhubung.
 * Efek samping: tidak ada selain state bawaan kotak centang.
 * Rujukan: handoff UX/UI §4 (label terhubung), §9 (aksesibilitas), Screen [010] field 9.
 */
export function CheckboxField({ name, label, value = '1', defaultChecked }: CheckboxFieldProps) {
  return <FormControlLabel control={<Checkbox name={name} value={value} defaultChecked={defaultChecked} />} label={label} />;
}
