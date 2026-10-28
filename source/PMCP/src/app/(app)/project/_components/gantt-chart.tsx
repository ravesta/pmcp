import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { ProjectView } from '@/modules/project';
import { ToneChip } from '@/ui/components/tone-chip';
import { displayStatusBadge, formatAssignees, PROJECT_STATUS_TEXT, projectStatusTone } from '@/ui/format/project-labels';
import type { Timeline } from '@/ui/gantt/timeline';
import { GanttStageBar, TRACK_HEIGHT } from './gantt-stage-bar';

/** Lebar kolom nama yang tetap terlihat saat menggulir mendatar (piksel). */
const NAME_COLUMN = 250;

/** Properti Gantt. */
interface GanttChartProps {
  readonly projects: ReadonlyArray<ProjectView>;
  readonly timeline: Timeline;
  readonly showLayers: boolean;
}

/**
 * Jalur latar sebuah baris: arsiran akhir pekan dan garis hari ini, dipakai oleh semua baris agar sejajar.
 * Masukan: skala waktu. Keluaran: lapisan latar absolut.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-12-01 butir 4 (garis hari ini, akhir pekan diarsir).
 */
function TrackBackground({ timeline }: { readonly timeline: Timeline }) {
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0 }}>
      {timeline.weekends.map((span, index) => (
        <Box key={index} sx={{ position: 'absolute', top: 0, bottom: 0, left: `${span.leftPercent}%`, width: `${span.widthPercent}%`, bgcolor: 'action.hover' }} />
      ))}
      {timeline.todayPercent !== null ? <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: `${timeline.todayPercent}%`, width: 2, bgcolor: 'error.main', opacity: 0.8 }} /> : null}
    </Box>
  );
}

/**
 * Gantt tahapan semua project: kelompok per project (nama tertaut, ID, status, tiga baris tahapan dengan PIC dan
 * progres), header tanggal sesuai zoom, garis hari ini, dan akhir pekan diarsir. Dapat digulir; kolom nama tetap.
 * Masukan: project halaman ini, skala waktu, dan penanda lapisan. Keluaran: kartu Gantt.
 * Efek samping: tidak ada (komponen murni; kolom tahapan menautkan ke Detail Project).
 * Rujukan: FR-12-01, FR-12-02, FR-12-03, BL-17, handoff UX/UI §8 (kolom nama tetap) dan §9.
 */
export function GanttChart({ projects, timeline, showLayers }: GanttChartProps) {
  return (
    <Paper variant="outlined" sx={{ overflow: 'auto', maxHeight: '70vh' }}>
      <Box sx={{ minWidth: NAME_COLUMN + timeline.minWidthPx }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: `${NAME_COLUMN}px 1fr`, position: 'sticky', top: 0, zIndex: 3, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ position: 'sticky', left: 0, zIndex: 4, bgcolor: 'background.paper', p: 1, borderRight: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">Project dan tahapan</Typography>
          </Box>
          <Box sx={{ position: 'relative', height: 28 }} aria-hidden>
            {timeline.columns.map((column) => (
              <Typography key={column.key} variant="caption" sx={{ position: 'absolute', left: `${column.leftPercent}%`, width: `${column.widthPercent}%`, textAlign: 'center', overflow: 'hidden', lineHeight: '28px', borderLeft: 1, borderColor: 'divider' }}>
                {column.label}
              </Typography>
            ))}
          </Box>
        </Box>

        {projects.map((project) => (
          <Box key={project.id} component="section" aria-label={`${project.code} ${project.name}`} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: `${NAME_COLUMN}px 1fr`, bgcolor: 'action.hover' }}>
              <Box sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.default', p: 1, borderRight: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Link href={`/project/${project.code}`} style={{ fontWeight: 600 }}>{project.name}</Link>
                <Typography variant="caption" color="text.secondary">{project.code}</Typography>
                <ToneChip text={PROJECT_STATUS_TEXT[project.status]} tone={projectStatusTone(project.status)} />
              </Box>
              <Box />
            </Box>
            {project.stages.map((stage) => {
              const badge = displayStatusBadge(stage.display);
              return (
                <Box key={stage.stageId} sx={{ display: 'grid', gridTemplateColumns: `${NAME_COLUMN}px 1fr`, minHeight: TRACK_HEIGHT }}>
                  <Box sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: stage.isMine ? 'action.selected' : 'background.paper', px: 1, py: 0.5, borderRight: 1, borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      <Link href={`/project/${project.code}#tahap-${stage.kind}`}>{stage.label}</Link>
                      {' '}
                      <Typography component="span" variant="caption" color="text.secondary">{formatAssignees(stage.assignees)}</Typography>
                    </Typography>
                    <Typography variant="caption" color={badge.tone === 'late' ? 'error' : 'text.secondary'}>
                      {badge.text} · {stage.progress.effective}%{stage.progress.lagging ? ' · Tertinggal' : ''}{stage.revisionAtLimit ? ' · Revisi berulang' : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ position: 'relative', height: TRACK_HEIGHT }}>
                    <TrackBackground timeline={timeline} />
                    <GanttStageBar projectName={project.name} stage={stage} timeline={timeline} showLayers={showLayers} />
                  </Box>
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
