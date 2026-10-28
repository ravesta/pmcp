/**
 * Tipe dasar domain project dan tahapan (tanpa fungsi), dipakai bersama aturan hitung di folder ini.
 *
 * Nilai enum sama dengan tipe enum database (migrasi 1) supaya pemetaan repository sederhana.
 */
import type { IsoDate } from '@/shared/iso-date';

/** Tahapan project: Business Analysis, Development, Quality Assurance (BL-01). */
export type StageKind = 'BA' | 'DEV' | 'QA';

/** Status tahapan: Belum Mulai, Berjalan, Ditahan, Selesai (FR-05-01 butir 1). */
export type StageStatus = 'NOT_STARTED' | 'RUNNING' | 'HELD' | 'DONE';

/** Status project: Backlog, Berjalan, Ditunda, Batal, Selesai (FR-14-01 butir 1). */
export type ProjectStatus = 'BACKLOG' | 'RUNNING' | 'DEFERRED' | 'CANCELLED' | 'COMPLETED';

/** Rentang estimasi tahapan (kedua ujung inklusif). */
export interface Estimate {
  readonly start: IsoDate;
  readonly end: IsoDate;
}

/**
 * Satu periode hold. `resumedOn` null berarti hold masih berjalan. Hari kerja hold dihitung dari `since`
 * sampai HARI SEBELUM `resumedOn` (atau sampai kemarin bila masih berjalan), FR-05-02 butir 6.
 */
export interface HoldPeriod {
  readonly since: IsoDate;
  readonly resumedOn: IsoDate | null;
}

/** Penanda peran pelaku yang dibutuhkan aturan hak tahapan; sebentuk dengan `Actor` modul auth. */
export interface StageActor {
  readonly role: 'MANAGER' | 'PIC';
  /** Id PIC bagi akun PIC; null untuk Manager. */
  readonly picId: number | null;
  /** Tahapan tetap PIC (BA atau QA); null untuk Manager. */
  readonly picStage: StageKind | null;
}
