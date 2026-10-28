import TextField from '@mui/material/TextField';
import type { PicRef } from '@/modules/project';
import { CheckboxField } from '@/ui/components/checkbox-field';
import { FilterSelect } from '@/ui/components/filter-select';
import { PROJECT_STATUS_ORDER, PROJECT_STATUS_TEXT, PROJECT_TYPE_TEXT } from '@/ui/format/project-labels';
import type { ProjectPageParams } from '../_lib/search-params';

/** Properti isian filter project. */
interface ProjectFilterFieldsProps {
  readonly params: ProjectPageParams;
  readonly pics: ReadonlyArray<PicRef>;
  /** True bila pelaku adalah PIC (menampilkan "Hanya milik saya"). */
  readonly isPic: boolean;
}

/**
 * Isian bar filter bersama Daftar dan Gantt: pencarian, status project, PIC, tahapan, status tahapan, jenis,
 * kelengkapan perencanaan, dan "Hanya milik saya" (PIC). Nilai awal mengikuti URL.
 * Masukan: keadaan halaman, daftar PIC, dan penanda PIC. Keluaran: kumpulan isian untuk `FilterBar`.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: BL-41, Screen [010] field 1 sampai 9, FR-12-03.
 */
export function ProjectFilterFields({ params, pics, isPic }: ProjectFilterFieldsProps) {
  const { filter } = params;
  return (
    <>
      <TextField name="q" label="Cari" defaultValue={filter.q ?? ''} placeholder="ID, nama, no. referensi, aplikasi, PIC" slotProps={{ htmlInput: { maxLength: 100 }, inputLabel: { shrink: true } }} />
      <FilterSelect name="status" label="Status project" defaultValue={filter.status} options={PROJECT_STATUS_ORDER.map((value) => ({ value, label: PROJECT_STATUS_TEXT[value] }))} />
      <FilterSelect name="pic" label="PIC" defaultValue={filter.picId === undefined ? '' : String(filter.picId)} options={pics.map((pic) => ({ value: String(pic.id), label: `${pic.name} (${pic.stage === 'DEV' ? 'Development' : pic.stage})` }))} />
      <FilterSelect name="tahap" label="Tahapan" defaultValue={filter.stage} options={[{ value: 'BA', label: 'BA' }, { value: 'DEV', label: 'Development' }, { value: 'QA', label: 'QA' }]} />
      <FilterSelect
        name="sts"
        label="Status tahapan"
        defaultValue={filter.stageStatus}
        emptyLabel="Semua status"
        options={[
          { value: 'OPEN', label: 'Belum selesai' },
          { value: 'RUNNING', label: 'Berjalan' },
          { value: 'LATE', label: 'Terlambat' },
          { value: 'LAGGING', label: 'Tertinggal dari laju' },
          { value: 'HELD', label: 'Ditahan' },
          { value: 'DONE', label: 'Selesai' },
        ]}
      />
      <FilterSelect name="jenis" label="Jenis project" defaultValue={filter.projectType} options={Object.entries(PROJECT_TYPE_TEXT).map(([value, label]) => ({ value, label }))} />
      <FilterSelect name="lengkap" label="Kelengkapan perencanaan" defaultValue={filter.completeness} options={[{ value: 'INCOMPLETE', label: 'Perlu dilengkapi' }, { value: 'COMPLETE', label: 'Lengkap' }]} />
      {isPic ? <CheckboxField name="milik" label="Hanya milik saya" defaultChecked={params.mineOnly} /> : null}
    </>
  );
}
