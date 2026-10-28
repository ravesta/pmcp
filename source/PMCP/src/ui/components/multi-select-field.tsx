'use client';

import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useState } from 'react';

/** Satu pilihan pada isian pilihan ganda. */
export interface Choice {
  readonly id: number;
  readonly label: string;
}

/** Properti isian pilihan ganda. */
interface MultiSelectFieldProps {
  /** Nama isian; setiap pilihan dikirim sebagai pasangan `name=id` (isian berulang). */
  readonly name: string;
  readonly label: string;
  readonly options: ReadonlyArray<Choice>;
  readonly defaultIds?: ReadonlyArray<number>;
  readonly error?: string;
  readonly helperText?: string;
}

/**
 * Isian pilihan ganda dengan pencarian (Autocomplete) yang mengirim id terpilih sebagai isian tersembunyi berulang.
 * Masukan: nama, label, pilihan, id awal, galat, dan keterangan. Keluaran: isian dan isian tersembunyi.
 * Efek samping: menyimpan pilihan di state komponen.
 * Rujukan: handoff UX/UI §4 (pilihan ganda dengan pencarian: nama project, PIC, aplikasi), FR-02-01, FR-02-02.
 */
export function MultiSelectField({ name, label, options, defaultIds = [], error, helperText }: MultiSelectFieldProps) {
  const [selected, setSelected] = useState<Choice[]>(options.filter((o) => defaultIds.includes(o.id)));
  return (
    <>
      <Autocomplete
        multiple
        options={[...options]}
        value={selected}
        onChange={(_event, next) => setSelected(next)}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        noOptionsText="Tidak ada pilihan"
        renderInput={(params) => <TextField {...params} label={label} error={Boolean(error)} helperText={error ?? helperText} />}
      />
      {selected.map((choice) => (
        <input key={choice.id} type="hidden" name={name} value={choice.id} />
      ))}
    </>
  );
}
