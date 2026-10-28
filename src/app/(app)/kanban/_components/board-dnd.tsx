'use client';

import { useState, useTransition, type DragEvent, type ReactNode } from 'react';
import type { CardColumn } from '@/modules/kanban';
import { initialActionState } from '@/ui/action-state';
import { moveCardAction } from '../actions';
import styles from './kanban.module.css';

/** Tipe data yang dibawa saat kartu diseret (id dan versi kartu). */
const DRAG_TYPE = 'application/x-pmcp-card';

/** Properti pembungkus kartu yang dapat diseret. */
interface DraggableCardProps {
  readonly cardId: number;
  readonly version: number;
  /** True bila pelaku PIC pemilik; selain itu kartu tidak dapat diseret. */
  readonly canDrag: boolean;
  /** Warna tepi kartu: tahapan (BA, DEV, QA) atau ACT untuk kartu activity. */
  readonly tone: 'BA' | 'DEV' | 'QA' | 'ACT';
  readonly children: ReactNode;
}

/**
 * Pembungkus kartu yang dapat diseret ke kolom lain oleh PIC pemiliknya. Tombol panah pada kartu tetap tersedia
 * sebagai alternatif papan ketik.
 * Masukan: id dan versi kartu, hak seret, warna tepi, dan isi kartu. Keluaran: elemen kartu.
 * Efek samping: menyimpan id dan versi kartu pada data seret.
 * Rujukan: FR-16-02 butir 1 (seret ke papan lain atau tombol panah), NFR-05 (alternatif papan ketik).
 */
export function DraggableCard({ cardId, version, canDrag, tone, children }: DraggableCardProps) {
  const [dragging, setDragging] = useState(false);
  /** Menyimpan identitas kartu pada data seret. Efek samping: mengisi `dataTransfer`. */
  function onDragStart(event: DragEvent<HTMLDivElement>): void {
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ cardId, version }));
    event.dataTransfer.effectAllowed = 'move';
    setDragging(true);
  }
  return (
    <div className={`${styles.card} ${styles[tone] ?? ''} ${canDrag ? styles.draggable : ''} ${dragging ? styles.dragging : ''}`} draggable={canDrag} onDragStart={canDrag ? onDragStart : undefined} onDragEnd={() => setDragging(false)}>
      {children}
    </div>
  );
}

/** Properti kolom papan yang menerima kartu. */
interface DropColumnProps {
  readonly column: CardColumn;
  readonly label: string;
  readonly children: ReactNode;
}

/**
 * Kolom papan yang menerima kartu yang dilepas dan memindahkannya lewat `moveCardAction`. Hak dicek ulang di server;
 * galat pemindahan (mis. bukan pemilik) ditampilkan di kolom.
 * Masukan: kolom, label aksesibilitas, dan isi (kartu). Keluaran: bagian kolom.
 * Efek samping: mengirim Server Action saat kartu dilepas; menandai kolom saat kartu di atasnya.
 * Rujukan: FR-16-02, BL-27.
 */
export function DropColumn({ column, label, children }: DropColumnProps) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  /** Memindahkan kartu yang dilepas ke kolom ini. Efek samping: memanggil Server Action. */
  function onDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    setOver(false);
    const raw = event.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    const { cardId, version } = JSON.parse(raw) as { cardId: number; version: number };
    const formData = new FormData();
    formData.set('cardId', String(cardId));
    formData.set('expectedVersion', String(version));
    formData.set('target', column);
    startTransition(async () => {
      const result = await moveCardAction(initialActionState, formData);
      setError(result.ok ? '' : (result.message ?? ''));
    });
  }

  return (
    <section
      className={`${styles.col} ${over ? styles.over : ''}`}
      aria-label={label}
      onDragOver={(event) => { event.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      {children}
      {error ? <div role="alert" className={styles.warn}>{error}</div> : null}
    </section>
  );
}
