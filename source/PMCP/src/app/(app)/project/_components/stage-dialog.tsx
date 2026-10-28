'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useState } from 'react';
import type { ProjectFormOptions, StageStatus, StageView } from '@/modules/project';
import { ActionDialog } from '@/ui/components/action-dialog';
import { DateField } from '@/ui/components/date-field';
import { FieldsetBox } from '@/ui/components/fieldset-box';
import { MultiSelectField } from '@/ui/components/multi-select-field';
import { formatRange, revisionHint, STAGE_FULL_TEXT, STAGE_STATUS_TEXT, varianceLines } from '@/ui/format/project-labels';
import { updateStageAction } from '../actions';

/** Properti dialog Perbarui Tahapan. */
interface StageDialogProps {
  readonly projectCode: string;
  readonly projectName: string;
  readonly stage: StageView;
  readonly options: ProjectFormOptions;
  readonly revisionThreshold: number;
  readonly isManager: boolean;
  /** True bila dialog dibuka dari halaman selain Detail Project (menampilkan tautan "Lihat detail project"). */
  readonly showDetailLink: boolean;
  readonly onClose: () => void;
}

/**
 * Menentukan status yang dapat dipilih pada dialog: semua status untuk tahapan yang belum selesai; untuk tahapan
 * Selesai hanya Manager yang dapat membukanya kembali (menjadi Berjalan).
 * Masukan: tahapan dan penanda Manager. Keluaran: daftar status yang ditawarkan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-01 butir 7 dan 9 (membuka kembali hanya oleh Manager dengan catatan).
 */
function statusChoices(stage: StageView, isManager: boolean): StageStatus[] {
  if (stage.status === 'DONE') return isManager ? ['DONE', 'RUNNING'] : ['DONE'];
  return ['NOT_STARTED', 'RUNNING', 'HELD', 'DONE'];
}

/**
 * Kotak ringkasan estimasi di bagian atas dialog: estimasi terkini, jumlah revisi, estimasi awal, dan keterangan selisih.
 * Masukan: tahapan. Keluaran: kotak hanya baca.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: Screen [016] field 1, mockup v0.2 (planInfo).
 */
function PlanInfo({ stage }: { readonly stage: StageView }) {
  const lines = varianceLines(stage);
  if (!stage.estimate) return <Box sx={{ bgcolor: 'var(--soft)', borderRadius: 1, p: '8px 12px' }}>Belum ada timeline.</Box>;
  return (
    <Box sx={{ bgcolor: 'var(--soft)', borderRadius: 1, p: '8px 12px', fontSize: 13 }}>
      Estimasi terkini <b className="mono">{formatRange(stage.estimate)}</b>
      {stage.revisionCount > 0 ? ` (revisi ${stage.revisionCount}×)` : ''}
      {stage.baseline && (stage.baseline.start !== stage.estimate.start || stage.baseline.end !== stage.estimate.end) ? <><br />Estimasi awal <span className="mono">{formatRange(stage.baseline)}</span></> : null}
      {lines.map((line) => <div key={line} style={{ color: 'var(--warn)' }}>{line}</div>)}
    </Box>
  );
}

/**
 * Dialog Perbarui Tahapan (Screen [016]) seperti mockup v0.2: SATU dialog dengan satu tombol Simpan yang menyimpan
 * semua bagian yang diubah (status, progres, PIC, timeline, revisi estimasi) dalam satu transaksi. Bagian yang tampil
 * mengikuti hak pelaku (dihitung server); hak sebenarnya dicek ulang di server saat menyimpan. Nilai awal dikirim
 * sebagai isian tersembunyi agar server hanya menyimpan bagian yang benar-benar berubah.
 * Masukan: kode dan nama project, tahapan, pilihan master, batas revisi, penanda Manager, penanda tautan detail, dan
 * penutup. Keluaran: dialog.
 * Efek samping: mengirim `updateStageAction` saat Simpan; menutup dialog setelah berhasil.
 * Rujukan: Screen [016], FR-03-01, FR-05-01, FR-05-02, FR-13-01, FR-13-04, handoff UX/UI §4 (Dialog), §7, §9.
 */
export function StageDialog({ projectCode, projectName, stage, options, revisionThreshold, isManager, showDetailLink, onClose }: StageDialogProps) {
  const canStatus = stage.rights.update || stage.rights.reopen;
  const choices = statusChoices(stage, isManager);
  const [target, setTarget] = useState<StageStatus>(stage.status);
  const picChoices = options.pics.filter((pic) => pic.stage === stage.kind).map((pic) => ({ id: pic.id, label: pic.name }));
  const { progress } = stage;
  const currentProgress = progress.manual ?? progress.system;
  const heldCategory = options.revisionCategories.find((c) => c.name === 'Ditahan lalu dilanjutkan');
  const lateCategory = options.revisionCategories.find((c) => c.name === 'Terlambat dari estimasi');
  const preselect = stage.status === 'HELD' ? heldCategory : stage.lateness.isLate ? lateCategory : undefined;
  const canRevise = stage.rights.update && stage.estimate !== null;
  const reopening = stage.status === 'DONE' && target === 'RUNNING';

  return (
    <ActionDialog
      title="Perbarui tahapan"
      submitLabel="Simpan"
      action={updateStageAction}
      onClose={onClose}
      maxWidth="sm"
      hidden={{
        stageId: stage.stageId,
        expectedVersion: stage.version,
        statusInitial: stage.status,
        holdReasonInitial: stage.holdReason ?? '',
        progressInitial: currentProgress === null ? '' : String(currentProgress),
        hasManual: progress.manual !== null ? '1' : '0',
        picIdsInitial: stage.assignees.map((a) => a.picId).join(','),
        ...(stage.rights.editAssignees ? { picsTouched: 1 } : {}),
      }}
    >
      {({ fieldErrors }) => (
        <>
          <Typography variant="body2" color="text.secondary">{projectName} | {STAGE_FULL_TEXT[stage.kind]}</Typography>
          {showDetailLink ? <Link href={`/project/${projectCode}`} style={{ color: 'var(--accent)', alignSelf: 'flex-start' }}>Lihat detail project</Link> : null}
          <PlanInfo stage={stage} />

          {canStatus ? (
            <>
              <TextField select name="target" label="Status" value={target} onChange={(event) => setTarget(event.target.value as StageStatus)} slotProps={{ select: { native: true } }} error={Boolean(fieldErrors['status.target'])}>
                {choices.map((value) => <option key={value} value={value}>{value === 'RUNNING' && stage.status === 'DONE' ? 'Berjalan (buka kembali)' : STAGE_STATUS_TEXT[value]}</option>)}
              </TextField>
              {target === 'HELD' ? <TextField name="reason" label="Alasan ditahan" required multiline rows={2} defaultValue={stage.holdReason ?? ''} placeholder="Mengapa tahapan ini ditahan?" error={Boolean(fieldErrors['status.reason'])} helperText={fieldErrors['status.reason']} /> : null}
              {(target === 'DONE' && isManager && stage.status !== 'DONE') || reopening ? (
                <TextField
                  name="statusNote"
                  label={reopening ? 'Catatan buka kembali' : 'Catatan melewati syarat kartu terbuka'}
                  required={reopening}
                  multiline
                  rows={2}
                  placeholder={reopening ? 'Mengapa tahapan dibuka kembali?' : 'Wajib bila masih ada kartu terbuka milik PIC'}
                  error={Boolean(fieldErrors['status.note'])}
                  helperText={fieldErrors['status.note'] ?? 'Minimal 3 karakter.'}
                />
              ) : null}
            </>
          ) : null}

          {canStatus && stage.status !== 'DONE' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'var(--muted)' }}>Progres tahapan</Typography>
              <Box sx={{ bgcolor: 'var(--soft)', borderRadius: 1, p: '8px 12px', fontSize: 13 }}>
                {progress.cardCount === 0
                  ? 'Belum ada kartu rencana untuk tahapan ini, progres diisi manual.'
                  : `Hitungan sistem: ${progress.system}% dari ${progress.cardCount} kartu rencana.`}
                {` Diharapkan menurut laju: ${progress.expected}%. Berlaku: ${progress.effective}%${progress.manual !== null ? ' (disesuaikan manual)' : ''}.`}
              </Box>
              <TextField name="progressValue" type="number" label="Sesuaikan manual (%) - kosongkan untuk memakai hitungan sistem" defaultValue={currentProgress ?? ''} error={Boolean(fieldErrors['progress.value'])} helperText={fieldErrors['progress.value'] ?? 'Bilangan bulat 0 sampai 99. Progres 100% hanya lewat status Selesai.'} slotProps={{ htmlInput: { min: 0, max: 99, step: 1 } }} />
              <TextField name="progressNote" label="Catatan penyesuaian manual" multiline rows={2} defaultValue={progress.manualNote ?? ''} placeholder="Wajib bila angka manual berbeda dari hitungan" error={Boolean(fieldErrors['progress.note'])} helperText={fieldErrors['progress.note']} />
              {progress.manual !== null ? <FormControlLabel control={<Checkbox name="reset" value="1" />} label="Kembali ke hitungan sistem" /> : null}
            </Box>
          ) : null}

          {stage.rights.editAssignees ? (
            <FieldsetBox legend="PIC (boleh lebih dari satu)">
              <MultiSelectField name="picIds" label="PIC" options={picChoices} defaultIds={stage.assignees.map((a) => a.picId)} error={fieldErrors['planning.pics']} />
            </FieldsetBox>
          ) : null}

          {stage.rights.fillTimeline ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <DateField name="estStart" label="Estimasi mulai (dd/mm/yyyy)" error={fieldErrors['planning.estimate']} helperText="Estimasi pertama menjadi estimasi awal." />
              <DateField name="estEnd" label="Estimasi selesai (dd/mm/yyyy)" />
            </Box>
          ) : null}

          {canRevise ? (
            <FieldsetBox legend="Revisi estimasi" hint="kosongkan bila tidak berubah">
              {stage.revisionAtLimit ? <Alert severity="warning" role="alert">Peringatan: tahapan ini sudah direvisi {stage.revisionCount}× (batas peringatan {revisionThreshold}×). Tinjau penyebab perubahan jadwal sebelum merevisi lagi.</Alert> : null}
              <Typography variant="body2">{revisionHint(stage.status === 'HELD', target, stage.lateness.isLate ? stage.lateness.daysPastCurrent : 0)}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                <DateField name="newStart" label="Estimasi mulai baru" error={fieldErrors['revision.dates']} />
                <DateField name="newEnd" label="Estimasi selesai baru" />
              </Box>
              <TextField select name="categoryId" label="Kategori alasan" defaultValue={preselect ? String(preselect.id) : ''} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(fieldErrors['revision.category'])} helperText={fieldErrors['revision.category']}>
                <option value="">Pilih kategori</option>
                {options.revisionCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </TextField>
              <TextField name="revisionNote" label="Catatan alasan" multiline rows={2} placeholder="Jelaskan penyebab dan dasar estimasi baru" error={Boolean(fieldErrors['revision.note'])} helperText={fieldErrors['revision.note'] ?? 'Kategori dan catatan wajib bila estimasi diubah. Estimasi awal tidak berubah.'} />
            </FieldsetBox>
          ) : null}

          <Typography variant="body2" color="text.secondary">
            {isManager ? 'Perubahan dicatat di jejak perubahan.' : 'Semua perubahan dicatat di jejak perubahan. Status dan progres hanya dapat diubah PIC tahapan ini atau Manager.'}
          </Typography>
        </>
      )}
    </ActionDialog>
  );
}
