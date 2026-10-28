import type { ProjectFormOptions, StageView } from '@/modules/project';
import { ToneChip } from '@/ui/components/tone-chip';
import { completionBadge, displayStatusBadge, formatAssignees, formatDateOrDash, formatRange, varianceLines } from '@/ui/format/project-labels';
import { calendarDaysBetween } from '@/shared/calendar';
import styles from './detail.module.css';
import { StageActions } from './stage-actions';

/** Nama tahapan lengkap untuk judul kotak. */
const TITLE: Record<StageView['kind'], string> = { BA: 'Business Analyst', DEV: 'Development', QA: 'Quality Assurance' };

/** Properti kotak tahapan. */
interface StageBoxProps {
  readonly projectCode: string;
  readonly projectName: string;
  readonly stage: StageView;
  readonly options: ProjectFormOptions;
  readonly revisionThreshold: number;
  readonly isManager: boolean;
  /** Membuka dialog Perbarui Tahapan saat halaman dimuat (dari bar Gantt). */
  readonly autoOpen?: boolean;
}

/**
 * Catatan di bawah progres: penyesuaian manual, asal hitungan sistem (kartu per PIC), PIC tanpa kartu, dan penanda
 * Tertinggal dari laju beserta PIC dengan progres terendah.
 * Masukan: tahapan. Keluaran: daftar baris catatan beserta nada warnanya.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 2, 3, dan 6, EC-05-02.04, mockup v0.2 (fungsi progNotes).
 */
function progressNotes(stage: StageView): Array<{ text: string; tone: 'muted' | 'warn' | 'late' }> {
  const { progress } = stage;
  if (stage.status === 'DONE') return [];
  const notes: Array<{ text: string; tone: 'muted' | 'warn' | 'late' }> = [];
  if (progress.manual !== null) {
    notes.push({ text: `Disesuaikan manual oleh ${progress.manualBy ?? '-'} (hitungan sistem ${progress.system === null ? '-' : `${progress.system}%`})${progress.manualNote ? `: ${progress.manualNote}` : ''}`, tone: 'warn' });
  }
  notes.push(
    progress.cardCount > 0
      ? { text: `Dari ${progress.cardCount} kartu rencana (bobot hari kerja): ${progress.perPic.map((p) => `${p.name} ${p.cardCount} kartu, ${p.progress}%`).join('; ')}`, tone: 'muted' }
      : { text: 'Belum ada kartu rencana; progres diisi manual.', tone: 'muted' },
  );
  for (const name of progress.picsWithoutCards) notes.push({ text: `${name} belum punya kartu rencana di tahapan ini`, tone: 'warn' });
  if (progress.lagging) {
    notes.push({ text: `Tertinggal dari laju: seharusnya sekitar ${progress.expected}%, saat ini ${progress.effective}%.${progress.lowestPic && progress.perPic.length > 1 ? ` Progres terendah: ${progress.lowestPic}.` : ''}`, tone: 'late' });
  }
  return notes;
}

/**
 * Kotak satu tahapan pada Detail Project seperti mockup: judul berwarna menurut tahapan dengan status, PIC, estimasi
 * terkini (jumlah revisi, hari kalender, peringatan revisi berulang), estimasi awal, aktual, hold, selisih, progres dengan
 * catatan, dan tombol aksi.
 * Masukan: kode dan nama project, tahapan, pilihan master, batas revisi, penanda Manager, dan buka otomatis. Keluaran: kotak.
 * Efek samping: tidak ada (komponen murni; tombol aksi dikelola komponen klien `StageActions`).
 * Rujukan: Screen [014] field 7, FR-05-02, FR-12-02 butir 4, FR-13-04, FR-13-05 butir 9, mockup v0.2 (estBlock, sbox).
 */
export function StageBox({ projectCode, projectName, stage, options, revisionThreshold, isManager, autoOpen }: StageBoxProps) {
  const badge = displayStatusBadge(stage.display);
  const completion = completionBadge(stage.completion);
  const { progress } = stage;
  const noRights = !(stage.rights.update || stage.rights.reopen || stage.rights.fillTimeline || stage.rights.editAssignees);
  const variance = varianceLines(stage);
  const newMark = stage.assignees.some((a) => a.isNew);
  return (
    <div id={`tahap-${stage.kind}`} className={`${styles.sbox} ${styles[stage.kind]}`}>
      <div className={styles.sbt}>
        <span>{TITLE[stage.kind]}</span>
        <span><ToneChip text={badge.text} tone={badge.tone} />{completion ? <> <ToneChip text={completion.text} tone={completion.tone} /></> : null}</span>
      </div>

      <div>
        <div className={`${styles.label}`}>PIC {newMark ? <ToneChip text="Baru" tone="info" /> : null}</div>
        {stage.assignees.length > 0 ? <div style={{ fontWeight: 600 }}>{formatAssignees(stage.assignees)}</div> : <div className={styles.muted}>Belum ada PIC</div>}
      </div>

      {stage.estimate ? (
        <div>
          <div className={`${styles.label}`}>
            Estimasi terkini {stage.revisionCount > 0 ? <ToneChip text={`Revisi ${stage.revisionCount}×${stage.revisionAtLimit ? ' ⚠' : ''}`} tone={stage.revisionAtLimit ? 'late' : 'rev'} /> : null}
          </div>
          <div className={styles.mono}>{formatRange(stage.estimate)}</div>
          <div className={`${styles.label}`}>{calendarDaysBetween(stage.estimate.start, stage.estimate.end) + 1} hari kalender</div>
          {stage.revisionAtLimit ? <div className={`${styles.small} ${styles.lateText}`} style={{ marginTop: 4 }}>⚠ Sudah direvisi {stage.revisionCount}× (batas peringatan {revisionThreshold}×). Perlu ditinjau.</div> : null}
          {stage.baseline && (stage.baseline.start !== stage.estimate.start || stage.baseline.end !== stage.estimate.end) ? (
            <div className={styles.label} style={{ marginTop: 4 }}>Estimasi awal: <span className={styles.mono}>{formatRange(stage.baseline)}</span></div>
          ) : null}
          {stage.actualStart ? <div className={styles.label}>Aktual: mulai <span className={styles.mono}>{formatDateOrDash(stage.actualStart)}</span>{stage.actualEnd ? <>, selesai <span className={styles.mono}>{formatDateOrDash(stage.actualEnd)}</span></> : null}</div> : null}
          {stage.status === 'HELD' && stage.holdSince ? <div className={`${styles.small} ${styles.holdText}`}>⏸ Ditahan sejak {formatDateOrDash(stage.holdSince)}: {stage.holdReason}</div> : null}
          {variance.map((line) => <div key={line} className={`${styles.small} ${styles.warnText}`}>{line}</div>)}
        </div>
      ) : (
        <div><div className={styles.label}>Estimasi</div><div className={styles.muted}>Belum ada timeline</div></div>
      )}

      <div>
        <div className={styles.label}>Progres</div>
        <div className={styles.row}>
          <div className={styles.bar} role="img" aria-label={`Progres ${progress.effective}%`}><i style={{ width: `${progress.effective}%` }} /></div>
          <span className={`${styles.mono} ${styles.small}`}>{progress.effective}%{progress.manual !== null ? '*' : ''}</span>
        </div>
      </div>
      {progressNotes(stage).map((note) => <div key={note.text} className={`${styles.small} ${note.tone === 'warn' ? styles.warnText : note.tone === 'late' ? styles.lateText : styles.muted}`}>{note.text}</div>)}

      {stage.status === 'DONE' && !stage.rights.reopen ? (
        <span className={`${styles.muted} ${styles.small}`}>Tahapan selesai</span>
      ) : noRights ? (
        <span className={`${styles.muted} ${styles.small}`}>Hanya PIC tahapan ini atau Manager yang dapat memperbarui (PIC lain hanya dapat melengkapi bagian yang masih kosong)</span>
      ) : (
        <StageActions projectCode={projectCode} projectName={projectName} stage={stage} options={options} revisionThreshold={revisionThreshold} isManager={isManager} defaultOpen={autoOpen} />
      )}
    </div>
  );
}
