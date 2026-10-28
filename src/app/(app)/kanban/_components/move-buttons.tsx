'use client';

import type { CardColumn } from '@/modules/kanban';
import { ActionButton } from '@/ui/components/action-button';
import { COLUMN_DESCRIPTION, neighbours } from '@/ui/format/kanban-labels';
import { moveCardAction } from '../actions';
import styles from './kanban.module.css';

/** Properti tombol panah pindah kolom. */
interface MoveButtonsProps {
  readonly cardId: number;
  readonly version: number;
  readonly column: CardColumn;
}

/**
 * Tombol panah kiri dan kanan untuk memindahkan kartu ke kolom sebelum atau sesudahnya (alternatif papan ketik untuk
 * seret-lepas). Hanya ditampilkan bagi PIC pemilik kartu.
 * Masukan: id, versi, dan kolom kartu. Keluaran: dua tombol.
 * Efek samping: mengirim `moveCardAction` saat diklik.
 * Rujukan: FR-16-02 butir 1, mockup v0.2 (data-kmove).
 */
export function MoveButtons({ cardId, version, column }: MoveButtonsProps) {
  const { previous, next } = neighbours(column);
  return (
    <div className={styles.actions}>
      <ActionButton action={moveCardAction} fields={{ cardId, expectedVersion: version, target: previous ?? '' }} label="←" ariaLabel={previous ? `Pindah ke ${COLUMN_DESCRIPTION[previous]}` : 'Tidak ada kolom sebelumnya'} disabled={previous === null} />
      <ActionButton action={moveCardAction} fields={{ cardId, expectedVersion: version, target: next ?? '' }} label="→" ariaLabel={next ? `Pindah ke ${COLUMN_DESCRIPTION[next]}` : 'Tidak ada kolom berikutnya'} disabled={next === null} />
    </div>
  );
}
