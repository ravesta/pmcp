/**
 * Implementasi Prisma untuk query baca project: pencarian berhalaman di server, agregat status, snapshot, dan
 * Assignment baru (FR-10, FR-12, FR-14-02, FR-15-01, FR-07-02).
 *
 * Seluruh penyaringan, pengurutan, dan paging dilakukan di SQL (Technical Design §13): tidak ada `findMany` tanpa
 * batas dan tidak ada penyaringan di memori atas seluruh project.
 */
import type { PrismaClient } from '@/generated/prisma/client';
import { toIsoDate } from '@/shared/iso-date';
import type { NewAssignmentRow, ProjectFilter, ProjectQueryRepository, ProjectSearch } from '../application/ports';
import type { ProjectStatus, StageKind } from '../domain/stage-types';
import {
  readProjectSnapshot,
  readProjectSnapshots,
  REVISION_INCLUDE,
  toRevisionRow,
} from './prisma-project-repository';

/** Kondisi SQL beserta parameternya (positional `$n`). */
interface SqlWhere {
  readonly sql: string;
  readonly params: unknown[];
}

/**
 * Meloloskan karakter khusus pola LIKE pada kata kunci pencarian.
 * Masukan: teks bebas. Keluaran: teks aman untuk dipakai di dalam `%...%` dengan `ESCAPE '\\'`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §7 (input tidak tepercaya), FR-10-01.
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Menyusun klausa WHERE untuk pencarian project menurut filter bersama Daftar dan Gantt. Project tampil bila
 * memenuhi semua filter tingkat project dan sedikitnya satu tahapannya memenuhi filter tahapan.
 * Masukan: filter dan tanggal hari ini. Keluaran: klausa SQL (alias tabel `p` untuk project) dan parameternya.
 * Efek samping: tidak ada (fungsi murni). Semua nilai pengguna dikirim sebagai parameter, tidak disambung ke SQL.
 * Rujukan: BL-41, FR-10-01, FR-12-03, FR-13-03 (Terlambat = estimasi selesai sebelum hari ini pada project Berjalan).
 */
export function buildProjectWhere(filter: ProjectFilter, today: string): SqlWhere {
  const params: unknown[] = [];
  const conditions: string[] = [];
  const bind = (value: unknown, cast = ''): string => {
    params.push(value);
    return `$${params.length}${cast}`;
  };

  const q = filter.q?.trim();
  if (q) {
    const pattern = bind(`%${escapeLike(q)}%`);
    conditions.push(
      `(p.code ILIKE ${pattern} ESCAPE '\\' OR p.name ILIKE ${pattern} ESCAPE '\\' OR p.reference_no ILIKE ${pattern} ESCAPE '\\'` +
        ` OR EXISTS (SELECT 1 FROM project_application pa JOIN affected_application aa ON aa.id = pa.application_id WHERE pa.project_id = p.id AND aa.name ILIKE ${pattern} ESCAPE '\\')` +
        ` OR EXISTS (SELECT 1 FROM project_stage s JOIN stage_assignment a ON a.stage_id = s.id JOIN pic c ON c.id = a.pic_id WHERE s.project_id = p.id AND c.name ILIKE ${pattern} ESCAPE '\\'))`,
    );
  }
  if (filter.status) conditions.push(`p.status = ${bind(filter.status, '::project_status_t')}`);
  if (filter.projectType) conditions.push(`p.project_type = ${bind(filter.projectType, '::project_type_t')}`);
  if (filter.picId !== undefined) {
    conditions.push(
      `EXISTS (SELECT 1 FROM project_stage s JOIN stage_assignment a ON a.stage_id = s.id WHERE s.project_id = p.id AND a.pic_id = ${bind(filter.picId)})`,
    );
  }
  if (filter.projectIds) conditions.push(`p.id = ANY(${bind(filter.projectIds.map(BigInt), '::bigint[]')})`);

  const noPic = 'NOT EXISTS (SELECT 1 FROM stage_assignment a WHERE a.stage_id = s.id)';
  const incomplete = `EXISTS (SELECT 1 FROM project_stage s WHERE s.project_id = p.id AND (s.est_start IS NULL OR ${noPic}))`;
  if (filter.completeness === 'INCOMPLETE') conditions.push(incomplete);
  if (filter.completeness === 'COMPLETE') conditions.push(`NOT ${incomplete}`);
  if (filter.completeness === 'NO_PIC') conditions.push(`EXISTS (SELECT 1 FROM project_stage s WHERE s.project_id = p.id AND ${noPic})`);
  if (filter.completeness === 'NO_TIMELINE') conditions.push('EXISTS (SELECT 1 FROM project_stage s WHERE s.project_id = p.id AND s.est_start IS NULL)');

  const stageConditions: string[] = [];
  if (filter.stage) stageConditions.push(`s.stage = ${bind(filter.stage, '::stage_t')}`);
  switch (filter.stageStatus) {
    case 'OPEN':
      stageConditions.push(`s.status <> 'DONE'`);
      break;
    case 'RUNNING':
    case 'LAGGING':
      stageConditions.push(`s.status = 'RUNNING'`);
      if (filter.stageStatus === 'LAGGING') stageConditions.push(`p.status = 'RUNNING'`);
      break;
    case 'HELD':
      stageConditions.push(`s.status = 'HELD'`);
      break;
    case 'DONE':
      stageConditions.push(`s.status = 'DONE'`);
      break;
    case 'LATE':
      stageConditions.push(`p.status = 'RUNNING' AND s.status IN ('NOT_STARTED', 'RUNNING') AND s.est_end < ${bind(today, '::date')}`);
      break;
    default:
      break;
  }
  if (filter.mineOnlyPicId !== undefined) {
    stageConditions.push(`EXISTS (SELECT 1 FROM stage_assignment a WHERE a.stage_id = s.id AND a.pic_id = ${bind(filter.mineOnlyPicId)})`);
  }
  if (stageConditions.length > 0) {
    conditions.push(`EXISTS (SELECT 1 FROM project_stage s WHERE s.project_id = p.id AND ${stageConditions.join(' AND ')})`);
  }

  return { sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

/**
 * Membuat repository query baca project di atas klien Prisma.
 * Masukan: klien Prisma. Keluaran: `ProjectQueryRepository`.
 * Efek samping: tidak ada pada pembuatan; metode yang dikembalikan hanya membaca.
 * Rujukan: Technical Design §7.1, §13.
 */
export function createPrismaProjectQueries(prisma: PrismaClient): ProjectQueryRepository {
  return {
    /** Mencari id project berhalaman menurut filter dan urutan. Efek samping: tidak ada (hanya baca). */
    async searchProjectIds(search: ProjectSearch) {
      const where = buildProjectWhere(search.filter, search.today);
      const orderBy =
        search.order === 'START'
          ? 'ORDER BY (SELECT MIN(s.est_start) FROM project_stage s WHERE s.project_id = p.id) ASC NULLS LAST, p.id ASC'
          : 'ORDER BY p.id DESC';
      const limit = `$${where.params.length + 1}`;
      const offset = `$${where.params.length + 2}`;
      const [idRows, countRows] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
          `SELECT p.id FROM project p ${where.sql} ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
          ...where.params,
          search.pageSize,
          (search.page - 1) * search.pageSize,
        ),
        prisma.$queryRawUnsafe<Array<{ total: bigint }>>(`SELECT COUNT(*) AS total FROM project p ${where.sql}`, ...where.params),
      ]);
      return { ids: idRows.map((row) => Number(row.id)), total: Number(countRows[0]?.total ?? 0) };
    },

    /** Jumlah seluruh project per status. Efek samping: tidak ada (hanya baca). */
    async countByStatus() {
      const groups = await prisma.project.groupBy({ by: ['status'], _count: { _all: true } });
      const counts: Record<ProjectStatus, number> = { BACKLOG: 0, RUNNING: 0, DEFERRED: 0, CANCELLED: 0, COMPLETED: 0 };
      for (const group of groups) counts[group.status as ProjectStatus] = group._count._all;
      return counts;
    },

    /** Snapshot banyak project. Efek samping: tidak ada (hanya baca). */
    loadSnapshots: (ids) => readProjectSnapshots(prisma, ids),

    /** Snapshot satu project. Efek samping: tidak ada (hanya baca). */
    loadSnapshot: (id) => readProjectSnapshot(prisma, id),

    /** Mencari id project menurut kode. Efek samping: tidak ada (hanya baca). */
    async findProjectIdByCode(code) {
      const row = await prisma.project.findUnique({ where: { code }, select: { id: true } });
      return row ? Number(row.id) : null;
    },

    /** Tahapan Berjalan pada project Berjalan. Efek samping: tidak ada (hanya baca). */
    async listRunningStageCandidates() {
      const rows = await prisma.project_stage.findMany({
        where: { status: 'RUNNING', project: { status: 'RUNNING' } },
        select: { id: true, project_id: true, stage: true },
      });
      return rows.map((row) => ({
        projectId: Number(row.project_id),
        stage: { stageId: Number(row.id), projectId: Number(row.project_id), kind: row.stage as StageKind },
      }));
    },

    /** Seluruh revisi estimasi sebuah project. Efek samping: tidak ada (hanya baca). */
    async listRevisionsOfProject(projectId) {
      const rows = await prisma.stage_revision.findMany({
        where: { project_stage: { project_id: BigInt(projectId) } },
        orderBy: [{ stage_id: 'asc' }, { seq: 'asc' }],
        include: REVISION_INCLUDE,
      });
      return rows.map(toRevisionRow);
    },

    /** Daftar Assignment baru milik PIC. Efek samping: tidak ada (hanya baca). */
    async listNewAssignments(picId): Promise<NewAssignmentRow[]> {
      const rows = await prisma.stage_assignment.findMany({
        where: { pic_id: BigInt(picId), seen_at: null },
        orderBy: { assigned_at: 'desc' },
        include: { project_stage: { include: { project: true } }, app_user: { include: { pic: true } } },
      });
      return rows.map((row) => {
        const stage = row.project_stage;
        const estimate =
          stage.est_start && stage.est_end
            ? { start: toIsoDate(stage.est_start.toISOString().slice(0, 10)), end: toIsoDate(stage.est_end.toISOString().slice(0, 10)) }
            : null;
        return {
          projectId: Number(stage.project_id),
          projectCode: stage.project.code,
          projectName: stage.project.name,
          stage: stage.stage as StageKind,
          estimate,
          assignedByLabel: row.app_user.pic?.name ?? row.app_user.username,
          assignedAt: row.assigned_at,
        };
      });
    },

    /** Pilihan nama project untuk filter, terbaru di atas dan dibatasi. Efek samping: tidak ada (hanya baca). */
    async listProjectOptions(limit) {
      const rows = await prisma.project.findMany({ select: { id: true, code: true, name: true }, orderBy: { id: 'desc' }, take: limit });
      return rows.map((row) => ({ id: Number(row.id), code: row.code, name: row.name }));
    },

    /** Menandai penugasan PIC pada project sebagai sudah dilihat. Efek samping: UPDATE `stage_assignment.seen_at`. */
    async markAssignmentsSeen(projectId, picId, now) {
      const updated = await prisma.stage_assignment.updateMany({
        where: { pic_id: BigInt(picId), seen_at: null, project_stage: { project_id: BigInt(projectId) } },
        data: { seen_at: now },
      });
      return updated.count;
    },
  };
}
