'use client';

import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CardFormOptions } from '@/modules/kanban';
import { ActionDialog } from '@/ui/components/action-dialog';
import { DateField } from '@/ui/components/date-field';
import { PROJECT_STATUS_TEXT } from '@/ui/format/project-labels';
import { createCardAction } from '../actions';
import { RevisionFields } from './revision-fields';
import { usePlanPreview } from './use-plan-preview';

/** Properti dialog Buat kartu. */
interface CreateCardDialogProps {
  readonly kind: 'PROJECT' | 'ACTIVITY';
  readonly options: CardFormOptions;
  /** Alamat papan tanpa dialog (tujuan saat ditutup). */
  readonly closeHref: string;
  /** Tanggal hari ini (`YYYY-MM-DD`) sebagai rencana awal isian. */
  readonly today: string;
}

/**
 * Pertanyaan konfirmasi status project Backlog atau Ditunda: jawaban wajib sebelum menyimpan; "Ya" mengubah status
 * menjadi Berjalan saat kartu disimpan.
 * Masukan: status project, alasan Ditunda, dan galat. Keluaran: kelompok pilihan.
 * Efek samping: tidak ada selain state pilihan.
 * Rujukan: FR-17-02 butir 1 sampai 3.
 */
function StatusConfirm({ status, reason, error }: { readonly status: 'BACKLOG' | 'DEFERRED'; readonly reason: string | null; readonly error?: string }) {
  const backlog = status === 'BACKLOG';
  return (
    <FormControl error={Boolean(error)}>
      <FormLabel>
        {backlog
          ? 'Project ini masih berstatus Backlog (belum dimulai). Karena Anda akan mulai mengerjakannya, ubah status project menjadi Berjalan?'
          : `Project ini saat ini Ditunda${reason ? ` (alasan: ${reason})` : ''}. Karena Anda akan melanjutkan pengerjaannya, ubah status project menjadi Berjalan?`}
      </FormLabel>
      <RadioGroup name="confirmStart">
        <FormControlLabel value="YES" control={<Radio />} label="Ya, jadikan Berjalan" />
        <FormControlLabel value="NO" control={<Radio />} label={backlog ? 'Biarkan Backlog' : 'Biarkan Ditunda'} />
      </RadioGroup>
      {error ? <FormHelperText>{error}</FormHelperText> : null}
    </FormControl>
  );
}

/**
 * Dialog Buat kartu rencana (project) atau kartu activity (di luar project, termasuk dadakan). Kartu project: pilih
 * project yang diikuti, step (opsional), judul, rencana, estimasi jam, dadakan, dan kolom awal; konfirmasi status project
 * dan revisi estimasi tahapan muncul sesuai pratinjau dari server. Kartu activity: pilih kategori master.
 * Masukan: jenis, pilihan formulir, alamat penutup, dan tanggal hari ini. Keluaran: dialog.
 * Efek samping: memanggil pratinjau (baca) saat project atau tanggal berubah; mengirim `createCardAction` saat Simpan;
 * menutup dengan menavigasi ke papan.
 * Rujukan: FR-17-01, FR-17-02, FR-21-01, FR-13-05, FR-16-01 butir 5 (hanya PIC), mockup v0.2 (dlgKNew).
 */
export function CreateCardDialog({ kind, options, closeHref, today }: CreateCardDialogProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [planStart, setPlanStart] = useState(today);
  const [planEnd, setPlanEnd] = useState(today);
  const preview = usePlanPreview(kind === 'PROJECT' ? projectId : null, planStart, planEnd);
  const selected = options.projects.find((project) => project.projectId === projectId) ?? null;
  const isProject = kind === 'PROJECT';

  return (
    <ActionDialog
      title={isProject ? 'Buat kartu rencana project' : 'Buat kartu activity'}
      submitLabel="Simpan kartu"
      action={createCardAction}
      onClose={() => router.replace(closeHref)}
      closeOnSuccess={false}
      hidden={{ kind, returnTo: closeHref }}
    >
      {({ fieldErrors }) => (
        <>
          <Typography variant="body2" color="text.secondary">
            Kartu adalah catatan kerja Anda dan tidak mengubah status tahapan. Setelah dibuat, judul, project, tahapan, step, dan estimasi jam tidak dapat diubah; bila salah, batalkan dan buat ulang.
          </Typography>
          {isProject ? (
            <>
              <TextField select name="projectId" label="Project" value={projectId ?? ''} onChange={(event) => setProjectId(event.target.value === '' ? null : Number(event.target.value))} slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(fieldErrors.project)} helperText={fieldErrors.project ?? (options.projects.length === 0 ? 'Belum ada project yang Anda ikuti.' : undefined)}>
                <option value="">Pilih project</option>
                {options.projects.map((project) => <option key={project.projectId} value={project.projectId}>{project.code} · {project.name} ({PROJECT_STATUS_TEXT[project.status]})</option>)}
              </TextField>
              {selected && (selected.status === 'BACKLOG' || selected.status === 'DEFERRED') ? <StatusConfirm status={selected.status} reason={selected.statusReason} error={fieldErrors.statusConfirm} /> : null}
              <TextField select name="stepName" label={`Step ${options.stage ?? ''} (opsional)`} defaultValue="" slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(fieldErrors.step)} helperText={fieldErrors.step}>
                <option value="">Tanpa step</option>
                {options.steps.map((step) => <option key={step.id} value={step.name}>{step.name}</option>)}
              </TextField>
            </>
          ) : (
            <TextField select name="categoryId" label="Kategori activity" defaultValue="" slotProps={{ select: { native: true }, inputLabel: { shrink: true } }} error={Boolean(fieldErrors.category)} helperText={fieldErrors.category}>
              <option value="">Pilih kategori</option>
              {options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </TextField>
          )}
          <TextField name="title" label="Judul rencana" required error={Boolean(fieldErrors.title)} helperText={fieldErrors.title ?? '3 sampai 120 karakter.'} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <DateField name="planStart" label="Rencana mulai" defaultValue={today} error={fieldErrors.plan} onValueChange={setPlanStart} />
            <DateField name="planEnd" label="Rencana selesai" defaultValue={today} onValueChange={setPlanEnd} />
          </div>
          <TextField name="estimateHours" label="Estimasi jam (opsional)" placeholder="mis. 8 atau 1,5" error={Boolean(fieldErrors.estimate)} helperText={fieldErrors.estimate ?? 'Lebih dari 0 sampai 80 jam.'} slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
          <TextField select name="column" label="Kolom awal" defaultValue="PLANNED" slotProps={{ select: { native: true } }} error={Boolean(fieldErrors.column)} helperText={fieldErrors.column}>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
          </TextField>
          <FormControlLabel control={<Checkbox name="isAdhoc" value="1" />} label="Pekerjaan dadakan (tidak masuk penyebut kepatuhan)" />
          {isProject && preview?.kind === 'ADOPT' ? <FormControlLabel control={<Checkbox name="adoptPlan" value="1" />} label="Jadikan rentang rencana ini sebagai estimasi awal tahapan (tahapan belum punya timeline)" /> : null}
          {isProject ? <RevisionFields preview={preview} categories={options.revisionCategories} errors={fieldErrors} /> : null}
        </>
      )}
    </ActionDialog>
  );
}
