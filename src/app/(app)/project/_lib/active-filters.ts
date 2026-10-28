/**
 * Penanda filter aktif pada bar filter Project: label yang terbaca dan alamat untuk melepas tiap filter satu per satu.
 */
import type { PicRef } from '@/modules/project';
import type { ActiveFilter } from '@/ui/components/filter-bar';
import { PROJECT_STATUS_TEXT, PROJECT_TYPE_TEXT, STAGE_FULL_TEXT } from '@/ui/format/project-labels';
import type { ProjectPageParams } from './search-params';

/** Nama status tahapan pada filter (Screen [010] field 6). */
const STAGE_STATUS_LABEL: Readonly<Record<string, string>> = {
  OPEN: 'Belum selesai',
  RUNNING: 'Berjalan',
  LATE: 'Terlambat',
  LAGGING: 'Tertinggal dari laju',
  HELD: 'Ditahan',
  DONE: 'Selesai',
};

/** Nama kelengkapan perencanaan pada filter (FR-10-01 butir 2). */
const COMPLETENESS_LABEL: Readonly<Record<string, string>> = {
  INCOMPLETE: 'Belum lengkap (PIC/timeline)',
  NO_PIC: 'Belum ada PIC',
  NO_TIMELINE: 'Belum ada timeline',
  COMPLETE: 'Sudah lengkap',
};

/** Bahan untuk menulis label filter. */
export interface ActiveFilterContext {
  readonly pics: ReadonlyArray<PicRef>;
  readonly projects: ReadonlyArray<{ id: number; name: string }>;
}

/** Pembuat alamat halaman dengan sebagian keadaan diganti. */
export type HrefBuilder = (overrides: Partial<ProjectPageParams>) => string;

/**
 * Menyusun daftar filter aktif beserta alamat untuk melepas masing-masing (halaman kembali ke 1).
 * Masukan: keadaan halaman, bahan label, dan pembuat alamat. Keluaran: daftar filter aktif berurutan seperti bar filter.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Screen [010] (penanda filter aktif), BL-41, mockup v0.2 (fungsi chipsHtml).
 */
export function buildActiveFilters(params: ProjectPageParams, context: ActiveFilterContext, hrefFor: HrefBuilder): ActiveFilter[] {
  const { filter } = params;
  const without = (key: keyof typeof filter): string => {
    const next = { ...filter };
    delete next[key];
    return hrefFor({ filter: next, page: 1 });
  };
  const result: ActiveFilter[] = [];
  if (filter.q) result.push({ label: `Cari: ${filter.q}`, removeHref: without('q') });
  if (filter.status) result.push({ label: `Status project: ${PROJECT_STATUS_TEXT[filter.status]}`, removeHref: without('status') });
  if (filter.projectIds?.length) {
    const names = filter.projectIds.map((id) => context.projects.find((p) => p.id === id)?.name ?? String(id));
    result.push({ label: `Project: ${names.length <= 2 ? names.join(', ') : `${names.length} project`}`, removeHref: without('projectIds') });
  }
  if (filter.picId !== undefined) result.push({ label: `PIC: ${context.pics.find((p) => p.id === filter.picId)?.name ?? filter.picId}`, removeHref: without('picId') });
  if (filter.stage) result.push({ label: `Tahapan: ${STAGE_FULL_TEXT[filter.stage]}`, removeHref: without('stage') });
  if (filter.stageStatus) result.push({ label: `Status tahapan: ${STAGE_STATUS_LABEL[filter.stageStatus] ?? filter.stageStatus}`, removeHref: without('stageStatus') });
  if (filter.projectType) result.push({ label: `Jenis: ${PROJECT_TYPE_TEXT[filter.projectType]}`, removeHref: without('projectType') });
  if (filter.completeness) result.push({ label: `Kelengkapan: ${COMPLETENESS_LABEL[filter.completeness] ?? filter.completeness}`, removeHref: without('completeness') });
  if (params.mineOnly) {
    const next = { ...filter };
    delete next.mineOnlyPicId;
    result.push({ label: 'Hanya milik saya', removeHref: hrefFor({ filter: next, mineOnly: false, page: 1 }) });
  }
  return result;
}

/**
 * Menghitung filter lanjutan yang aktif (untuk lencana tombol "Filter lanjutan").
 * Masukan: keadaan halaman. Keluaran: jumlah filter lanjutan aktif (PIC, tahapan, status tahapan, jenis, kelengkapan, milik saya).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: mockup v0.2 (variabel nAdv).
 */
export function advancedFilterCount(params: ProjectPageParams): number {
  const { filter } = params;
  return [filter.picId, filter.stage, filter.stageStatus, filter.projectType, filter.completeness].filter((v) => v !== undefined).length + (params.mineOnly ? 1 : 0);
}
