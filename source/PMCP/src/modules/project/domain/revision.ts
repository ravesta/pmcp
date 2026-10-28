/**
 * Revisi estimasi tahapan: validasi revisi manual, revisi otomatis dari rencana kartu, penggabungan revisi
 * harian, dan peringatan revisi berulang (FR-13-01, FR-13-04, FR-13-05; BL-12, BL-16, BL-18, BL-39).
 */
import { workdaysAfter } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import type { Estimate } from './stage-types';

/** Panjang catatan revisi: minimal 3, maksimum 300 karakter (FR-13-01 butir 2). */
export const REVISION_NOTE_MIN = 3;
export const REVISION_NOTE_MAX = 300;
/** Batas kolom catatan di database untuk catatan hasil penggabungan (database-design stage_revision.note). */
export const REVISION_NOTE_STORED_MAX = 2000;
/** Pemisah catatan saat beberapa perpanjangan digabung menjadi satu revisi (FR-13-05 butir 3). */
export const MERGED_NOTE_SEPARATOR = ' | ';

/** Masukan revisi estimasi manual. */
export interface ManualRevisionInput {
  readonly current: Estimate | null;
  readonly newStart: IsoDate | null;
  readonly newEnd: IsoDate | null;
  readonly categoryId: number | null;
  readonly note: string;
}

/** Galat validasi revisi per isian. */
export type RevisionIssue = 'NO_BASELINE' | 'DATES_REQUIRED' | 'END_BEFORE_START' | 'SAME_AS_CURRENT' | 'CATEGORY_REQUIRED' | 'NOTE_TOO_SHORT' | 'NOTE_TOO_LONG';

/**
 * Memeriksa masukan revisi estimasi manual.
 * Masukan: estimasi berlaku, tanggal baru, kategori, catatan. Keluaran: daftar masalah (kosong bila valid) dengan
 * catatan yang sudah dipangkas spasi di tepi.
 * Efek samping: tidak ada (fungsi murni). Tahapan tanpa estimasi tidak direvisi; estimasi pertama diisi lewat
 * pelengkapan timeline (FR-03-01), bukan revisi.
 * Rujukan: FR-13-01 butir 2 dan 3, BL-12; AC: revisi tanpa kategori ditolak.
 */
export function checkManualRevision(input: ManualRevisionInput): { issues: RevisionIssue[]; note: string } {
  const issues: RevisionIssue[] = [];
  const note = input.note.trim();
  if (!input.current) issues.push('NO_BASELINE');
  if (!input.newStart || !input.newEnd) issues.push('DATES_REQUIRED');
  else if (input.newEnd < input.newStart) issues.push('END_BEFORE_START');
  else if (input.current && input.current.start === input.newStart && input.current.end === input.newEnd) {
    issues.push('SAME_AS_CURRENT');
  }
  if (input.categoryId === null) issues.push('CATEGORY_REQUIRED');
  const noteLength = [...note].length;
  if (noteLength < REVISION_NOTE_MIN) issues.push('NOTE_TOO_SHORT');
  if (noteLength > REVISION_NOTE_MAX) issues.push('NOTE_TOO_LONG');
  return { issues, note };
}

/** Hasil pemeriksaan apakah rencana kartu memperpanjang estimasi tahapan. */
export type AutoRevisionPlan =
  | { readonly kind: 'NONE' }
  | { readonly kind: 'ADOPT_PLAN_AS_BASELINE'; readonly estimate: Estimate }
  | { readonly kind: 'EXTEND'; readonly from: IsoDate; readonly to: IsoDate; readonly workdaysOver: number };

/**
 * Menentukan apakah rencana kartu project memicu revisi estimasi otomatis. Revisi dipicu bila tanggal selesai
 * rencana melewati estimasi selesai terkini dengan selisih sedikitnya SATU HARI KERJA; estimasi baru = tanggal
 * selesai rencana (boleh jatuh pada akhir pekan). Estimasi mulai tidak dimajukan dan estimasi tidak mengecil.
 * Masukan: estimasi tahapan terkini (boleh null) dan rentang rencana kartu. Keluaran: `AutoRevisionPlan`;
 * tahapan tanpa estimasi menghasilkan tawaran menjadikan rencana sebagai estimasi awal.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-05 butir 1, 4, 5 dan 8, BL-39(a)(c)(d)(g); AC: rencana berakhir Sabtu setelah estimasi Jumat tidak memicu.
 */
export function planAutoRevision(stageEstimate: Estimate | null, plannedStart: IsoDate, plannedEnd: IsoDate): AutoRevisionPlan {
  if (!stageEstimate) return { kind: 'ADOPT_PLAN_AS_BASELINE', estimate: { start: plannedStart, end: plannedEnd } };
  const over = workdaysAfter(stageEstimate.end, plannedEnd);
  if (over < 1) return { kind: 'NONE' };
  return { kind: 'EXTEND', from: stageEstimate.end, to: plannedEnd, workdaysOver: over };
}

/** Revisi terakhir tahapan sebagai bahan keputusan penggabungan. */
export interface LastRevision {
  readonly seq: number;
  /** Tanggal bisnis (zona Asia/Jakarta) revisi dibuat. */
  readonly createdOn: IsoDate;
  readonly createdBy: number;
  /** True bila revisi berasal dari rencana kartu (punya kartu asal); revisi manual tidak digabung. */
  readonly isAutomatic: boolean;
  readonly note: string;
}

/**
 * Menentukan apakah perpanjangan otomatis baru digabung ke revisi terakhir: hanya bila revisi terakhir otomatis,
 * dibuat oleh PIC yang sama pada tanggal bisnis yang sama.
 * Masukan: revisi terakhir (boleh null), id pelaku, hari ini. Keluaran: true bila digabung.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-05 butir 3, BL-39(b); AC: dua perpanjangan oleh PIC yang sama pada hari yang sama = satu revisi.
 */
export function shouldMergeRevision(last: LastRevision | null, actorUserId: number, today: IsoDate): boolean {
  return last !== null && last.isAutomatic && last.createdBy === actorUserId && last.createdOn === today;
}

/**
 * Menggabungkan catatan revisi lama dan baru dengan pemisah, dipangkas ke batas kolom.
 * Masukan: catatan lama dan baru. Keluaran: catatan gabungan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-05 butir 3 ("catatan digabung dengan pemisah").
 */
export function mergeRevisionNotes(previous: string, added: string): string {
  const merged = `${previous}${MERGED_NOTE_SEPARATOR}${added}`;
  return [...merged].slice(0, REVISION_NOTE_STORED_MAX).join('');
}

/** Status peringatan revisi berulang. */
export interface RevisionWarning {
  /** Jumlah revisi sudah mencapai batas: penanda pada kartu tahapan, detail, Gantt, dan dialog revisi berikutnya. */
  readonly atLimit: boolean;
  /** Revisi yang baru disimpan mencapai atau melewati batas: pemberitahuan dan catatan di Jejak Perubahan. */
  readonly justReached: boolean;
}

/**
 * Menilai peringatan revisi berulang. Peringatan tidak pernah memblokir revisi.
 * Masukan: jumlah revisi sekarang, batas peringatan (master, awal 3), dan apakah revisi baru saja disimpan
 * (jumlah sudah termasuk revisi itu). Keluaran: `RevisionWarning`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-04, BL-18; AC: revisi ke-3 pada batas 3 menampilkan pemberitahuan; revisi ke-4 tetap dapat disimpan.
 */
export function revisionWarning(revisionCount: number, threshold: number, justSaved = false): RevisionWarning {
  const atLimit = revisionCount >= threshold;
  return { atLimit, justReached: justSaved && atLimit };
}

/**
 * Menghitung pergeseran estimasi selesai terhadap estimasi awal dalam hari kerja (positif = mundur).
 * Masukan: estimasi awal dan terkini. Keluaran: hari kerja bertanda; 0 bila sama.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-13-05 butir 9, BL-39(h).
 */
export function estimateShiftWorkdays(baseline: Estimate, current: Estimate): number {
  if (current.end >= baseline.end) return workdaysAfter(baseline.end, current.end);
  return -workdaysAfter(current.end, baseline.end);
}
