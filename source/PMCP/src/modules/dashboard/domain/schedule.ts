/**
 * Benturan jadwal antar tahapan milik satu PIC (FR-07-04): dua tahapan yang tumpang tindih sedikitnya satu hari kerja.
 * Fungsi murni.
 */
import { workdaysInclusive, type DateRange } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import { intersect } from './capacity';

/** Tahapan bertimeline milik PIC. */
export interface ScheduledStage {
  readonly key: string;
  readonly label: string;
  readonly start: IsoDate;
  readonly end: IsoDate;
}

/** Sepasang tahapan yang berbenturan beserta rentang irisannya. */
export interface ScheduleConflict {
  readonly first: string;
  readonly second: string;
  readonly overlap: DateRange;
}

/**
 * Mencari semua pasangan tahapan yang beririsan sedikitnya satu hari kerja.
 * Masukan: tahapan bertimeline. Keluaran: daftar benturan berurutan menurut mulai irisan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-07-04 butir 2; AC: dua tahapan beririsan 28/10 sampai 04/11 tampil sebagai satu benturan dengan rentang itu.
 */
export function findScheduleConflicts(stages: ReadonlyArray<ScheduledStage>): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < stages.length; i += 1) {
    for (let j = i + 1; j < stages.length; j += 1) {
      const a = stages[i] as ScheduledStage;
      const b = stages[j] as ScheduledStage;
      const overlap = intersect({ start: a.start, end: a.end }, { start: b.start, end: b.end });
      if (overlap && workdaysInclusive(overlap.start, overlap.end) >= 1) conflicts.push({ first: a.label, second: b.label, overlap });
    }
  }
  return conflicts.sort((x, y) => x.overlap.start.localeCompare(y.overlap.start));
}
