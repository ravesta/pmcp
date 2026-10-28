'use client';

import TextField from '@mui/material/TextField';
import { formatDisplayDate, isIsoDate } from '@/shared/iso-date';
import type { MasterChoice } from '@/modules/kanban';
import { FieldsetBox } from '@/ui/components/fieldset-box';
import type { PlanPreview } from './use-plan-preview';

/** Properti isian revisi estimasi tahapan dari rencana kartu. */
interface RevisionFieldsProps {
  readonly preview: PlanPreview | null;
  readonly categories: ReadonlyArray<MasterChoice>;
  readonly errors: Readonly<Record<string, string>>;
}

/**
 * Kotak revisi otomatis estimasi tahapan: muncul hanya bila rencana kartu melewati estimasi selesai tahapan. Menampilkan
 * pratinjau ("Estimasi tahapan akan otomatis direvisi dari X menjadi Y, Revisi ke-n") dan mewajibkan kategori alasan
 * serta catatan; tidak ada pilihan menyimpan tanpa merevisi.
 * Masukan: pratinjau, kategori alasan revisi, dan galat per isian. Keluaran: kotak isian, atau tidak ada bila tidak perlu.
 * Efek samping: tidak ada selain state isian anak.
 * Rujukan: FR-13-05 butir 2, FR-13-01 (kategori dan catatan), BL-16.
 */
export function RevisionFields({ preview, categories, errors }: RevisionFieldsProps) {
  if (!preview || preview.kind !== 'EXTEND' || !preview.from || !preview.to || !isIsoDate(preview.from) || !isIsoDate(preview.to)) return null;
  return (
    <FieldsetBox legend="Revisi estimasi tahapan" hint="wajib karena rencana melewati estimasi tahapan">
      <div role="status" style={{ background: 'var(--warn-bg)', color: 'var(--warn)', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
        Estimasi tahapan akan otomatis direvisi dari {formatDisplayDate(preview.from)} menjadi {formatDisplayDate(preview.to)} (Revisi ke-{preview.nextSeq}, melewati {preview.workdaysOver} hari kerja).
      </div>
      <TextField select name="revisionCategoryId" label="Kategori alasan" defaultValue="" slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(errors['revision.category'])} helperText={errors['revision.category']}>
        <option value="">Pilih kategori</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </TextField>
      <TextField name="revisionNote" label="Catatan alasan" multiline rows={2} placeholder="Jelaskan penyebab perpanjangan" error={Boolean(errors['revision.note'])} helperText={errors['revision.note'] ?? 'Minimal 3 karakter.'} />
    </FieldsetBox>
  );
}
