import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { can } from '@/modules/auth';
import { getProjectFormOptions, PAGE_SIZES, searchProjects, type ProjectStatus } from '@/modules/project';
import { getContainer } from '@/platform/container';
import { EmptyState } from '@/ui/components/empty-state';
import { FilterBar } from '@/ui/components/filter-bar';
import { PaginationBar } from '@/ui/components/pagination-bar';
import { buildTimeline, defaultWindow, shiftMonthKey, type Zoom } from '@/ui/gantt/timeline';
import { requirePageSession } from '../../_lib/session';
import { GanttChart } from './_components/gantt-chart';
import { GanttControls } from './_components/gantt-controls';
import { ProjectFilterFields } from './_components/project-filter-fields';
import { ProjectListTable } from './_components/project-list-table';
import { ProjectStatusSummary } from './_components/project-status-summary';
import { activeFilterCount, buildProjectHref, parseProjectParams, type RawSearchParams } from './_lib/search-params';
import { LinkButton } from '@/ui/components/link-controls';

/**
 * Tab Project (Screen [010]): ringkasan status, pilihan tampilan Daftar atau Gantt, satu bar filter bersama, dan isi
 * tampilan terpilih. Semua keadaan berada di URL; penyaringan dan paging dilakukan di server.
 * Masukan: parameter URL. Keluaran: halaman Project.
 * Efek samping: memvalidasi sesi dan membaca project (hanya baca).
 * Rujukan: BL-41, FR-10-01, FR-10-02, FR-12-01, FR-14-02, FR-15-01, NFR-08.
 */
export default async function ProjectPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const { actor } = await requirePageSession();
  const container = getContainer();
  const today = container.clock.today();
  const raw = await searchParams;
  const params = parseProjectParams(raw, actor.picId, today);
  const [result, options] = await Promise.all([
    searchProjects(container.project, actor, { mode: params.mode, filter: params.filter, page: params.page, pageSize: params.pageSize }),
    getProjectFormOptions(container.project),
  ]);

  const defaults = defaultWindow(today);
  const hrefFor = (overrides: Parameters<typeof buildProjectHref>[1]): string => buildProjectHref(params, overrides, defaults);
  const filterCount = activeFilterCount(params);
  const resetHref = hrefFor({ filter: {}, mineOnly: false, page: 1 });
  const createdCode = typeof raw.dibuat === 'string' && /^PRJ-\d+$/.test(raw.dibuat) ? raw.dibuat : null;

  const preserve: Record<string, string> = {};
  if (params.mode === 'LIST') preserve.v = 'daftar';
  else {
    if (params.zoom !== 'WEEK') preserve.zoom = params.zoom;
    if (params.window.from !== defaults.from || params.window.to !== defaults.to) {
      preserve.dari = params.window.from;
      preserve.sampai = params.window.to;
    }
    if (!params.showLayers) preserve.lapisan = '0';
  }

  const timeline = params.mode === 'GANTT' ? buildTimeline(params.window, params.zoom, today) : null;
  const zoomHref = (zoom: Zoom): string => hrefFor({ zoom });

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h1">Project</Typography>
        {can(actor, 'project.create') ? <LinkButton href="/project/baru" variant="contained">+ Buat project</LinkButton> : null}
      </Box>

      {createdCode ? (
        <Alert severity="success" role="status">
          Project {createdCode} berhasil dibuat.
          {raw.lengkap === '0' ? ' Perencanaan belum lengkap: cari project ini lewat filter Kelengkapan perencanaan untuk melengkapi PIC dan timeline.' : ''}
        </Alert>
      ) : null}

      <ProjectStatusSummary
        counts={result.statusCounts}
        activeStatus={params.filter.status}
        hrefFor={(status: ProjectStatus | undefined) => hrefFor({ filter: { ...params.filter, status }, page: 1 })}
      />

      <Box role="group" aria-label="Pilihan tampilan" sx={{ display: 'flex', gap: 0.5 }}>
        <LinkButton href={hrefFor({ mode: 'GANTT', page: 1, pageSize: 0 })} size="small" variant={params.mode === 'GANTT' ? 'contained' : 'outlined'} aria-pressed={params.mode === 'GANTT'}>Gantt</LinkButton>
        <LinkButton href={hrefFor({ mode: 'LIST', page: 1, pageSize: 0 })} size="small" variant={params.mode === 'LIST' ? 'contained' : 'outlined'} aria-pressed={params.mode === 'LIST'}>Daftar</LinkButton>
      </Box>

      <FilterBar action="/project" preserve={preserve} resetHref={resetHref} activeCount={filterCount}>
        <ProjectFilterFields params={params} pics={options.pics} isPic={actor.picId !== null} />
      </FilterBar>

      {params.mode === 'GANTT' ? (
        <GanttControls
          window={params.window}
          zoom={params.zoom}
          showLayers={params.showLayers}
          hrefs={{
            previous: hrefFor({ window: { from: shiftMonthKey(params.window.from, -1), to: shiftMonthKey(params.window.to, -1) }, page: 1 }),
            next: hrefFor({ window: { from: shiftMonthKey(params.window.from, 1), to: shiftMonthKey(params.window.to, 1) }, page: 1 }),
            today: hrefFor({ window: defaults, page: 1 }),
            zoom: { DAY: zoomHref('DAY'), WEEK: zoomHref('WEEK'), MONTH: zoomHref('MONTH') },
            toggleLayers: hrefFor({ showLayers: !params.showLayers }),
          }}
        />
      ) : null}

      {result.projects.length === 0 ? (
        <EmptyState
          message={filterCount > 0 ? 'Tidak ada project yang cocok dengan filter.' : 'Belum ada project.'}
          action={filterCount > 0 ? <LinkButton href={resetHref} variant="outlined">Reset filter</LinkButton> : undefined}
        />
      ) : params.mode === 'GANTT' && timeline ? (
        <GanttChart projects={result.projects} timeline={timeline} showLayers={params.showLayers} />
      ) : (
        <ProjectListTable projects={result.projects} />
      )}

      <PaginationBar
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        pageSizeOptions={PAGE_SIZES[params.mode].options}
        hrefFor={(page, pageSize) => hrefFor({ page, pageSize })}
        unit="project"
      />
    </>
  );
}
