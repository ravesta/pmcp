import TextField from '@mui/material/TextField';

/** Satu pilihan pada dropdown filter. */
export interface FilterOption {
  readonly value: string;
  readonly label: string;
}

/** Properti dropdown filter. */
interface FilterSelectProps {
  readonly name: string;
  readonly label: string;
  readonly options: ReadonlyArray<FilterOption>;
  readonly defaultValue?: string;
  /** Label pilihan kosong (bawaan "Semua"). */
  readonly emptyLabel?: string;
}

/**
 * Dropdown filter bawaan browser (`<select>`) untuk formulir GET: berfungsi tanpa JavaScript klien sehingga halaman
 * tetap dirender server dan tahan tombol kembali.
 * Masukan: nama, label, pilihan, nilai awal, dan label pilihan kosong. Keluaran: dropdown berlabel.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: Screen [010] (bar filter), handoff UX/UI §4 (Select), NFR-05 (label terhubung).
 */
export function FilterSelect({ name, label, options, defaultValue = '', emptyLabel = 'Semua' }: FilterSelectProps) {
  return (
    <TextField select name={name} label={label} defaultValue={defaultValue} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </TextField>
  );
}
