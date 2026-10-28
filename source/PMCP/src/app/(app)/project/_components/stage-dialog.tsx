'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState } from 'react';
import type { ProjectFormOptions, StageStatus, StageView } from '@/modules/project';
import { ActionForm, type ActionFormContext } from '@/ui/components/action-form';
import { DateField } from '@/ui/components/date-field';
import { formatDateOrDash, formatRange, formatShift, STAGE_STATUS_TEXT } from '@/ui/format/project-labels';
import { stageAction } from '../actions';
import { StagePlanFields } from './stage-plan-fields';

/** Bagian dialog (satu tab, satu formulir, satu aksi). */
type SectionKey = 'status' | 'progress' | 'planning' | 'revise';

/** Properti dialog Perbarui Tahapan. */
interface StageDialogProps {
  readonly projectName: string;
  readonly stage: StageView;
  readonly options: ProjectFormOptions;
  readonly revisionThreshold: number;
  readonly isManager: boolean;
  readonly onClose: () => void;
}

/**
 * Menentukan tab yang tersedia bagi pelaku pada tahapan ini menurut hak yang dihitung server.
 * Masukan: tahapan siap tampil. Keluaran: daftar kunci tab berurutan.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-03-01, FR-05-01, FR-06-01 (PIC BA tidak melihat Perbarui status pada Development), FR-13-01.
 */
function availableSections(stage: StageView): SectionKey[] {
  const sections: SectionKey[] = [];
  if (stage.rights.update || stage.rights.reopen) sections.push('status');
  if (stage.rights.update && stage.status !== 'DONE') sections.push('progress');
  if (stage.rights.editAssignees || stage.rights.fillTimeline) sections.push('planning');
  if (stage.rights.update && stage.estimate && stage.status !== 'DONE') sections.push('revise');
  return sections;
}

/** Nama tab untuk pembaca layar dan tampilan. */
const SECTION_LABEL: Readonly<Record<SectionKey, string>> = {
  status: 'Status',
  progress: 'Progres',
  planning: 'PIC dan timeline',
  revise: 'Revisi estimasi',
};

/**
 * Ringkasan informasi estimasi tahapan di atas dialog: estimasi terkini, awal, jumlah revisi, dan selisih.
 * Masukan: tahapan. Keluaran: blok teks hanya baca.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: Screen [016] field 1, FR-13-05 butir 9.
 */
function EstimateSummary({ stage }: { readonly stage: StageView }) {
  const shift = formatShift(stage.shiftWorkdays);
  return (
    <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
      <Typography variant="body2">Estimasi terkini: {formatRange(stage.estimate)}</Typography>
      <Typography variant="body2" color="text.secondary">
        Estimasi awal: {formatRange(stage.baseline, '-')} · Revisi: {stage.revisionCount}{shift ? ` · ${shift}` : ''}
      </Typography>
    </Box>
  );
}

/**
 * Tab Status: mengubah status tahapan (hold dengan alasan, selesai dengan catatan Manager bila ada kartu terbuka)
 * atau membuka kembali tahapan Selesai (Manager dengan catatan).
 * Masukan: tahapan, penanda Manager, dan konteks formulir. Keluaran: isian tab.
 * Efek samping: menyimpan status tujuan di state komponen agar isian alasan dan catatan tampil sesuai.
 * Rujukan: FR-05-01 butir 3 sampai 9, FR-13-02, Screen [016] field 2, 6, 7, dan 13.
 */
function StatusFields({ stage, isManager, context }: { readonly stage: StageView; readonly isManager: boolean; readonly context: ActionFormContext }) {
  const reopening = stage.status === 'DONE';
  const [target, setTarget] = useState<StageStatus>(reopening ? 'RUNNING' : stage.status);
  const errors = context.fieldErrors;
  return (
    <>
      {reopening ? (
        <>
          <input type="hidden" name="target" value="RUNNING" />
          <Typography variant="body2">Tahapan sudah Selesai. Membuka kembali mengembalikan status ke Berjalan dan mengosongkan tanggal selesai aktual.</Typography>
          <TextField name="note" label="Catatan buka kembali" required multiline rows={2} error={Boolean(errors.note)} helperText={errors.note ?? 'Minimal 3 karakter.'} />
        </>
      ) : (
        <>
          <TextField select name="target" label="Status" value={target} onChange={(event) => setTarget(event.target.value as StageStatus)} slotProps={{ select: { native: true } }}>
            {(Object.keys(STAGE_STATUS_TEXT) as StageStatus[]).map((value) => <option key={value} value={value}>{STAGE_STATUS_TEXT[value]}</option>)}
          </TextField>
          {target === 'HELD' ? <TextField name="reason" label="Alasan ditahan" required multiline rows={2} defaultValue={stage.holdReason ?? ''} error={Boolean(errors.reason)} helperText={errors.reason ?? 'Wajib. Maksimal 300 karakter.'} /> : null}
          {target === 'DONE' && isManager ? <TextField name="note" label="Catatan melewati syarat kartu terbuka" multiline rows={2} error={Boolean(errors.note)} helperText={errors.note ?? 'Wajib (minimal 3 karakter) hanya bila masih ada kartu terbuka.'} /> : null}
        </>
      )}
    </>
  );
}

/**
 * Tab Progres: menyesuaikan progres tahapan secara manual (0 sampai 99) atau mengembalikannya ke hitungan sistem.
 * Masukan: tahapan dan konteks formulir. Keluaran: isian tab beserta pembanding hitungan sistem dan laju.
 * Efek samping: tidak ada selain state isian.
 * Rujukan: FR-05-02 butir 1 sampai 6, Screen [016] field 3 sampai 5.
 */
function ProgressFields({ stage, context }: { readonly stage: StageView; readonly context: ActionFormContext }) {
  const { progress } = stage;
  const errors = context.fieldErrors;
  return (
    <>
      <Typography variant="body2">
        Hitungan sistem: {progress.system === null ? 'belum ada kartu' : `${progress.system}%`} · Diharapkan menurut laju: {progress.expected}% · Berlaku: {progress.effective}%
        {progress.manual !== null ? ' (disesuaikan manual)' : ''}
      </Typography>
      <TextField name="value" type="number" label="Progres tahapan (%)" defaultValue={progress.manual ?? progress.system ?? ''} error={Boolean(errors.value)} helperText={errors.value ?? 'Bilangan bulat 0 sampai 99. Progres 100% hanya lewat status Selesai.'} slotProps={{ htmlInput: { min: 0, max: 99 } }} />
      <TextField name="note" label="Catatan penyesuaian manual" multiline rows={2} defaultValue={progress.manualNote ?? ''} error={Boolean(errors.note)} helperText={errors.note ?? (progress.cardCount > 0 ? 'Wajib (minimal 3 karakter) bila angka berbeda dari nilai yang berlaku.' : 'Tahapan tanpa kartu diisi langsung tanpa catatan.')} />
      {progress.manual !== null ? <FormControlLabel control={<Checkbox name="reset" value="1" />} label="Kembali ke hitungan sistem" /> : null}
    </>
  );
}

/**
 * Tab Revisi estimasi: tanggal baru, kategori alasan (master aktif), dan catatan. Peringatan tampil bila revisi sudah
 * mencapai batas peringatan; peringatan tidak memblokir.
 * Masukan: tahapan, pilihan kategori, batas peringatan, dan konteks formulir. Keluaran: isian tab.
 * Efek samping: tidak ada selain state isian.
 * Rujukan: FR-13-01, FR-13-03 butir 2 (kategori terpilih otomatis bila terlambat), FR-13-04, Screen [016] field 10 sampai 12.
 */
function ReviseFields({ stage, options, threshold, context }: { readonly stage: StageView; readonly options: ProjectFormOptions; readonly threshold: number; readonly context: ActionFormContext }) {
  const errors = context.fieldErrors;
  const lateCategory = stage.lateness.isLate ? options.revisionCategories.find((c) => c.name === 'Terlambat dari estimasi') : undefined;
  return (
    <>
      {stage.revisionAtLimit ? <Alert severity="warning">Tahapan ini sudah direvisi {stage.revisionCount} kali (batas peringatan {threshold}). Revisi tetap dapat disimpan.</Alert> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
        <DateField name="newStart" label="Estimasi mulai baru" defaultValue={stage.estimate?.start} error={errors.dates} />
        <DateField name="newEnd" label="Estimasi selesai baru" defaultValue={stage.estimate?.end} />
      </Box>
      <TextField select name="categoryId" label="Kategori alasan" defaultValue={lateCategory ? String(lateCategory.id) : ''} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(errors.category)} helperText={errors.category}>
        <option value="">Pilih kategori</option>
        {options.revisionCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </TextField>
      <TextField name="note" label="Catatan alasan" required multiline rows={2} error={Boolean(errors.note)} helperText={errors.note ?? 'Minimal 3 karakter, maksimal 300.'} />
    </>
  );
}

/**
 * Dialog Perbarui Tahapan (Screen [016]) dengan tab per aksi: Status, Progres, PIC dan timeline, Revisi estimasi.
 * Tab yang tampil mengikuti hak pelaku (dihitung server); setiap tab adalah formulir sendiri dan menutup dialog
 * setelah berhasil. Hak sebenarnya tetap dicek ulang di server saat menyimpan.
 * Masukan: nama project, tahapan, pilihan master, batas revisi, penanda Manager, dan penutup. Keluaran: dialog.
 * Efek samping: mengirim `stageAction` dengan `intent` sesuai tab; menutup dialog setelah sukses.
 * Rujukan: Screen [016], FR-03-01, FR-05-01, FR-05-02, FR-13-01, handoff UX/UI §4 (Dialog, Tabs) dan §9.
 */
export function StageDialog({ projectName, stage, options, revisionThreshold, isManager, onClose }: StageDialogProps) {
  const sections = availableSections(stage);
  const [section, setSection] = useState<SectionKey>(sections[0] ?? 'status');
  const titleId = useId();
  const hidden = { stageId: stage.stageId, expectedVersion: stage.version };
  const picChoices = options.pics.filter((pic) => pic.stage === stage.kind).map((pic) => ({ id: pic.id, label: pic.name }));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>Perbarui tahapan {stage.label} · {projectName}</DialogTitle>
      <DialogContent sx={{ pt: '8px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <EstimateSummary stage={stage} />
        {sections.length === 0 ? <Alert severity="info">Anda tidak memiliki hak mengubah tahapan ini.</Alert> : (
          <>
            <Tabs value={section} onChange={(_event, value: SectionKey) => setSection(value)} variant="scrollable" scrollButtons="auto" aria-label="Bagian perubahan tahapan">
              {sections.map((key) => <Tab key={key} value={key} label={SECTION_LABEL[key]} />)}
            </Tabs>
            {section === 'status' ? (
              <ActionForm action={stageAction} submitLabel={stage.status === 'DONE' ? 'Buka kembali' : 'Simpan status'} hidden={{ ...hidden, intent: 'status' }} showSuccess={false} onSuccess={onClose}>
                {(context) => <StatusFields stage={stage} isManager={isManager} context={context} />}
              </ActionForm>
            ) : null}
            {section === 'progress' ? (
              <ActionForm action={stageAction} submitLabel="Simpan progres" hidden={{ ...hidden, intent: 'progress' }} showSuccess={false} onSuccess={onClose}>
                {(context) => <ProgressFields stage={stage} context={context} />}
              </ActionForm>
            ) : null}
            {section === 'planning' ? (
              <ActionForm action={stageAction} submitLabel="Simpan perencanaan" hidden={{ ...hidden, intent: 'planning', ...(stage.rights.editAssignees ? { picsTouched: 1 } : {}) }} showSuccess={false} onSuccess={onClose}>
                {(context) => (
                  <StagePlanFields
                    title={`Tahapan ${stage.label}`}
                    names={{ pics: 'picIds', start: 'estStart', end: 'estEnd' }}
                    picOptions={picChoices}
                    defaultPicIds={stage.assignees.map((a) => a.picId)}
                    showPics={stage.rights.editAssignees}
                    showDates={stage.rights.fillTimeline}
                    errors={{ pics: context.fieldErrors.pics, estimate: context.fieldErrors.estimate }}
                  />
                )}
              </ActionForm>
            ) : null}
            {section === 'revise' ? (
              <ActionForm action={stageAction} submitLabel="Simpan revisi" hidden={{ ...hidden, intent: 'revise' }} showSuccess={false} onSuccess={onClose}>
                {(context) => <ReviseFields stage={stage} options={options} threshold={revisionThreshold} context={context} />}
              </ActionForm>
            ) : null}
          </>
        )}
        <Typography variant="caption" color="text.secondary">Mulai aktual: {formatDateOrDash(stage.actualStart)} · Selesai aktual: {formatDateOrDash(stage.actualEnd)}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Tutup</Button>
      </DialogActions>
    </Dialog>
  );
}
