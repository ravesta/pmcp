import type { ReactNode } from 'react';

/** Properti kotak isian berjudul. */
interface FieldsetBoxProps {
  readonly legend: string;
  /** Keterangan kecil di samping judul (mis. "kosongkan bila tidak berubah"). */
  readonly hint?: string;
  readonly children: ReactNode;
}

/**
 * Kotak isian berjudul (`<fieldset>` dengan `<legend>`) untuk mengelompokkan isian terkait di dalam dialog, seperti
 * "PIC" dan "Revisi estimasi". Kelompok dibacakan pembaca layar sebagai satu grup.
 * Masukan: judul, keterangan, dan isian. Keluaran: kotak bertepi.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: Screen [016], mockup v0.2 (kelas fsx), NFR-05 (pengelompokan isian).
 */
export function FieldsetBox({ legend, hint, children }: FieldsetBoxProps) {
  return (
    <fieldset style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '12px', margin: 0, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <legend style={{ padding: '0 6px', fontWeight: 600, fontSize: 13 }}>
        {legend}
        {hint ? <span style={{ fontWeight: 400, color: 'var(--muted)' }}> ({hint})</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}
