import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { listProjectHistory } from '@/modules/audit';
import { getProjectDetail } from '@/modules/project';
import { getContainer } from '@/platform/container';
import { InfoItem } from '@/ui/components/info-item';
import { ToneChip } from '@/ui/components/tone-chip';
import { formatDateOrDash, formatRange, PROJECT_STATUS_TEXT, PROJECT_TYPE_TEXT, projectStatusTone } from '@/ui/format/project-labels';
import { requirePageSession } from '../../../_lib/session';
import { EditInfoButton } from '../_components/edit-info-dialog';
import { ProjectHistory } from '../_components/project-history';
import { StageBox } from '../_components/stage-box';
import { StageHistory } from '../_components/stage-history';
import { LinkButton } from '@/ui/components/link-controls';

/** Jumlah catatan riwayat perubahan per halaman. */
const HISTORY_PAGE_SIZE = 10;

/**
 * Detail Project (Screen [014]): informasi project, tiga kotak tahapan, riwayat estimasi dan penahanan, dan riwayat
 * perubahan. Semua peran dapat membuka semua project; membuka detail menandai Assignment baru PIC sebagai dilihat.
 * Masukan: kode project pada alamat dan nomor halaman riwayat. Keluaran: halaman detail, atau pesan tidak ditemukan.
 * Efek samping: memvalidasi sesi; menandai penugasan PIC pada project ini sebagai sudah dilihat (BL-45).
 * Rujukan: FR-11-01, FR-07-02, BL-45, EC-11-01.01.
 */
export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { actor } = await requirePageSession();
  const { code } = await params;
  const container = getContainer();
  const detail = await getProjectDetail(container.project, actor, decodeURIComponent(code));
  if (!detail.ok) {
    return (
      <>
        <Alert severity="error" role="alert">{detail.error.message}</Alert>
        <Box><LinkButton href="/project" variant="outlined">Kembali ke Project</LinkButton></Box>
      </>
    );
  }

  const { project, revisions, options, revisionThreshold, canEditInfo } = detail.data;
  const rawPage = (await searchParams).rhal;
  const requestedPage = typeof rawPage === 'string' && /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : 1;
  const history = await listProjectHistory(container.auditRepository, project.code, requestedPage, HISTORY_PAGE_SIZE);

  return (
    <>
      <Box><LinkButton href="/project" size="small">← Kembali ke Project</LinkButton></Box>

      <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
          <Box>
            <Typography variant="h1">{project.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              <Typography color="text.secondary">{project.code}</Typography>
              <ToneChip text={PROJECT_STATUS_TEXT[project.status]} tone={projectStatusTone(project.status)} />
              {project.hasLateStage ? <ToneChip text="Terlambat" tone="late" /> : null}
              {!project.planning.isComplete ? <ToneChip text="Perlu dilengkapi" tone="warn" /> : null}
            </Box>
            {project.statusReason ? <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Alasan: {project.statusReason}</Typography> : null}
          </Box>
          {canEditInfo ? <EditInfoButton project={project} activeApplications={options.applications.map((a) => ({ id: a.id, label: a.name }))} /> : null}
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          <InfoItem label="No. referensi">{project.referenceNo ?? '-'}</InfoItem>
          <InfoItem label="Jenis project">{project.projectType ? PROJECT_TYPE_TEXT[project.projectType] : '-'}</InfoItem>
          <InfoItem label="Aplikasi terdampak">{project.applications.length > 0 ? project.applications.map((a) => (a.isActive ? a.name : `${a.name} (nonaktif)`)).join(', ') : '-'}</InfoItem>
          <InfoItem label="Business owner">{project.businessOwner ?? '-'}</InfoItem>
          <InfoItem label="Department">{project.department ?? '-'}</InfoItem>
          <InfoItem label="Request date">{formatDateOrDash(project.requestDate)}</InfoItem>
          <InfoItem label="Estimasi keseluruhan">{formatRange(project.overall)}{project.overallPartial ? ' (sebagian tahapan)' : ''}</InfoItem>
        </Box>
        <InfoItem label="Deskripsi">{project.description ?? '-'}</InfoItem>
      </Paper>

      <Typography variant="h2">Tahapan</Typography>
      {project.stages.map((stage) => (
        <StageBox key={stage.stageId} projectName={project.name} stage={stage} options={options} revisionThreshold={revisionThreshold} isManager={actor.role === 'MANAGER'} />
      ))}

      <Typography variant="h2">Rencana kerja dan Log activity</Typography>
      <Alert severity="info">Rencana kerja dan log activity dari kartu Kanban ditampilkan di sini setelah menu Kanban tersedia.</Alert>

      <Typography variant="h2">Riwayat estimasi dan penahanan</Typography>
      <StageHistory stages={project.stages} revisions={revisions} />

      <Typography variant="h2">Riwayat perubahan</Typography>
      <ProjectHistory rows={history.rows} page={history.page} pageSize={history.pageSize} total={history.total} hrefFor={(page) => (page > 1 ? `/project/${project.code}?rhal=${page}` : `/project/${project.code}`)} />
    </>
  );
}
