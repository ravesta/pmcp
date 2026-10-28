/**
 * Uji integrasi irisan 2 (sisi baca) di PostgreSQL sungguhan: Daftar dan Gantt dengan satu filter bersama,
 * paging di server, ringkasan status, penanda tahapan (Terlambat, Tertinggal, revisi), Detail Project, dan
 * Assignment baru.
 * Rujukan: FR-10, FR-11, FR-12, FR-14-02, FR-15-01, FR-07-02, BL-41, BL-45, NFR-14.
 *
 * Uji ini membutuhkan PostgreSQL (Prisma tidak berjalan di PGlite); dilewati bila server tidak terjangkau.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listProjectHistory } from '@/modules/audit';
import {
  getProjectDetail,
  listNewAssignments,
  searchProjects,
  setManualProgress,
  updateStageStatus,
  type ProjectFilter,
  type SearchProjectsResult,
} from '@/modules/project';
import type { Container } from '@/platform/container';
import { createTestDb, type TestDb } from './_support/database';
import { createWorld, insertCard, makeProject, snapshotOf, unwrap, type World } from './_support/world';

const testDb: TestDb = await createTestDb();
const isPg = testDb.engine === 'postgres' && Boolean(testDb.url);
let world: World;
let container: Container;

/** Kata penanda nama project uji agar pencarian tidak tercampur data lain. */
const TAG = 'RD';

/**
 * Mencari project uji (semua nama diawali penanda) dengan filter tambahan.
 * Masukan: mode, filter, halaman, ukuran halaman, dan pelaku (bawaan Manager). Keluaran: hasil pencarian.
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: BL-41.
 */
function search(mode: 'LIST' | 'GANTT', filter: ProjectFilter = {}, page = 1, pageSize = 50, actor = world.manager): Promise<SearchProjectsResult> {
  return searchProjects(container.project, actor, { mode, filter: { q: TAG, ...filter }, page, pageSize });
}

/**
 * Mengambil kode project dari hasil pencarian menurut urutannya.
 * Masukan: hasil pencarian. Keluaran: daftar kode.
 * Efek samping: tidak ada.
 * Rujukan: FR-12-01 butir 5.
 */
function codes(result: SearchProjectsResult): string[] {
  return result.projects.map((p) => p.code);
}

let late: { projectId: number; code: string };
let lagging: { projectId: number; code: string };
let deferred: { projectId: number; code: string };
let noTimeline: { projectId: number; code: string };
let complete: { projectId: number; code: string };

beforeAll(async () => {
  if (!isPg) return;
  world = await createWorld(testDb);
  container = world.container;
  const { rina, dimas, devPicId } = world;
  const apps = await container.prisma.affected_application.findMany({ take: 2, orderBy: { id: 'asc' } });
  const appName = apps[0]?.name ?? '';

  // proyek tanpa timeline dan tanpa PIC (dibuat pertama, id terkecil)
  noTimeline = await makeProject(world, { info: { name: `${TAG} Tanpa Timeline`, applicationIds: [Number(apps[0]?.id)] }, status: 'BACKLOG' });
  // proyek Ditunda yang estimasinya sudah lewat: tidak boleh dianggap terlambat (BL-22)
  deferred = await makeProject(world, {
    info: { name: `${TAG} Ditunda` },
    status: 'DEFERRED',
    statusReason: 'Menunggu anggaran',
    stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-05', estEnd: '2026-10-09' } },
  });
  // proyek terlambat: BA Berjalan, estimasi selesai Jumat 23/10 (hari ini Rabu 28/10 = terlambat 5 hari)
  late = await makeProject(world, {
    info: { name: `${TAG} Terlambat`, referenceNo: 'JIRA-100' },
    stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-12', estEnd: '2026-10-23' } },
  });
  // proyek tertinggal: estimasi 19/10-30/10, progres manual 40% terhadap diharapkan 70%
  lagging = await makeProject(world, {
    info: { name: `${TAG} Tertinggal`, applicationIds: [Number(apps[1]?.id)] },
    stages: {
      BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' },
      DEV: { picIds: [devPicId], estStart: '2026-11-02', estEnd: '2026-11-13' },
      QA: { picIds: [dimas.picId as number], estStart: '2026-11-16', estEnd: '2026-11-20' },
    },
  });
  // proyek lengkap tanpa tahapan Berjalan
  complete = await makeProject(world, {
    info: { name: `${TAG} Lengkap` },
    stages: {
      BA: { picIds: [rina.picId as number], estStart: '2026-12-01', estEnd: '2026-12-04' },
      DEV: { picIds: [devPicId], estStart: '2026-12-07', estEnd: '2026-12-11' },
      QA: { picIds: [dimas.picId as number], estStart: '2026-12-14', estEnd: '2026-12-18' },
    },
  });

  for (const target of [late, lagging]) {
    const ba = (await snapshotOf(world, target.projectId)).stages[0];
    if (!ba) throw new Error('Tahapan BA tidak ada');
    unwrap(await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'RUNNING' }));
  }
  const laggingBa = (await snapshotOf(world, lagging.projectId)).stages[0];
  if (!laggingBa) throw new Error('Tahapan BA tidak ada');
  unwrap(await setManualProgress(container.project, rina, { stageId: laggingBa.id, expectedVersion: laggingBa.version, value: 40 }));
  void appName;
}, 120_000);

afterAll(async () => {
  if (container) await container.prisma.$disconnect();
  await testDb.close();
});

describe('Daftar dan Gantt (FR-10, FR-12, BL-41)', () => {
  it.skipIf(!isPg)('Daftar: terbaru di atas; Gantt: estimasi mulai paling awal dan project tanpa timeline terakhir (FR-12-01 butir 5)', async () => {
    const list = await search('LIST');
    expect(codes(list)).toEqual([complete.code, lagging.code, late.code, deferred.code, noTimeline.code]);
    const gantt = await search('GANTT');
    expect(codes(gantt)).toEqual([deferred.code, late.code, lagging.code, complete.code, noTimeline.code]);
  });

  it.skipIf(!isPg)('paging di server: total mengikuti filter, ukuran di luar pilihan menjadi bawaan, halaman kedua berisi sisanya', async () => {
    const first = await search('LIST', {}, 1, 2); // 2 bukan pilihan Daftar -> bawaan 5
    expect(first.pageSize).toBe(5);
    expect(first.total).toBe(5);
    const second = await search('GANTT', {}, 2, 5);
    expect(second.projects).toHaveLength(0);
    const small = await search('GANTT', {}, 1, 5);
    expect(small.projects).toHaveLength(5);
  });

  it.skipIf(!isPg)('ringkasan status menghitung SELURUH project, tidak terpengaruh filter (FR-14-02)', async () => {
    const filtered = await search('LIST', { status: 'DEFERRED' });
    expect(codes(filtered)).toEqual([deferred.code]);
    const all = await container.prisma.project.count();
    const counts = filtered.statusCounts;
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(all);
    expect(counts.DEFERRED).toBeGreaterThanOrEqual(1);
  });

  it.skipIf(!isPg)('pencarian: kode, nomor referensi, nama PIC, dan nama aplikasi; karakter % tidak cocok dengan semuanya', async () => {
    expect(codes(await search('LIST', { q: late.code }))).toEqual([late.code]);
    expect(codes(await search('LIST', { q: 'JIRA-100' }))).toEqual([late.code]);
    expect(codes(await search('LIST', { q: 'Rina' })).sort()).toEqual([complete.code, deferred.code, lagging.code, late.code].sort());
    const app = await container.prisma.affected_application.findFirstOrThrow({ orderBy: { id: 'asc' } });
    expect(codes(await search('LIST', { q: app.name }))).toContain(noTimeline.code);
    expect((await search('LIST', { q: '%' })).total).toBe(0);
  });

  it.skipIf(!isPg)('filter Terlambat memakai estimasi selesai sebelum hari ini dan mengecualikan project Ditunda (BL-22)', async () => {
    const result = await search('LIST', { stageStatus: 'LATE' });
    expect(codes(result)).toEqual([late.code]);
    const view = result.projects[0]?.stages[0];
    expect(view?.display).toEqual({ kind: 'LATE', days: 5 });
    expect(result.projects[0]?.hasLateStage).toBe(true);
    const deferredView = (await search('LIST', { status: 'DEFERRED' })).projects[0];
    expect(deferredView?.hasLateStage).toBe(false);
  });

  it.skipIf(!isPg)('filter Tertinggal dari laju memakai progres yang berlaku: manual 40% terhadap diharapkan 70% (NFR-14)', async () => {
    const result = await search('LIST', { stageStatus: 'LAGGING' });
    // project Terlambat (progres 0% terhadap diharapkan 100%) juga tertinggal: dua penanda dapat berlaku bersamaan
    expect(codes(result)).toEqual([lagging.code, late.code]);
    const stage = result.projects.find((p) => p.code === lagging.code)?.stages[0];
    expect(stage?.progress).toMatchObject({ effective: 40, manual: 40, expected: 70, lagging: true });
  });

  it.skipIf(!isPg)('filter kelengkapan perencanaan dan jenis tahapan', async () => {
    expect(codes(await search('LIST', { completeness: 'COMPLETE' }))).toEqual([complete.code, lagging.code]);
    const incomplete = codes(await search('LIST', { completeness: 'INCOMPLETE' }));
    expect(incomplete).toEqual([late.code, deferred.code, noTimeline.code]);
    expect(codes(await search('LIST', { stage: 'QA', stageStatus: 'RUNNING' }))).toEqual([]);
  });

  it.skipIf(!isPg)('filter PIC menyaring project tetapi seluruh tahapan project itu tetap tampil (FR-12-03)', async () => {
    const result = await search('GANTT', { picId: world.dimas.picId as number });
    expect(codes(result).sort()).toEqual([complete.code, lagging.code].sort());
    const project = result.projects.find((p) => p.code === lagging.code);
    expect(project?.stages.map((s) => s.kind)).toEqual(['BA', 'DEV', 'QA']);
    expect(project?.stages.map((s) => s.assignees.length)).toEqual([1, 1, 1]);
  });

  it.skipIf(!isPg)('"Hanya milik saya" menyaring tahapan milik PIC yang login dan tidak dapat dipalsukan ke PIC lain', async () => {
    const mine = await search('LIST', { mineOnlyPicId: world.dimas.picId as number }, 1, 50, world.dimas);
    expect(codes(mine).sort()).toEqual([complete.code, lagging.code].sort());
    const forged = await search('LIST', { mineOnlyPicId: world.rina.picId as number }, 1, 50, world.dimas);
    expect(codes(forged).sort()).toEqual([complete.code, lagging.code].sort());
    const stages = mine.projects[0]?.stages ?? [];
    expect(stages.map((s) => s.isMine)).toEqual([false, false, true]);
  });

  it.skipIf(!isPg)('estimasi keseluruhan, penanda sebagian tahapan, dan kelengkapan perencanaan (FR-11-01, FR-10-01)', async () => {
    const result = await search('LIST');
    const lateView = result.projects.find((p) => p.code === late.code);
    expect(lateView?.overall).toEqual({ start: '2026-10-12', end: '2026-10-23' });
    expect(lateView?.overallPartial).toBe(true);
    expect(lateView?.planning.isComplete).toBe(false);
    const full = result.projects.find((p) => p.code === complete.code);
    expect(full?.overall).toEqual({ start: '2026-12-01', end: '2026-12-18' });
    expect(full?.overallPartial).toBe(false);
    expect(full?.planning.isComplete).toBe(true);
    expect(result.projects.find((p) => p.code === noTimeline.code)?.overall).toBeNull();
  });
});

describe('Detail Project dan Assignment baru (FR-11-01, FR-07-02, BL-45)', () => {
  it.skipIf(!isPg)('kode tidak dikenal menghasilkan "Project tidak ditemukan."', async () => {
    const result = await getProjectDetail(container.project, world.manager, 'PRJ-999999');
    expect(!result.ok && result.error.message).toBe('Project tidak ditemukan.');
  });

  it.skipIf(!isPg)('membuka detail menandai Assignment baru sebagai dilihat; daftar berkurang, project lain tidak terpengaruh', async () => {
    const project = await makeProject(world, {
      info: { name: `${TAG} Assignment` },
      stages: { BA: { picIds: [world.sari.picId as number], estStart: '2026-11-02', estEnd: '2026-11-06' }, QA: { picIds: [world.sari.picId as number], estStart: '', estEnd: '' } },
    }).catch(() => null);
    expect(project).toBeNull(); // PIC BA tidak boleh ditugaskan pada tahapan QA

    const real = await makeProject(world, {
      info: { name: `${TAG} Assignment` },
      stages: { BA: { picIds: [world.sari.picId as number], estStart: '2026-11-02', estEnd: '2026-11-06' } },
    });
    const before = await listNewAssignments(container.project, world.sari);
    expect(before.map((a) => a.projectCode)).toContain(real.code);
    const viewBefore = (await search('LIST', { q: real.code }, 1, 5, world.sari)).projects[0]?.stages[0];
    expect(viewBefore?.assignees[0]?.isNew).toBe(true);

    const detail = unwrap(await getProjectDetail(container.project, world.sari, real.code));
    expect(detail.project.stages[0]?.assignees[0]?.isNew).toBe(false);
    const after = await listNewAssignments(container.project, world.sari);
    expect(after.map((a) => a.projectCode)).not.toContain(real.code);
    expect(await listNewAssignments(container.project, world.manager)).toEqual([]);
  });

  it.skipIf(!isPg)('detail memuat hak tombol per peran dari server, rincian progres per PIC, dan riwayat revisi', async () => {
    const { rina, sari, dimas } = world;
    const ba = (await snapshotOf(world, lagging.projectId)).stages[0];
    if (!ba) throw new Error('Tahapan BA tidak ada');
    await insertCard(world, rina.picId as number, lagging.projectId, 'BA', { column: 'DONE', start: '2026-10-19', end: '2026-10-23' });
    await insertCard(world, rina.picId as number, lagging.projectId, 'BA', { column: 'PLANNED', start: '2026-10-26', end: '2026-10-30' });

    const asRina = unwrap(await getProjectDetail(container.project, rina, lagging.code));
    const stageRina = asRina.project.stages[0];
    expect(stageRina?.rights).toEqual({ update: true, editAssignees: true, fillTimeline: false, reopen: false });
    expect(stageRina?.progress.system).toBe(50);
    expect(stageRina?.progress.perPic).toEqual([{ picId: rina.picId, name: 'Rina', cardCount: 2, progress: 50 }]);
    expect(asRina.canEditInfo).toBe(true);

    const asSari = unwrap(await getProjectDetail(container.project, sari, lagging.code));
    expect(asSari.project.stages[0]?.rights.update).toBe(false);
    expect(asSari.project.stages[1]?.rights.update).toBe(false); // Development hanya Manager
    expect(asSari.project.stages[0]?.rights.editAssignees).toBe(false);

    const asDimas = unwrap(await getProjectDetail(container.project, dimas, lagging.code));
    expect(asDimas.project.stages[2]?.rights.update).toBe(true);

    const asManager = unwrap(await getProjectDetail(container.project, world.manager, lagging.code));
    expect(asManager.project.stages.every((s) => s.rights.update)).toBe(true);
    expect(asManager.options.pics.length).toBeGreaterThanOrEqual(5);
    expect(asManager.options.revisionCategories.length).toBeGreaterThanOrEqual(5);
  });

  it.skipIf(!isPg)('riwayat perubahan project terbuka bagi semua peran dan terbaru di atas (FR-11-01 butir 2)', async () => {
    const history = await listProjectHistory(container.auditRepository, lagging.code, 1, 10);
    expect(history.rows.length).toBeGreaterThanOrEqual(2);
    expect(history.rows[0]?.projectCode).toBe(lagging.code);
    expect(history.rows[history.rows.length - 1]?.action).toBe('project.created');
  });
});
