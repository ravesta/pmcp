import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ProjectFormOptions, StageView } from '@/modules/project';
import { InfoItem } from '@/ui/components/info-item';
import { ProgressMeter } from '@/ui/components/progress-meter';
import { ToneChip } from '@/ui/components/tone-chip';
import { completionBadge, displayStatusBadge, formatAssignees, formatDateOrDash, formatRange, formatShift } from '@/ui/format/project-labels';
import { StageActions } from './stage-actions';

/** Properti kotak tahapan. */
interface StageBoxProps {
  readonly projectName: string;
  readonly stage: StageView;
  readonly options: ProjectFormOptions;
  readonly revisionThreshold: number;
  readonly isManager: boolean;
}

/**
 * Kotak satu tahapan pada Detail Project: PIC, status dan penanda (Terlambat, Tertinggal, revisi berulang), estimasi
 * terkini dan awal beserta pergeserannya, tanggal aktual, progres dengan rincian per PIC, dan tombol aksi.
 * Masukan: nama project, tahapan, pilihan master, batas revisi, dan penanda Manager. Keluaran: kotak tahapan.
 * Efek samping: tidak ada (komponen murni; tombol aksi dikelola komponen klien `StageActions`).
 * Rujukan: Screen [014] field 7, FR-05-02 butir 2 (rincian per PIC), FR-12-02 butir 4, FR-13-04, FR-13-05 butir 9.
 */
export function StageBox({ projectName, stage, options, revisionThreshold, isManager }: StageBoxProps) {
  const badge = displayStatusBadge(stage.display);
  const completion = completionBadge(stage.completion);
  const shift = formatShift(stage.shiftWorkdays);
  const { progress } = stage;
  return (
    <Paper id={`tahap-${stage.kind}`} variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5, scrollMarginTop: 16 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h2" component="h3">{stage.label}</Typography>
          <ToneChip text={badge.text} tone={badge.tone} />
          {completion ? <ToneChip text={completion.text} tone={completion.tone} /> : null}
          {progress.lagging ? <ToneChip text="Tertinggal" tone="warn" /> : null}
          {stage.revisionCount > 0 ? <ToneChip text={`R${stage.revisionCount}`} tone={stage.revisionAtLimit ? 'warn' : 'neutral'} /> : null}
        </Box>
        <StageActions projectName={projectName} stage={stage} options={options} revisionThreshold={revisionThreshold} isManager={isManager} />
      </Box>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
        <InfoItem label="PIC">{formatAssignees(stage.assignees)}</InfoItem>
        <InfoItem label="Estimasi terkini">{formatRange(stage.estimate)}</InfoItem>
        <InfoItem label="Estimasi awal">{formatRange(stage.baseline, '-')}{shift ? <Typography variant="caption" color="text.secondary" component="div">{shift}</Typography> : null}</InfoItem>
        <InfoItem label="Aktual">{formatDateOrDash(stage.actualStart)} - {formatDateOrDash(stage.actualEnd)}</InfoItem>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" component="div">Progres tahapan</Typography>
        <ProgressMeter value={progress.effective} label={`Progres tahapan ${stage.label}`} />
        <Typography variant="caption" color="text.secondary" component="div">
          Hitungan sistem: {progress.system === null ? 'belum ada kartu' : `${progress.system}%`} · Diharapkan menurut laju: {progress.expected}%
          {progress.manual !== null ? ` · Disesuaikan manual oleh ${progress.manualBy ?? '-'}${progress.manualNote ? `: ${progress.manualNote}` : ''}` : ''}
        </Typography>
        {progress.perPic.length > 0 ? (
          <Typography variant="caption" color="text.secondary" component="div">
            Per PIC: {progress.perPic.map((p) => `${p.name} (${p.cardCount} kartu, ${p.progress}%)`).join(' · ')}
          </Typography>
        ) : null}
        {progress.lagging && progress.lowestPic ? <Typography variant="caption" color="warning.main" component="div">Progres terendah: {progress.lowestPic}</Typography> : null}
      </Box>

      {progress.picsWithoutCards.length > 0 ? <Alert severity="warning">Belum ada kartu rencana dari {progress.picsWithoutCards.join(', ')} pada tahapan ini. Angka progres tidak berubah.</Alert> : null}
      {stage.revisionAtLimit ? <Alert severity="warning">Tahapan ini sudah direvisi {stage.revisionCount} kali (batas peringatan {revisionThreshold}).</Alert> : null}
      {stage.status === 'HELD' && stage.holdReason ? <Alert severity="info">Ditahan: {stage.holdReason}</Alert> : null}
    </Paper>
  );
}
