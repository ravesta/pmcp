/**
 * Parameter URL tab Project: membaca (dengan daftar putih) dan menyusun kembali alamat halaman.
 *
 * Filter, periode, zoom, halaman, dan tampilan Daftar atau Gantt seluruhnya berada di URL sehingga halaman
 * dirender server dan tahan tombol kembali (Technical Design §7.1, TD-03). Nilai dari URL tidak tepercaya:
 * hanya nilai yang dikenal yang diterima, selebihnya diabaikan.
 */
import type { ProjectFilter, ProjectStatus, ProjectViewMode, StageKind, StageStatusFilter } from '@/modules/project';
import type { IsoDate } from '@/shared/iso-date';
import { normalizeWindow, parseZoom, type MonthWindow, type Zoom } from '@/ui/gantt/timeline';

/** Parameter mentah dari Next.js (`searchParams`). */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Seluruh keadaan halaman Project yang tersimpan di URL. */
export interface ProjectPageParams {
  readonly mode: ProjectViewMode;
  readonly filter: ProjectFilter;
  /** True bila "Hanya milik saya" dicentang (hanya berlaku bagi PIC). */
  readonly mineOnly: boolean;
  readonly page: number;
  /** Ukuran halaman mentah (0 = bawaan tampilan); dinormalkan oleh query. */
  readonly pageSize: number;
  readonly window: MonthWindow;
  readonly zoom: Zoom;
  /** Menampilkan lapisan estimasi awal dan aktual pada Gantt (FR-12-02 butir 7). */
  readonly showLayers: boolean;
}

const STATUSES: ReadonlyArray<ProjectStatus> = ['BACKLOG', 'RUNNING', 'DEFERRED', 'CANCELLED', 'COMPLETED'];
const STAGES: ReadonlyArray<StageKind> = ['BA', 'DEV', 'QA'];
const STAGE_STATUSES: ReadonlyArray<StageStatusFilter> = ['OPEN', 'RUNNING', 'LATE', 'LAGGING', 'HELD', 'DONE'];

/**
 * Mengambil nilai tunggal sebuah parameter (parameter berulang memakai yang pertama).
 * Masukan: parameter mentah dan nama. Keluaran: teks atau undefined.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §7.
 */
function single(raw: RawSearchParams, name: string): string | undefined {
  const value = raw[name];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Mengambil semua nilai bilangan bulat dari parameter berulang (mis. `proyek=3&proyek=5`).
 * Masukan: parameter mentah dan nama. Keluaran: daftar bilangan bulat tanpa duplikat, dibatasi jumlahnya.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Screen [010] field 2 (Nama project pilihan ganda), Security Design §7.
 */
function integers(raw: RawSearchParams, name: string): number[] {
  const value = raw[name];
  const list = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return [...new Set(list.filter((item) => /^\d{1,9}$/.test(item)).map(Number))].slice(0, 50);
}

/**
 * Memilih nilai dari daftar putih; selain itu undefined.
 * Masukan: teks dan daftar nilai yang diizinkan. Keluaran: nilai yang diizinkan atau undefined.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §7.
 */
function oneOf<T extends string>(value: string | undefined, allowed: ReadonlyArray<T>): T | undefined {
  return allowed.find((item) => item === value);
}

/**
 * Membaca bilangan bulat positif dari teks.
 * Masukan: teks dan nilai bawaan. Keluaran: bilangan bulat positif atau nilai bawaan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §7.
 */
function positiveInt(value: string | undefined, fallback: number): number {
  return value && /^\d{1,9}$/.test(value) && Number(value) > 0 ? Number(value) : fallback;
}

/**
 * Membaca keadaan halaman Project dari parameter URL.
 * Masukan: parameter mentah, id PIC pelaku (null untuk Manager), dan hari ini. Keluaran: `ProjectPageParams`.
 * Efek samping: tidak ada (fungsi murni). Tampilan awal Gantt (BL-41).
 * Rujukan: BL-41, FR-10-02, FR-12-01 butir 2 sampai 6.
 */
export function parseProjectParams(raw: RawSearchParams, actorPicId: number | null, today: IsoDate): ProjectPageParams {
  const q = single(raw, 'q')?.trim().slice(0, 100);
  const picRaw = single(raw, 'pic');
  const mineOnly = actorPicId !== null && single(raw, 'milik') === '1';
  const stageStatus = oneOf(single(raw, 'sts'), STAGE_STATUSES);
  const completeness = oneOf(single(raw, 'lengkap'), ['COMPLETE', 'INCOMPLETE', 'NO_PIC', 'NO_TIMELINE'] as const);
  const projectType = oneOf(single(raw, 'jenis'), ['NEW', 'CHANGE_REQUEST'] as const);
  const filter: ProjectFilter = {
    ...(q ? { q } : {}),
    ...(oneOf(single(raw, 'status'), STATUSES) ? { status: oneOf(single(raw, 'status'), STATUSES) } : {}),
    ...(picRaw && /^\d{1,9}$/.test(picRaw) ? { picId: Number(picRaw) } : {}),
    ...(oneOf(single(raw, 'tahap'), STAGES) ? { stage: oneOf(single(raw, 'tahap'), STAGES) } : {}),
    ...(stageStatus ? { stageStatus } : {}),
    ...(projectType ? { projectType } : {}),
    ...(completeness ? { completeness } : {}),
    ...(mineOnly && actorPicId !== null ? { mineOnlyPicId: actorPicId } : {}),
    ...(integers(raw, 'proyek').length > 0 ? { projectIds: integers(raw, 'proyek') } : {}),
  };
  return {
    mode: single(raw, 'v') === 'daftar' ? 'LIST' : 'GANTT',
    filter,
    mineOnly,
    page: positiveInt(single(raw, 'hal'), 1),
    pageSize: positiveInt(single(raw, 'per'), 0),
    window: normalizeWindow(single(raw, 'dari'), single(raw, 'sampai'), today),
    zoom: parseZoom(single(raw, 'zoom')),
    showLayers: single(raw, 'lapisan') !== '0',
  };
}

/**
 * Menyusun alamat halaman Project dari keadaan, dengan sebagian nilai diganti. Hanya nilai yang berbeda dari
 * bawaan yang ditulis supaya alamat tetap pendek.
 * Masukan: keadaan halaman, nilai pengganti, dan hari ini (untuk jendela bawaan). Keluaran: alamat relatif.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: BL-41 (filter dipertahankan saat berpindah tampilan), FR-14-02 butir 3.
 */
export function buildProjectHref(params: ProjectPageParams, overrides: Partial<ProjectPageParams> = {}, defaultWindow?: MonthWindow): string {
  const next = { ...params, ...overrides };
  const query = new URLSearchParams();
  if (next.mode === 'LIST') query.set('v', 'daftar');
  const { filter } = next;
  if (filter.q) query.set('q', filter.q);
  if (filter.status) query.set('status', filter.status);
  if (filter.picId !== undefined) query.set('pic', String(filter.picId));
  if (filter.stage) query.set('tahap', filter.stage);
  if (filter.stageStatus && filter.stageStatus !== 'ALL') query.set('sts', filter.stageStatus);
  if (filter.projectType) query.set('jenis', filter.projectType);
  if (filter.completeness) query.set('lengkap', filter.completeness);
  for (const id of filter.projectIds ?? []) query.append('proyek', String(id));
  if (next.mineOnly) query.set('milik', '1');
  if (next.page > 1) query.set('hal', String(next.page));
  if (next.pageSize > 0) query.set('per', String(next.pageSize));
  if (next.mode === 'GANTT') {
    if (!defaultWindow || next.window.from !== defaultWindow.from || next.window.to !== defaultWindow.to) {
      query.set('dari', next.window.from);
      query.set('sampai', next.window.to);
    }
    if (next.zoom !== 'WEEK') query.set('zoom', next.zoom);
    if (!next.showLayers) query.set('lapisan', '0');
  }
  const text = query.toString();
  return text ? `/project?${text}` : '/project';
}

/**
 * Menghitung banyaknya filter yang aktif (untuk penanda dan tombol "Reset semua").
 * Masukan: keadaan halaman. Keluaran: jumlah filter aktif.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Screen [010] (penanda filter aktif, Reset semua).
 */
export function activeFilterCount(params: ProjectPageParams): number {
  const { filter } = params;
  return [filter.q, filter.status, filter.picId, filter.stage, filter.stageStatus, filter.projectType, filter.completeness].filter((v) => v !== undefined).length + (filter.projectIds?.length ? 1 : 0) + (params.mineOnly ? 1 : 0);
}
