'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import type { CardDetail } from '@/modules/kanban';
import { CARD_PROGRESS_CHOICES } from '@/modules/kanban/client';
import { formatDisplayDate } from '@/shared/iso-date';
import { formatDateTime } from '@/shared/format';
import { ActionButton } from '@/ui/components/action-button';
import { ActionForm } from '@/ui/components/action-form';
import { DateField } from '@/ui/components/date-field';
import { RouteDialog } from '@/ui/components/route-dialog';
import { ToneChip } from '@/ui/components/tone-chip';
import { formatClock, formatDuration, formatPlanRange, markerChip } from '@/ui/format/kanban-labels';
import { formatRange, PROJECT_STATUS_TEXT, projectStatusTone, STAGE_FULL_TEXT } from '@/ui/format/project-labels';
import { addLogAction, cancelCardAction, deleteLogAction, rescheduleAction, setProgressAction } from '../actions';
import styles from './kanban.module.css';
import { RevisionFields } from './revision-fields';
import { usePlanPreview } from './use-plan-preview';

/** Properti dialog rincian kartu. */
interface CardDialogProps {
  readonly detail: CardDetail;
  readonly closeHref: string;
  /** Tanggal hari ini (`YYYY-MM-DD`) sebagai tanggal awal log. */
  readonly today: string;
}

/**
 * Bagian progres kartu: bar, pilihan 0/25/50/75 saat In Progress bagi pemilik, dan riwayat progres.
 * Masukan: rincian kartu. Keluaran: bagian progres.
 * Efek samping: pilihan progres mengirim `setProgressAction`.
 * Rujukan: FR-16-03, BL-40a.
 */
function ProgressSection({ detail }: { readonly detail: CardDetail }) {
  const { card } = detail;
  return (
    <section className={styles.section} aria-label="Progres kartu">
      <div className={styles.row} style={{ justifyContent: 'space-between' }}><b>Progres kartu</b><span className={styles.mono}>{card.progress}%</span></div>
      <div className={styles.bar} role="img" aria-label={`Progres kartu ${card.progress}%`}><i style={{ width: `${card.progress}%` }} /></div>
      {card.markers.some((m) => m.kind === 'PROGRESS_NEEDED') ? <div className={styles.warn} role="status">Kartu dikembalikan dari Selesai. Pilih progres kartu saat ini.</div> : null}
      {card.canManage && card.column === 'IN_PROGRESS' ? (
        <div className={styles.row} role="group" aria-label="Isi progres kartu">
          {CARD_PROGRESS_CHOICES.map((value) => (
            <ActionButton key={value} action={setProgressAction} fields={{ cardId: card.id, expectedVersion: card.version, value }} label={`${value}%`} variant={card.progress === value ? 'contained' : 'outlined'} pressed={card.progress === value} />
          ))}
        </div>
      ) : (
        <div className={`${styles.small} ${styles.muted}`}>{card.column === 'PLANNED' ? 'Kartu belum dimulai: 0%. Pindahkan ke Sedang dikerjakan untuk mengisi progres.' : card.column === 'DONE' ? 'Kartu selesai: 100%.' : 'Hanya PIC pemilik yang dapat mengisi progres.'}</div>
      )}
      {card.kind === 'PROJECT' ? <div className={`${styles.small} ${styles.muted}`}>Memengaruhi progres tahapan dengan bobot jumlah hari kerja rencana kartu (minimal 1).</div> : null}
      {detail.progressEvents.length > 0 ? (
        <details className={styles.details}>
          <summary>Riwayat progres ({detail.progressEvents.length})</summary>
          {[...detail.progressEvents].reverse().map((event, index) => <div key={index} className={styles.small}>{formatDateTime(event.createdAt)} · {event.createdByLabel}: {event.oldValue}% → {event.newValue}% ({event.source === 'MOVE' ? 'pindah kolom' : 'diisi PIC'})</div>)}
        </details>
      ) : null}
    </section>
  );
}

/**
 * Formulir jadwal ulang rencana kartu: rencana baru, alasan master, catatan, dan (bila rencana melewati estimasi
 * tahapan) kategori dan catatan revisi. Menampilkan peringatan batas jadwal ulang berikutnya.
 * Masukan: rincian kartu, tanggal hari ini, dan penutup. Keluaran: formulir.
 * Efek samping: memanggil pratinjau (baca); mengirim `rescheduleAction` saat Simpan.
 * Rujukan: FR-21-03, FR-13-05, EC-21-03.05.
 */
function RescheduleForm({ detail, onClose }: { readonly detail: CardDetail; readonly onClose: () => void }) {
  const { card } = detail;
  const [planStart, setPlanStart] = useState(card.planStart as string);
  const [planEnd, setPlanEnd] = useState(card.planEnd as string);
  const preview = usePlanPreview(card.kind === 'PROJECT' ? (card.project?.id ?? null) : null, planStart, planEnd);
  const upcoming = detail.reschedules.length + 1;
  return (
    <section className={styles.section} aria-label="Jadwal ulang rencana">
      <h3>Jadwal ulang rencana</h3>
      <ActionForm action={rescheduleAction} submitLabel="Simpan jadwal ulang" hidden={{ cardId: card.id, expectedVersion: card.version }} secondary={<Button onClick={onClose}>Batal</Button>}>
        {({ fieldErrors }) => (
          <>
            <div className={styles.grid2}>
              <DateField name="planStart" label="Rencana mulai baru" defaultValue={card.planStart} error={fieldErrors.plan} onValueChange={setPlanStart} />
              <DateField name="planEnd" label="Rencana selesai baru" defaultValue={card.planEnd} onValueChange={setPlanEnd} />
            </div>
            <TextField select name="reasonId" label="Alasan" defaultValue="" slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(fieldErrors.reason)} helperText={fieldErrors.reason}>
              <option value="">Pilih alasan</option>
              {detail.rescheduleReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
            </TextField>
            <TextField name="note" label="Catatan (opsional)" error={Boolean(fieldErrors.note)} helperText={fieldErrors.note} slotProps={{ htmlInput: { maxLength: 200 } }} />
            {upcoming >= detail.rescheduleThreshold ? <div className={styles.warn} role="status">Kartu ini sudah dijadwal ulang {detail.reschedules.length}×. Jadwal ulang ini menjadi yang ke-{upcoming} (batas peringatan {detail.rescheduleThreshold}×).</div> : null}
            <RevisionFields preview={preview} categories={detail.revisionCategories} errors={fieldErrors} />
            {fieldErrors.card ? <Alert severity="error">{fieldErrors.card}</Alert> : null}
          </>
        )}
      </ActionForm>
    </section>
  );
}

/**
 * Formulir pembatalan kartu dengan alasan wajib.
 * Masukan: rincian kartu dan penutup. Keluaran: formulir.
 * Efek samping: mengirim `cancelCardAction` saat Simpan.
 * Rujukan: FR-21-04.
 */
function CancelForm({ detail, onClose }: { readonly detail: CardDetail; readonly onClose: () => void }) {
  return (
    <section className={styles.section} aria-label="Batalkan kartu">
      <h3>Batalkan kartu</h3>
      <ActionForm action={cancelCardAction} submitLabel="Batalkan kartu" submitColor="error" hidden={{ cardId: detail.card.id, expectedVersion: detail.card.version }} secondary={<Button onClick={onClose}>Kembali</Button>}>
        {({ fieldErrors }) => <TextField name="reason" label="Alasan pembatalan" required error={Boolean(fieldErrors.reason)} helperText={fieldErrors.reason} slotProps={{ htmlInput: { maxLength: 200 } }} />}
      </ActionForm>
    </section>
  );
}

/**
 * Bagian log activity: tabel log (tanggal, waktu, durasi, step, uraian), total per step, konfirmasi hapus bagi pemilik,
 * dan formulir tambah log (log tidak dapat diubah).
 * Masukan: rincian kartu dan tanggal hari ini. Keluaran: bagian log.
 * Efek samping: menghapus log lewat `deleteLogAction` (dengan konfirmasi); menambah lewat `addLogAction`.
 * Rujukan: FR-18-01, BL-28, BL-30.
 */
function LogSection({ detail, today }: { readonly detail: CardDetail; readonly today: string }) {
  const { card } = detail;
  const isProject = card.kind === 'PROJECT';
  const [confirming, setConfirming] = useState<number | null>(null);
  const canLog = card.canManage;
  return (
    <section className={styles.section} aria-label="Log activity">
      <h3>Log activity</h3>
      {detail.logs.length > 0 ? (
        <div className={styles.wrap}>
          <table className={styles.table} aria-label="Log activity kartu">
            <thead><tr><th>Tanggal</th><th>Waktu</th><th>Durasi</th>{isProject ? <th>Step</th> : null}<th>Uraian</th>{canLog ? <th><span style={{ position: 'absolute', left: -9999 }}>Aksi</span></th> : null}</tr></thead>
            <tbody>
              {detail.logs.map((log) => (
                <tr key={log.id}>
                  <td className={`${styles.mono} ${styles.small} ${styles.nowrap}`}>{formatDisplayDate(log.workDate)}</td>
                  <td className={`${styles.mono} ${styles.small} ${styles.nowrap}`}>{formatClock(log.span.start)}-{formatClock(log.span.end)}</td>
                  <td className={`${styles.mono} ${styles.small} ${styles.nowrap}`}>{formatDuration(log.span.end - log.span.start)}</td>
                  {isProject ? <td className={styles.small}>{log.stepName}</td> : null}
                  <td className={styles.small}>{log.description}</td>
                  {canLog ? (
                    <td className={styles.nowrap}>
                      {confirming === log.id ? (
                        <span className={styles.row}>
                          <span className={styles.small}>Hapus?</span>
                          <ActionButton action={deleteLogAction} fields={{ logId: log.id }} label="Ya" variant="contained" color="error" />
                          <Button size="small" onClick={() => setConfirming(null)}>Batal</Button>
                        </span>
                      ) : (
                        <Button size="small" variant="outlined" onClick={() => setConfirming(log.id)}>Hapus</Button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <div className={`${styles.muted} ${styles.small}`}>Belum ada log activity.</div>}
      {isProject && detail.totals.perStep.length > 0 ? <div className={`${styles.small} ${styles.muted}`}>Total per step: {detail.totals.perStep.map((s) => `${s.stepName} ${formatDuration(s.minutes)}`).join(' · ')}</div> : null}
      {canLog ? (
        isProject && detail.steps.length === 0 ? (
          <div className={styles.warn}>Belum ada step aktif untuk tahapan ini. Manager dapat menambahkannya di menu Master.</div>
        ) : (
          <ActionForm action={addLogAction} submitLabel="Simpan log" hidden={{ cardId: card.id }}>
            {({ fieldErrors }) => (
              <>
                <h3 style={{ margin: 0, fontSize: 14 }}>Tambah log</h3>
                <div className={styles.grid2}>
                  <DateField name="date" label="Tanggal" defaultValue={today} error={fieldErrors.date} />
                  {isProject ? (
                    <TextField select name="stepName" label="Step tahapan" defaultValue={card.stepName ?? ''} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(fieldErrors.step)} helperText={fieldErrors.step}>
                      <option value="">Pilih step</option>
                      {detail.steps.map((step) => <option key={step.id} value={step.name}>{step.name}</option>)}
                    </TextField>
                  ) : null}
                  <TextField name="start" type="time" label="Mulai" defaultValue="08:00" slotProps={{ inputLabel: { shrink: true } }} error={Boolean(fieldErrors.time)} helperText={fieldErrors.time} />
                  <TextField name="end" type="time" label="Selesai" defaultValue="09:00" slotProps={{ inputLabel: { shrink: true } }} />
                </div>
                <TextField name="description" label="Uraian aktivitas" multiline rows={2} placeholder="Apa yang dikerjakan?" error={Boolean(fieldErrors.description)} helperText={fieldErrors.description} slotProps={{ htmlInput: { maxLength: 300 } }} />
              </>
            )}
          </ActionForm>
        )
      ) : <p className={styles.hint}>Hanya PIC pemilik kartu yang dapat mengubah kartu dan mencatat log.</p>}
    </section>
  );
}

/**
 * Dialog rincian kartu (terbuka lewat `?kartu=`): ringkasan kartu dan statistik, progres, jadwal ulang dan pembatalan
 * bagi pemilik, riwayat jadwal ulang, serta log activity. PIC lain dan Manager hanya dapat membaca.
 * Masukan: rincian kartu, alamat penutup, dan tanggal hari ini. Keluaran: dialog.
 * Efek samping: membuka atau menutup formulir jadwal ulang dan pembatalan di state; aksi mengirim Server Action.
 * Rujukan: FR-17-03, FR-16-03, FR-18-01, FR-21-03, FR-21-04, mockup v0.2 (kBody).
 */
export function CardDialog({ detail, closeHref, today }: CardDialogProps) {
  const { card } = detail;
  const [panel, setPanel] = useState<'none' | 'reschedule' | 'cancel'>('none');
  const isProject = card.kind === 'PROJECT' && card.project !== null && card.stage !== null;
  const cancelled = card.cancelledAt !== null;
  return (
    <RouteDialog title={<>{card.title} <span className={`${styles.mono} ${styles.small} ${styles.muted}`}>{card.code}</span></>} closeHref={closeHref}>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <section className={styles.info} aria-label="Ringkasan kartu">
          <div className={styles.context}>
            <span className={`${styles.kind} ${isProject ? '' : styles.activity}`}>{isProject ? 'Project' : 'Activity'}</span>
            {card.project ? <ToneChip text={PROJECT_STATUS_TEXT[card.project.status]} tone={projectStatusTone(card.project.status)} /> : <ToneChip text={card.categoryName ?? ''} tone="neutral" />}
            {cancelled ? <ToneChip text="Dibatalkan" tone="cancel" /> : null}
            {card.markers.map((marker, index) => { const chip = markerChip(marker); return <ToneChip key={`${marker.kind}-${index}`} text={chip.text} tone={chip.tone} />; })}
          </div>
          {isProject && card.project && card.stage ? <div>{card.project.code} · {card.project.name} · {STAGE_FULL_TEXT[card.stage]}{card.stepName ? ` · ${card.stepName}` : ''}</div> : null}
          {cancelled ? <div className={styles.warn}>Dibatalkan: {card.cancelReason}</div> : null}
          <div className={styles.stats}>
            <div className={styles.stat}><span>Rencana</span><b className={styles.mono}>{formatPlanRange(card.planStart, card.planEnd)}</b><small>{card.baseline ? `awal ${formatPlanRange(card.baseline.start, card.baseline.end)}` : 'rencana awal'}</small></div>
            <div className={styles.stat}><span>Waktu tercatat</span><b>{formatDuration(card.loggedMinutes)}{card.estimateMinutes ? ` / ${formatDuration(card.estimateMinutes)}` : ''}</b><small>{card.logCount} log</small></div>
            {isProject ? <div className={styles.stat}><span>Estimasi tahapan</span><b className={styles.mono}>{formatRange(card.stageEstimate, 'belum ada')}</b><small>PIC kartu: {card.owner.name}</small></div> : <div className={styles.stat}><span>PIC</span><b>{card.owner.name}</b><small>{card.isAdhoc ? 'dadakan' : 'rencana'}</small></div>}
          </div>
        </section>
        <ProgressSection detail={detail} />
        {card.canManage && card.column !== 'DONE' ? (
          <div className={styles.row}>
            {panel !== 'reschedule' ? <Button variant="outlined" onClick={() => setPanel('reschedule')}>Jadwal ulang rencana</Button> : null}
            {panel !== 'cancel' ? <Button variant="outlined" onClick={() => setPanel('cancel')}>Batalkan kartu</Button> : null}
          </div>
        ) : null}
        {panel === 'reschedule' && card.canManage ? <RescheduleForm detail={detail} onClose={() => setPanel('none')} /> : null}
        {panel === 'cancel' && card.canManage ? <CancelForm detail={detail} onClose={() => setPanel('none')} /> : null}
        {detail.reschedules.length > 0 ? (
          <section className={styles.section} aria-label="Riwayat jadwal ulang">
            <h3>Riwayat jadwal ulang</h3>
            <div className={styles.wrap}>
              <table className={styles.table} aria-label="Riwayat jadwal ulang">
                <thead><tr><th>Dari</th><th>Menjadi</th><th>Alasan</th><th>Oleh</th><th>Waktu</th></tr></thead>
                <tbody>
                  {detail.reschedules.map((row, index) => (
                    <tr key={index}>
                      <td className={`${styles.mono} ${styles.small}`}>{formatDisplayDate(row.oldStart)} - {formatDisplayDate(row.oldEnd)}</td>
                      <td className={`${styles.mono} ${styles.small}`}>{formatDisplayDate(row.newStart)} - {formatDisplayDate(row.newEnd)}</td>
                      <td className={styles.small}>{row.reasonName}{row.note ? <div className={styles.muted}>{row.note}</div> : null}</td>
                      <td className={styles.small}>{row.createdByLabel}</td>
                      <td className={`${styles.mono} ${styles.small}`}>{formatDateTime(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        <LogSection detail={detail} today={today} />
      </DialogContent>
    </RouteDialog>
  );
}
