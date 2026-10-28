/**
 * Tipe dasar domain Kanban: jenis kartu, kolom papan, dan keadaan kartu yang dinilai aturan domain.
 */
import type { IsoDate } from '@/shared/iso-date';

/** Jenis kartu: rencana project atau activity di luar project (FR-16-01 butir 2). */
export type CardKind = 'PROJECT' | 'ACTIVITY';

/** Kolom papan: Planned, In Progress, Done (FR-16-01 butir 1). */
export type CardColumn = 'PLANNED' | 'IN_PROGRESS' | 'DONE';

/** Progres yang dapat dipilih saat In Progress (FR-16-03 butir 2). */
export const CARD_PROGRESS_CHOICES = [0, 25, 50, 75] as const;

/** Keadaan kartu yang relevan bagi aturan perpindahan, progres, jadwal ulang, dan penanda. */
export interface CardState {
  readonly column: CardColumn;
  /** Progres tersimpan (0/25/50/75); progres Done dan Planned diturunkan dari kolom. */
  readonly progress: number;
  readonly progressNeedsInput: boolean;
  readonly planStart: IsoDate;
  readonly planEnd: IsoDate;
  readonly doneOn: IsoDate | null;
  readonly cancelled: boolean;
}
