/**
 * Kepatuhan rencana per PIC dan periode (FR-21-05, BL-34).
 *
 * Kepatuhan = kartu selesai tepat waktu dibagi kartu rencana yang sudah jatuh tempo pada periode. Kartu dadakan dan
 * kartu dibatalkan tidak masuk penyebut. Seluruh fungsi murni.
 */
import type { DateRange } from '@/shared/calendar';
import type { IsoDate } from '@/shared/iso-date';
import { percentRounded } from '@/shared/rounding';

/** Kartu yang dinilai kepatuhannya. */
export interface ComplianceCard {
  readonly ownerPicId: number;
  readonly planStart: IsoDate;
  readonly planEnd: IsoDate;
  readonly doneOn: IsoDate | null;
  readonly isAdhoc: boolean;
  readonly cancelled: boolean;
  /** Jumlah jadwal ulang yang pernah dilakukan. */
  readonly rescheduleCount: number;
}

/** Rincian kepatuhan satu PIC. */
export interface ComplianceRow {
  readonly picId: number;
  readonly planned: number;
  readonly due: number;
  readonly onTime: number;
  readonly late: number;
  readonly overdueOpen: number;
  readonly notDue: number;
  readonly rescheduled: number;
  readonly adhoc: number;
  /** Persen dibulatkan; null (tampil "-") bila belum ada kartu jatuh tempo. */
  readonly percent: number | null;
}

/**
 * Menghitung kepatuhan per PIC pada periode. Direncanakan = kartu rencana (bukan dadakan, tidak dibatalkan) yang
 * tanggal selesai rencana terkininya berada pada periode; jatuh tempo bila tanggal itu hari ini atau sebelumnya;
 * dadakan = kartu dadakan yang rencana mulainya pada periode (di luar Direncanakan). Baris PIC tanpa rencana maupun
 * dadakan tidak dikembalikan.
 * Masukan: kartu, periode inklusif, hari ini. Keluaran: baris per PIC, berurutan menurut id PIC.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-21-05 butir 1 sampai 6; AC: 4 jatuh tempo, 3 tepat waktu = 75%; 5 direncanakan, 4 jatuh tempo (3 tepat
 * waktu, 1 lewat belum selesai), 1 belum jatuh tempo = Direncanakan 5, Kepatuhan 75%.
 */
export function computeCompliance(cards: ReadonlyArray<ComplianceCard>, range: DateRange, today: IsoDate): ComplianceRow[] {
  const rows = new Map<number, { -readonly [K in keyof ComplianceRow]: ComplianceRow[K] }>();
  const rowFor = (picId: number) => {
    let row = rows.get(picId);
    if (!row) {
      row = { picId, planned: 0, due: 0, onTime: 0, late: 0, overdueOpen: 0, notDue: 0, rescheduled: 0, adhoc: 0, percent: null };
      rows.set(picId, row);
    }
    return row;
  };
  for (const card of cards) {
    if (card.cancelled) continue;
    if (card.isAdhoc) {
      if (card.planStart >= range.start && card.planStart <= range.end) rowFor(card.ownerPicId).adhoc += 1;
      continue;
    }
    if (card.planEnd < range.start || card.planEnd > range.end) continue;
    const row = rowFor(card.ownerPicId);
    row.planned += 1;
    if (card.rescheduleCount > 0) row.rescheduled += 1;
    if (card.planEnd > today) {
      row.notDue += 1;
      continue;
    }
    row.due += 1;
    if (card.doneOn === null) row.overdueOpen += 1;
    else if (card.doneOn <= card.planEnd) row.onTime += 1;
    else row.late += 1;
  }
  return [...rows.values()]
    .map((row) => ({ ...row, percent: row.due > 0 ? percentRounded(row.onTime, row.due) : null }))
    .sort((a, b) => a.picId - b.picId);
}
