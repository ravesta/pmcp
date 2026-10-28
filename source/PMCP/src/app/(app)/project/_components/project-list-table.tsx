import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import type { ProjectView } from '@/modules/project';
import { ToneChip } from '@/ui/components/tone-chip';
import { displayStatusBadge, formatAssignees, formatRange, PROJECT_STATUS_TEXT, PROJECT_TYPE_TEXT, projectStatusTone } from '@/ui/format/project-labels';

/**
 * Menulis "Nama / Department" business owner; bagian kosong menjadi "-".
 * Masukan: business owner dan department. Keluaran: teks.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Screen [012] field 5.
 */
function ownerText(owner: string | null, department: string | null): string {
  return `${owner ?? '-'} / ${department ?? '-'}`;
}

/**
 * Daftar Project berupa tabel: ID, nama dan no. referensi (tautan ke Detail), jenis, aplikasi, business owner,
 * estimasi keseluruhan, tiga tahapan dengan PIC dan status, serta status project beserta penanda terlambat dan
 * "Perlu dilengkapi". Tabel dapat digulir mendatar pada layar sempit.
 * Masukan: project halaman ini. Keluaran: tabel.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-10-01, Screen [012], FR-02-02 butir 4, handoff UX/UI §8.
 */
export function ProjectListTable({ projects }: { readonly projects: ReadonlyArray<ProjectView> }) {
  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small" sx={{ minWidth: 920 }} aria-label="Daftar project">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell sx={{ minWidth: 180 }}>Nama project</TableCell>
              <TableCell>Jenis</TableCell>
              <TableCell>Aplikasi terdampak</TableCell>
              <TableCell>Business owner</TableCell>
              <TableCell>Estimasi</TableCell>
              <TableCell>Tahapan dan PIC</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id} hover sx={{ verticalAlign: 'top' }}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{project.code}</TableCell>
                <TableCell>
                  <Link href={`/project/${project.code}`} style={{ fontWeight: 600 }}>{project.name}</Link>
                  {project.referenceNo ? <Typography variant="caption" color="text.secondary" component="div">{project.referenceNo}</Typography> : null}
                </TableCell>
                <TableCell>{project.projectType ? <ToneChip text={PROJECT_TYPE_TEXT[project.projectType]} tone="neutral" /> : '-'}</TableCell>
                <TableCell>{project.applications.length > 0 ? project.applications.map((a) => a.name).join(', ') : '-'}</TableCell>
                <TableCell>{ownerText(project.businessOwner, project.department)}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {formatRange(project.overall)}
                  {project.overallPartial ? <Typography variant="caption" color="text.secondary" component="div">(sebagian tahapan)</Typography> : null}
                </TableCell>
                <TableCell>
                  {project.stages.map((stage) => {
                    const badge = displayStatusBadge(stage.display);
                    return (
                      <Box key={stage.stageId} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 28 }}>{stage.label}</Typography>
                        <Typography variant="body2">{formatAssignees(stage.assignees)}</Typography>
                        <ToneChip text={badge.text} tone={badge.tone} />
                        {stage.progress.lagging ? <ToneChip text="Tertinggal" tone="warn" /> : null}
                      </Box>
                    );
                  })}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexDirection: 'column', alignItems: 'flex-start' }}>
                    <ToneChip text={PROJECT_STATUS_TEXT[project.status]} tone={projectStatusTone(project.status)} />
                    {project.hasLateStage ? <ToneChip text="Terlambat" tone="late" /> : null}
                    {!project.planning.isComplete ? <ToneChip text="Perlu dilengkapi" tone="warn" /> : null}
                    {project.statusReason ? <Typography variant="caption" color="text.secondary">{project.statusReason}</Typography> : null}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
