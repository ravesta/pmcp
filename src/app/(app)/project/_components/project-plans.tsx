import type { CardView } from '@/modules/kanban';
import { ToneChip } from '@/ui/components/tone-chip';
import { COLUMN_DESCRIPTION, formatDuration, formatPlanRange, markerChip } from '@/ui/format/kanban-labels';
import styles from './detail.module.css';

/**
 * Rencana kerja sebuah project: kartu Kanban semua PIC (judul, step, PIC, tahapan, rencana beserta rencana awal,
 * posisi, penanda rencana, dan waktu tercatat terhadap estimasi). Hanya baca; kartu dibatalkan tidak tampil.
 * Masukan: kartu project. Keluaran: tabel, atau kalimat kosong.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-20-02, CR-001, mockup v0.2 (Rencana kerja).
 */
export function ProjectPlans({ cards }: { readonly cards: ReadonlyArray<CardView> }) {
  if (cards.length === 0) return <div className={`${styles.muted} ${styles.small}`} style={{ padding: 16, textAlign: 'center' }}>Belum ada rencana kerja pada project ini. Rencana dibuat PIC lewat kartu Kanban.</div>;
  return (
    <div className={styles.wrap}>
      <table className={styles.at} aria-label="Rencana kerja project" style={{ minWidth: 720 }}>
        <thead><tr><th>Item rencana</th><th>PIC</th><th>Tahapan</th><th>Rencana</th><th>Posisi</th><th>Status rencana</th><th>Waktu</th></tr></thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card.id}>
              <td className={styles.small}><b>{card.title}</b>{card.stepName ? <div className={styles.muted}>{card.stepName}</div> : null}</td>
              <td className={styles.small}>{card.owner.name}</td>
              <td className={styles.small}>{card.stage}</td>
              <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>
                {formatPlanRange(card.planStart, card.planEnd)}
                {card.baseline ? <div className={styles.muted}>awal {formatPlanRange(card.baseline.start, card.baseline.end)}</div> : null}
              </td>
              <td className={styles.small}>{COLUMN_DESCRIPTION[card.column]}</td>
              <td>{card.markers.map((marker, index) => { const chip = markerChip(marker); return <span key={`${marker.kind}-${index}`} style={{ marginRight: 4 }}><ToneChip text={chip.text} tone={chip.tone} /></span>; })}</td>
              <td className={`${styles.mono} ${styles.small}`} style={{ whiteSpace: 'nowrap' }}>{formatDuration(card.loggedMinutes)}{card.estimateMinutes ? ` / ${formatDuration(card.estimateMinutes)}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
