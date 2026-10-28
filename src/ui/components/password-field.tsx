'use client';

import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

/** Properti isian password. */
interface PasswordFieldProps {
  readonly name: string;
  readonly label: string;
  readonly autoComplete: 'current-password' | 'new-password';
  /** Id elemen pesan galat yang menjelaskan isian ini (aksesibilitas). */
  readonly describedBy?: string;
  /** Galat khusus isian ini. */
  readonly error?: string;
  /** Teks bantu di bawah isian. */
  readonly helperText?: string;
  /** Dipanggil saat nilai berubah (mis. untuk daftar aturan password langsung). */
  readonly onValueChange?: (value: string) => void;
}

/**
 * Isian password dengan tombol "Lihat/Sembunyi" berupa kata (bukan ikon saja).
 * Masukan: properti isian. Keluaran: elemen isian.
 * Efek samping: menyimpan state tampil/sembunyi di komponen; tidak menyimpan password di mana pun selain isian.
 * Rujukan: handoff UX/UI §4 dan §5.2, FR-01-02.
 */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      name={props.name}
      label={props.label}
      type={visible ? 'text' : 'password'}
      autoComplete={props.autoComplete}
      error={Boolean(props.error)}
      helperText={props.error ?? props.helperText}
      onChange={(event) => props.onValueChange?.(event.target.value)}
      slotProps={{
        htmlInput: { 'aria-describedby': props.describedBy, maxLength: 200, autoCapitalize: 'none', spellCheck: false },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Button size="small" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}>
                {visible ? 'Sembunyi' : 'Lihat'}
              </Button>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
