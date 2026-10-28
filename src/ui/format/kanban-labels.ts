/**
 * Label dan nada tampilan Kanban: durasi, jam, rentang rencana, dan chip penanda rencana kartu.
 *
 * Fungsi murni agar mudah diuji; logika penanda ada di domain kanban, di sini hanya teks dan warnanya.
 */
import type { CardColumn, PlanMarker } from '@/modules/kanban';
import { formatDisplayDate, type IsoDate } from '@/shared/iso-date';
import type { Tone } from './project-labels';

/** Keterangan Indonesia di samping nama kolom papan (mockup v0.2, KCOLD). */
export const COLUMN_DESCRIPTION: Readonly<Record<CardColumn, string>> = {
  PLANNED: 'Direncanakan',
  IN_PROGRESS: 'Sedang dikerjakan',
  DONE: 'Selesai',
};

/** Urutan kolom papan dari kiri ke kanan. */
export const COLUMN_ORDER: ReadonlyArray<CardColumn> = ['PLANNED', 'IN_PROGRESS', 'DONE'];

/**
 * Menentukan kolom sebelum dan sesudah sebuah kolom (null di ujung) untuk tombol panah.
 * Masukan: kolom. Keluaran: kolom sebelumnya dan berikutnya.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-16-02 butir 1, mockup v0.2 (data-kmove).
 */
export function neighbours(column: CardColumn): { previous: CardColumn | null; next: CardColumn | null } {
  const index = COLUMN_ORDER.indexOf(column);
  return { previous: COLUMN_ORDER[index - 1] ?? null, next: COLUMN_ORDER[index + 1] ?? null };
}

/**
 * Menulis durasi dalam menit seperti mockup: "45 mnt", "2 j", "1 j 30 mnt".
 * Masukan: menit. Keluaran: teks.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: mockup v0.2 (fdur), FR-18-01 butir 5.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mnt`;
  const rest = minutes % 60;
  return `${Math.floor(minutes / 60)} j${rest > 0 ? ` ${rest} mnt` : ''}`;
}

/**
 * Menulis menit sejak 00:00 sebagai "HH:MM".
 * Masukan: menit. Keluaran: teks jam.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-18-01 butir 1.
 */
export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Menulis rencana kartu ringkas "dd/mm - dd/mm" (satu tanggal bila mulai sama dengan selesai).
 * Masukan: mulai dan selesai. Keluaran: teks.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: mockup v0.2 (kcard, kolom Rencana).
 */
export function formatPlanRange(start: IsoDate, end: IsoDate): string {
  const short = (date: IsoDate) => formatDisplayDate(date).slice(0, 5);
  return start === end ? short(start) : `${short(start)} - ${short(end)}`;
}

/**
 * Mengubah penanda rencana menjadi teks dan nada chip.
 * Masukan: penanda. Keluaran: teks dan nada.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-21-02 butir 2, mockup v0.2 (kFlags).
 */
export function markerChip(marker: PlanMarker): { text: string; tone: Tone } {
  switch (marker.kind) {
    case 'NOT_STARTED':
      return { text: 'Belum dimulai', tone: 'warn' };
    case 'PAST_PLAN':
      return { text: `Melewati rencana ${marker.days} hr`, tone: 'late' };
    case 'ON_PLAN':
      return { text: 'Sesuai rencana', tone: 'ok' };
    case 'LATE_DONE':
      return { text: `Terlambat ${marker.days} hr`, tone: 'late' };
    case 'ADHOC':
      return { text: 'Dadakan', tone: 'hold' };
    case 'OVER_ESTIMATE':
      return { text: 'Melebihi estimasi jam', tone: 'warn' };
    case 'RESCHEDULED':
      return marker.warn ? { text: `Jadwal ulang ${marker.count}× ⚠`, tone: 'late' } : { text: `Jadwal ulang ${marker.count}×`, tone: 'rev' };
    case 'EXTENDS_STAGE':
      return { text: `Di luar estimasi tahapan +${marker.workdays} hk`, tone: 'warn' };
    case 'PROGRESS_NEEDED':
      return { text: 'Progres perlu diisi', tone: 'warn' };
  }
}
