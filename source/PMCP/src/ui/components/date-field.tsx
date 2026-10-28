'use client';

import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { formatDisplayDate, isIsoDate, parseDisplayDate } from '@/shared/iso-date';

/** Properti isian tanggal. */
interface DateFieldProps {
  /** Nama isian yang dikirim ke server; nilainya `YYYY-MM-DD` (atau teks mentah bila tidak valid). */
  readonly name: string;
  readonly label: string;
  /** Nilai awal `YYYY-MM-DD`. */
  readonly defaultValue?: string | null;
  readonly error?: string;
  readonly required?: boolean;
  readonly helperText?: string;
  /** Dipanggil dengan nilai yang dikirim (`YYYY-MM-DD`, teks mentah, atau kosong) setiap kali isian berubah. */
  readonly onValueChange?: (value: string) => void;
}

/**
 * Isian tanggal dd/mm/yyyy untuk pengguna yang mengirim `YYYY-MM-DD` ke server. Tanggal tidak valid dikirim apa
 * adanya supaya server menolaknya dengan pesan yang sama di semua layar (validasi utama di server, NFR-01).
 * Masukan: nama, label, nilai awal, galat, wajib, keterangan, dan penerima perubahan nilai. Keluaran: isian teks beserta isian tersembunyi.
 * Efek samping: menyimpan teks yang diketik di state komponen.
 * Rujukan: NFR-03 (tanggal tampil dd/mm/yyyy), CL-010, handoff UX/UI §7.
 */
export function DateField({ name, label, defaultValue, error, required, helperText, onValueChange }: DateFieldProps) {
  const [text, setText] = useState(defaultValue && isIsoDate(defaultValue) ? formatDisplayDate(defaultValue) : '');
  const parsed = parseDisplayDate(text);
  const submitted = text.trim() === '' ? '' : (parsed ?? text.trim());
  return (
    <>
      <TextField
        label={label}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          const next = parseDisplayDate(event.target.value);
          onValueChange?.(event.target.value.trim() === '' ? '' : (next ?? event.target.value.trim()));
        }}
        placeholder="dd/mm/yyyy"
        required={required}
        error={Boolean(error)}
        helperText={error ?? helperText}
        slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', 'aria-invalid': Boolean(error) } }}
      />
      <input type="hidden" name={name} value={submitted} />
    </>
  );
}
