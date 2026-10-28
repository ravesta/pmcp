/**
 * Uji integrasi irisan 2 (sisi tulis) di PostgreSQL sungguhan: membuat project, melengkapi PIC dan timeline,
 * status tahapan (hold, selesai, buka kembali), progres manual, revisi estimasi, informasi project, dan konkurensi.
 * Rujukan: FR-02, FR-03, FR-05, FR-06, FR-11-02, FR-13, FR-14, NFR-04, NFR-10.
 *
 * Uji ini membutuhkan PostgreSQL (Prisma tidak berjalan di PGlite); dilewati bila server tidak terjangkau.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listAuditEvents } from '@/modules/audit';
import type { Actor } from '@/modules/auth';
import {
  createProject,
  reviseStageEstimate,
  setManualProgress,
  updateProjectInfo,
  updateStage,
  updateStagePlanning,
  updateStageStatus,
  type CreateProjectInput,
  type ProjectSnapshot,
} from '@/modules/project';
import type { Container } from '@/platform/container';
import { createTestDb, type TestDb } from './_support/database';
import { createWorld, insertCard as insertCardIn, makeProject as makeProjectIn, snapshotOf, unwrap, type CardOptions, type World } from './_support/world';

const testDb: TestDb = await createTestDb();
const isPg = testDb.engine === 'postgres' && Boolean(testDb.url);
let world: World;
let container: Container;
let manager: Actor;
let rina: Actor; // PIC BA
let dimas: Actor; // PIC QA
let sari: Actor; // PIC BA lain
let devPicId: number;
let revisionCategoryId: number;
/** Keadaan jam uji; `clockState.today` diubah uji yang menguji perpindahan hari. */
let clockState: World['clockState'];

/** Membuat project dengan nilai bawaan (pembungkus ringkas atas `makeProject` bersama). */
const makeProject = (over: Partial<CreateProjectInput> = {}) => makeProjectIn(world, over);
/** Membaca snapshot project untuk asersi. */
const snapshot = (projectId: number) => snapshotOf(world, projectId);
/** Menyisipkan kartu project untuk uji. */
const insertCard = (picId: number, projectId: number, stage: 'BA' | 'QA', options: CardOptions = {}) => insertCardIn(world, picId, projectId, stage, options);

beforeAll(async () => {
  if (!isPg) return;
  world = await createWorld(testDb);
  ({ container, manager, rina, sari, dimas, devPicId, revisionCategoryId, clockState } = world);
}, 60_000);

afterAll(async () => {
  if (container) await container.prisma.$disconnect();
  await testDb.close();
});

describe('membuat project (FR-02-01, FR-02-02)', () => {
  it.skipIf(!isPg)('nama saja dan status Backlog: tiga tahapan Belum Mulai tanpa PIC dan timeline (AC FR-02-01)', async () => {
    const { projectId, code } = await makeProject({ status: 'BACKLOG' });
    expect(code).toMatch(/^PRJ-\d{3,}$/);
    const project = await snapshot(projectId);
    expect(project.stages.map((s) => s.kind)).toEqual(['BA', 'DEV', 'QA']);
    expect(project.stages.every((s) => s.status === 'NOT_STARTED' && s.estimate === null && s.assignees.length === 0)).toBe(true);
  });

  it.skipIf(!isPg)('hanya Manager yang dapat membuat project', async () => {
    const result = await createProject(container.project, rina, { info: { name: 'Coba' }, status: 'BACKLOG', statusReason: '', stages: {} });
    expect(!result.ok && result.error.code).toBe('FORBIDDEN');
  });

  it.skipIf(!isPg)('PIC dan estimasi pertama: estimasi awal tersimpan, PIC login mendapat penanda Assignment baru, PIC Development tidak (BL-45)', async () => {
    const { projectId } = await makeProject({
      stages: {
        BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-23' },
        DEV: { picIds: [devPicId], estStart: '2026-10-26', estEnd: '2026-11-13' },
      },
    });
    const project = await snapshot(projectId);
    const [ba, dev] = project.stages;
    expect(ba?.estimate).toEqual({ start: '2026-10-19', end: '2026-10-23' });
    expect(ba?.baseline).toEqual(ba?.estimate);
    expect(ba?.assignees[0]?.seenAt).toBeNull();
    expect(dev?.assignees[0]?.seenAt).not.toBeNull();
  });

  it.skipIf(!isPg)('validasi: nama kosong, estimasi tidak berpasangan, PIC tidak sesuai tahapan, aplikasi nonaktif, Ditunda tanpa alasan, Selesai', async () => {
    const base: CreateProjectInput = { info: { name: ' ' }, status: 'DEFERRED', statusReason: '', stages: { BA: { picIds: [dimas.picId as number], estStart: '2026-10-19', estEnd: '' } } };
    const result = await createProject(container.project, manager, base);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION');
      expect(Object.keys(result.error.fields ?? {}).sort()).toEqual(['estimate.BA', 'name', 'pics.BA', 'statusReason']);
      expect(result.error.fields?.name).toBe('Nama project wajib diisi.');
      expect(result.error.fields?.statusReason).toBe('Isi alasan untuk status Ditunda.');
    }
    const completed = await createProject(container.project, manager, { info: { name: 'X' }, status: 'COMPLETED', statusReason: '', stages: {} });
    expect(!completed.ok && completed.error.fields?.status).toMatch(/Selesai/);

    const inactive = await container.prisma.affected_application.create({ data: { name: 'App Nonaktif Uji', is_active: false } });
    const withInactive = await createProject(container.project, manager, { info: { name: 'Y', applicationIds: [Number(inactive.id)] }, status: 'BACKLOG', statusReason: '', stages: {} });
    expect(!withInactive.ok && withInactive.error.fields?.applicationIds).toMatch(/tidak aktif/);
  });

  it.skipIf(!isPg)('batas panjang: nama 100 diterima, 101 ditolak (EC-02-01.08)', async () => {
    expect((await createProject(container.project, manager, { info: { name: 'x'.repeat(100) }, status: 'BACKLOG', statusReason: '', stages: {} })).ok).toBe(true);
    const tooLong = await createProject(container.project, manager, { info: { name: 'x'.repeat(101) }, status: 'BACKLOG', statusReason: '', stages: {} });
    expect(!tooLong.ok && tooLong.error.fields?.name).toBe('Nama project maksimal 100 karakter.');
  });

  it.skipIf(!isPg)('dua project dibuat bersamaan mendapat ID berbeda (EC-02-01.07)', async () => {
    const [a, b] = await Promise.all([makeProject({ status: 'BACKLOG' }), makeProject({ status: 'BACKLOG' })]);
    expect(a.code).not.toBe(b.code);
  });

  it.skipIf(!isPg)('pembuatan tercatat di jejak audit tanpa data sensitif', async () => {
    const { code } = await makeProject({ info: { name: 'Proyek Audit' }, status: 'BACKLOG' });
    const audit = unwrap(await listAuditEvents(container.auditRepository, manager, { page: 1, pageSize: 50 }));
    const event = audit.rows.find((row) => row.action === 'project.created' && row.projectCode === code);
    expect(event?.actorLabel).toBe('Manager');
    expect(event?.summary).toContain('Proyek Audit');
  });
});

describe('melengkapi PIC dan timeline (FR-03-01)', () => {
  it.skipIf(!isPg)('PIC QA dapat mengisi PIC dan timeline tahapan Development yang kosong; estimasi pertama menjadi estimasi awal (AC FR-03-01)', async () => {
    const { projectId } = await makeProject();
    const dev = (await snapshot(projectId)).stages[1] as NonNullable<ProjectSnapshot['stages'][number]>;
    unwrap(await updateStagePlanning(container.project, dimas, { stageId: dev.id, expectedVersion: dev.version, picIds: [devPicId], estStart: '2026-10-26', estEnd: '2026-11-13' }));
    const after = (await snapshot(projectId)).stages[1];
    expect(after?.assignees.map((a) => a.picId)).toEqual([devPicId]);
    expect(after?.baseline).toEqual({ start: '2026-10-26', end: '2026-11-13' });
  });

  it.skipIf(!isPg)('PIC BA yang bukan PIC tahapan QA tidak dapat mengubah PIC tahapan QA yang terisi; PIC tahapan boleh (AC FR-03-01)', async () => {
    const { projectId } = await makeProject({ stages: { QA: { picIds: [dimas.picId as number], estStart: '', estEnd: '' } } });
    const qa = (await snapshot(projectId)).stages[2] as NonNullable<ProjectSnapshot['stages'][number]>;
    const denied = await updateStagePlanning(container.project, rina, { stageId: qa.id, expectedVersion: qa.version, picIds: [] });
    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');
    unwrap(await updateStagePlanning(container.project, dimas, { stageId: qa.id, expectedVersion: qa.version, picIds: [] }));
    expect((await snapshot(projectId)).stages[2]?.assignees).toEqual([]); // EC-03-01.03: boleh dikosongkan
  });

  it.skipIf(!isPg)('PIC yang menugaskan dirinya sendiri tidak memunculkan penanda baru; PIC lain yang menugaskan memunculkannya (BL-45)', async () => {
    const { projectId } = await makeProject();
    const ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    unwrap(await updateStagePlanning(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, picIds: [rina.picId as number] }));
    expect((await snapshot(projectId)).stages[0]?.assignees[0]?.seenAt).not.toBeNull();
    const next = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    unwrap(await updateStagePlanning(container.project, rina, { stageId: next.id, expectedVersion: next.version, picIds: [rina.picId as number, sari.picId as number] }));
    const assignees = (await snapshot(projectId)).stages[0]?.assignees ?? [];
    expect(assignees.find((a) => a.picId === sari.picId)?.seenAt).toBeNull();
    expect(assignees.find((a) => a.picId === rina.picId)?.seenAt).not.toBeNull();
  });

  it.skipIf(!isPg)('PIC tidak sesuai tahapan ditolak, estimasi yang sudah terisi tidak ditimpa langsung, versi lama ditolak', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [], estStart: '2026-10-19', estEnd: '2026-10-23' } } });
    const ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const mismatch = await updateStagePlanning(container.project, manager, { stageId: ba.id, expectedVersion: ba.version, picIds: [dimas.picId as number] });
    expect(!mismatch.ok && mismatch.error.message).toBe('PIC yang dipilih tidak sesuai dengan tahapan.');
    const overwrite = await updateStagePlanning(container.project, manager, { stageId: ba.id, expectedVersion: ba.version, estStart: '2026-11-02', estEnd: '2026-11-06' });
    expect(!overwrite.ok && overwrite.error.code).toBe('BUSINESS_RULE');
    const stale = await updateStagePlanning(container.project, manager, { stageId: ba.id, expectedVersion: ba.version - 1, picIds: [rina.picId as number] });
    expect(!stale.ok && stale.error.code).toBe('CONFLICT');
  });
});

describe('status tahapan (FR-05-01, FR-13-02)', () => {
  it.skipIf(!isPg)('Berjalan pertama kali mengisi mulai aktual hari itu; PIC lain dan PIC Development tidak berhak (FR-06-01)', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' }, DEV: { picIds: [devPicId], estStart: '', estEnd: '' } } });
    const [ba, dev] = (await snapshot(projectId)).stages as [NonNullable<ProjectSnapshot['stages'][number]>, NonNullable<ProjectSnapshot['stages'][number]>, unknown];
    const denied = await updateStageStatus(container.project, sari, { stageId: ba.id, expectedVersion: ba.version, target: 'RUNNING' });
    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');
    const devDenied = await updateStageStatus(container.project, rina, { stageId: dev.id, expectedVersion: dev.version, target: 'RUNNING' });
    expect(!devDenied.ok && devDenied.error.code).toBe('FORBIDDEN');
    unwrap(await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'RUNNING' }));
    expect((await snapshot(projectId)).stages[0]).toMatchObject({ status: 'RUNNING', actualStart: clockState.today });
    unwrap(await updateStageStatus(container.project, manager, { stageId: dev.id, expectedVersion: dev.version, target: 'RUNNING' }));
  });

  it.skipIf(!isPg)('Ditahan wajib alasan; dilanjutkan menutup riwayat hold dengan pelaku dan menyarankan revisi', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    let ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const noReason = await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'HELD', reason: '  ' });
    expect(!noReason.ok && noReason.error.message).toBe('Isi alasan ditahan.');
    unwrap(await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'HELD', reason: 'Menunggu data bisnis' }));
    ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    expect(ba).toMatchObject({ status: 'HELD', holdSince: clockState.today, holdReason: 'Menunggu data bisnis' });

    clockState.today = '2026-11-02';
    const resumed = unwrap(await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'RUNNING' }));
    clockState.today = '2026-10-28';
    expect(resumed.suggestRevision).toBe(true);
    const after = (await snapshot(projectId)).stages[0];
    expect(after?.holdHistory).toEqual([{ since: '2026-10-28', resumedOn: '2026-11-02', reason: 'Menunggu data bisnis' }]);
    const held = await container.prisma.stage_hold_history.findFirstOrThrow({ where: { stage_id: BigInt(ba.id) } });
    expect(Number(held.held_by)).toBe(rina.userId);
    expect(Number(held.resumed_by)).toBe(rina.userId);
  });

  it.skipIf(!isPg)('PIC memilih Selesai saat ada kartu terbuka milik rekan ditolak dengan menyebut rekan itu; Manager dengan catatan boleh (AC FR-05-01)', async () => {
    const { projectId, code } = await makeProject({ stages: { BA: { picIds: [rina.picId as number, sari.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    await insertCard(sari.picId as number, projectId, 'BA', { column: 'IN_PROGRESS', progress: 50 });
    const ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const rejected = await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'DONE' });
    expect(!rejected.ok && rejected.error.message).toBe('Tahapan belum dapat diselesaikan. Masih ada kartu terbuka milik Sari.');
    const noNote = await updateStageStatus(container.project, manager, { stageId: ba.id, expectedVersion: ba.version, target: 'DONE', note: 'x' });
    expect(!noNote.ok && noNote.error.code).toBe('VALIDATION');
    unwrap(await updateStageStatus(container.project, manager, { stageId: ba.id, expectedVersion: ba.version, target: 'DONE', note: 'Sisa kartu dibatalkan pemilik' }));
    expect((await snapshot(projectId)).stages[0]).toMatchObject({ status: 'DONE', actualEnd: clockState.today, manualProgress: null });
    const audit = unwrap(await listAuditEvents(container.auditRepository, manager, { page: 1, pageSize: 50 }));
    const event = audit.rows.find((row) => row.action === 'stage.status_changed' && row.projectCode === code);
    expect(event?.changes.some((c) => c.field === 'Catatan melewati syarat Selesai')).toBe(true);
  });

  it.skipIf(!isPg)('membuka kembali tahapan Selesai: PIC ditolak, Manager dengan catatan berhasil, tanggal selesai aktual dikosongkan (AC FR-05-01)', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    let ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    unwrap(await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'DONE' }));
    ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    expect(ba).toMatchObject({ status: 'DONE', actualStart: '2026-10-19', actualEnd: clockState.today });
    const picTry = await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'RUNNING', note: 'ada bug' });
    expect(!picTry.ok && picTry.error.code).toBe('FORBIDDEN');
    unwrap(await updateStageStatus(container.project, manager, { stageId: ba.id, expectedVersion: ba.version, target: 'RUNNING', note: 'Ada bug ditemukan' }));
    expect((await snapshot(projectId)).stages[0]).toMatchObject({ status: 'RUNNING', actualEnd: null, actualStart: '2026-10-19' });
  });

  it.skipIf(!isPg)('dua pengguna menyimpan bersamaan: satu berhasil, satu ditolak dengan pesan data telah berubah (NFR-10, EC-05-01.07)', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number, sari.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    const ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const [one, two] = await Promise.all([
      updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'RUNNING' }),
      updateStageStatus(container.project, sari, { stageId: ba.id, expectedVersion: ba.version, target: 'HELD', reason: 'Menunggu' }),
    ]);
    expect([one.ok, two.ok].filter(Boolean)).toHaveLength(1);
    const loser = one.ok ? two : one;
    expect(!loser.ok && loser.error.code).toBe('CONFLICT');
  });
});

describe('progres manual (FR-05-02)', () => {
  it.skipIf(!isPg)('tahapan tanpa kartu diisi langsung tanpa catatan; angka di luar 0..99 ditolak', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    const ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const range = await setManualProgress(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, value: 100 });
    expect(!range.ok && range.error.fields?.value).toBeDefined();
    unwrap(await setManualProgress(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, value: 30 }));
    expect((await snapshot(projectId)).stages[0]).toMatchObject({ manualProgress: 30 });
  });

  it.skipIf(!isPg)('tahapan berkartu: angka berbeda tanpa catatan ditolak, dengan catatan tersimpan, dapat dikembalikan ke hitungan sistem', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    await insertCard(rina.picId as number, projectId, 'BA', { column: 'DONE' });
    await insertCard(rina.picId as number, projectId, 'BA', { column: 'PLANNED', start: '2026-10-26', end: '2026-10-30' });
    let ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const noNote = await setManualProgress(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, value: 30 });
    expect(!noNote.ok && noNote.error.fields?.note).toBeDefined();
    unwrap(await setManualProgress(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, value: 30, note: 'Kartu belum diperbarui semua' }));
    ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    expect(ba).toMatchObject({ manualProgress: 30, manualProgressNote: 'Kartu belum diperbarui semua', manualProgressByLabel: 'Rina' });
    unwrap(await setManualProgress(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, value: null }));
    expect((await snapshot(projectId)).stages[0]).toMatchObject({ manualProgress: null, manualProgressNote: null, manualProgressBy: null });
  });

  it.skipIf(!isPg)('perubahan status tidak menghapus catatan penyesuaian manual yang berlaku', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    let ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    unwrap(await setManualProgress(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, value: 40 }));
    ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    unwrap(await updateStageStatus(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, target: 'RUNNING' }));
    expect((await snapshot(projectId)).stages[0]).toMatchObject({ manualProgress: 40, manualProgressByLabel: 'Rina' });
  });
});

describe('revisi estimasi (FR-13-01, FR-13-04)', () => {
  it.skipIf(!isPg)('revisi bernomor menyimpan estimasi sebelum dan sesudah, tidak mengubah estimasi awal, dan wajib kategori dan catatan (AC FR-13-01)', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-23' } } });
    let ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const base = { stageId: ba.id, newStart: '2026-10-19', newEnd: '2026-10-30' };
    const noCategory = await reviseStageEstimate(container.project, rina, { ...base, expectedVersion: ba.version, categoryId: null, note: 'Scope bertambah' });
    expect(!noCategory.ok && noCategory.error.fields?.category).toBeDefined();
    const blankNote = await reviseStageEstimate(container.project, rina, { ...base, expectedVersion: ba.version, categoryId: revisionCategoryId, note: '   ' });
    expect(!blankNote.ok && blankNote.error.fields?.note).toBeDefined();
    const same = await reviseStageEstimate(container.project, rina, { stageId: ba.id, newStart: '2026-10-19', newEnd: '2026-10-23', expectedVersion: ba.version, categoryId: revisionCategoryId, note: 'sama' });
    expect(!same.ok && same.error.fields?.dates).toBe('Estimasi baru sama dengan estimasi saat ini.');

    const first = unwrap(await reviseStageEstimate(container.project, rina, { ...base, expectedVersion: ba.version, categoryId: revisionCategoryId, note: 'Scope bertambah' }));
    expect(first.seq).toBe(1);
    ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    expect(ba.estimate).toEqual({ start: '2026-10-19', end: '2026-10-30' });
    expect(ba.baseline).toEqual({ start: '2026-10-19', end: '2026-10-23' });
    expect(ba.revisionCount).toBe(1);
    const revisions = await container.project.projects.listRevisions(ba.id);
    expect(revisions[0]).toMatchObject({ seq: 1, categoryName: 'Perubahan scope', previous: { end: '2026-10-23' }, next: { end: '2026-10-30' }, createdByLabel: 'Rina' });
  });

  it.skipIf(!isPg)('revisi ke-3 pada batas 3 memberi pemberitahuan dan tercatat; revisi ke-4 tetap dapat disimpan (AC FR-13-04)', async () => {
    const { projectId, code } = await makeProject({ stages: { QA: { picIds: [dimas.picId as number], estStart: '2026-11-02', estEnd: '2026-11-06' } } });
    const ends = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
    const warnings: boolean[] = [];
    for (const end of ends) {
      const qa = (await snapshot(projectId)).stages[2] as NonNullable<ProjectSnapshot['stages'][number]>;
      const result = unwrap(await reviseStageEstimate(container.project, dimas, { stageId: qa.id, expectedVersion: qa.version, newStart: '2026-11-02', newEnd: end, categoryId: revisionCategoryId, note: 'Perpanjang lagi' }));
      warnings.push(result.warning.justReached);
    }
    expect(warnings).toEqual([false, false, true, true]);
    const audit = unwrap(await listAuditEvents(container.auditRepository, manager, { page: 1, pageSize: 100 }));
    expect(audit.rows.some((row) => row.action === 'stage.revision_limit_reached' && row.projectCode === code)).toBe(true);
  });

  it.skipIf(!isPg)('PIC yang bukan PIC tahapan tidak dapat merevisi; tahapan tanpa estimasi diisi sebagai estimasi awal (EC-13-01.04)', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '', estEnd: '' } } });
    const ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const denied = await reviseStageEstimate(container.project, sari, { stageId: ba.id, expectedVersion: ba.version, newStart: '2026-10-19', newEnd: '2026-10-23', categoryId: revisionCategoryId, note: 'Isi awal' });
    expect(!denied.ok && denied.error.code).toBe('FORBIDDEN');
    const filled = unwrap(await reviseStageEstimate(container.project, rina, { stageId: ba.id, expectedVersion: ba.version, newStart: '2026-10-19', newEnd: '2026-10-23', categoryId: revisionCategoryId, note: 'Isi awal' }));
    expect(filled.seq).toBe(0);
    expect((await snapshot(projectId)).stages[0]).toMatchObject({ baseline: { end: '2026-10-23' }, revisionCount: 0 });
  });
});

describe('informasi dan status project (FR-11-02, FR-14-01)', () => {
  it.skipIf(!isPg)('PIC BA/QA dapat mengubah informasi; perubahan tercatat dengan nilai lama dan baru; tanpa perubahan ditolak (EC-11-02.03)', async () => {
    const { projectId, code } = await makeProject({ info: { name: 'Nama Lama', department: 'Klaim' }, status: 'BACKLOG' });
    const before = await snapshot(projectId);
    const input = { projectId, expectedVersion: before.version, info: { name: 'Nama Baru', department: 'Klaim' }, status: 'BACKLOG', statusReason: '' };
    unwrap(await updateProjectInfo(container.project, rina, input));
    const noChange = await updateProjectInfo(container.project, rina, { ...input, expectedVersion: before.version + 1, info: { name: 'Nama Baru', department: 'Klaim' } });
    expect(!noChange.ok && noChange.error.message).toBe('Tidak ada perubahan untuk disimpan.');
    const audit = unwrap(await listAuditEvents(container.auditRepository, manager, { page: 1, pageSize: 100 }));
    const event = audit.rows.find((row) => row.action === 'project.info_updated' && row.projectCode === code);
    expect(event?.changes).toEqual([{ field: 'Nama project', old: 'Nama Lama', new: 'Nama Baru' }]);
  });

  it.skipIf(!isPg)('status Selesai ditolak menyebut tahapan yang belum Selesai; Ditunda wajib alasan dan alasan dikosongkan saat Berjalan (AC FR-14-01)', async () => {
    const { projectId } = await makeProject({ status: 'RUNNING' });
    let project = await snapshot(projectId);
    const done = await updateProjectInfo(container.project, manager, { projectId, expectedVersion: project.version, info: { name: 'Portal Klaim Online' }, status: 'COMPLETED', statusReason: '' });
    expect(!done.ok && done.error.fields?.status).toMatch(/BA, Development, QA/);
    const noReason = await updateProjectInfo(container.project, manager, { projectId, expectedVersion: project.version, info: { name: 'Portal Klaim Online' }, status: 'DEFERRED', statusReason: '' });
    expect(!noReason.ok && noReason.error.fields?.statusReason).toBe('Isi alasan untuk status Ditunda.');
    unwrap(await updateProjectInfo(container.project, manager, { projectId, expectedVersion: project.version, info: { name: 'Portal Klaim Online' }, status: 'DEFERRED', statusReason: 'Menunggu anggaran' }));
    project = await snapshot(projectId);
    expect(project).toMatchObject({ status: 'DEFERRED', statusReason: 'Menunggu anggaran' });
    unwrap(await updateProjectInfo(container.project, manager, { projectId, expectedVersion: project.version, info: { name: 'Portal Klaim Online' }, status: 'RUNNING', statusReason: '' }));
    expect(await snapshot(projectId)).toMatchObject({ status: 'RUNNING', statusReason: null });
  });

  it.skipIf(!isPg)('aplikasi nonaktif yang sudah dipakai tetap terpilih; aplikasi nonaktif baru ditolak (EC-11-02.04)', async () => {
    const app = await container.prisma.affected_application.create({ data: { name: 'App Lama Uji' } });
    const appId = Number(app.id);
    const { projectId } = await makeProject({ info: { name: 'Proyek Aplikasi', applicationIds: [appId] }, status: 'BACKLOG' });
    await container.prisma.affected_application.update({ where: { id: app.id }, data: { is_active: false } });
    const project = await snapshot(projectId);
    unwrap(await updateProjectInfo(container.project, manager, { projectId, expectedVersion: project.version, info: { name: 'Proyek Aplikasi Baru', applicationIds: [appId] }, status: 'BACKLOG', statusReason: '' }));
    const other = await container.prisma.affected_application.create({ data: { name: 'App Mati Uji', is_active: false } });
    const next = await snapshot(projectId);
    const rejected = await updateProjectInfo(container.project, manager, { projectId, expectedVersion: next.version, info: { name: 'Proyek Aplikasi Baru', applicationIds: [appId, Number(other.id)] }, status: 'BACKLOG', statusReason: '' });
    expect(!rejected.ok && rejected.error.fields?.applicationIds).toBeDefined();
  });
});

describe('Perbarui tahapan gabungan (Screen [016])', () => {
  it.skipIf(!isPg)('menyimpan PIC, revisi, progres, dan status sekaligus dalam satu transaksi', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-23' } } });
    const ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const result = unwrap(
      await updateStage(container.project, rina, {
        stageId: ba.id,
        expectedVersion: ba.version,
        planning: { picIds: [rina.picId as number, sari.picId as number] },
        revision: { newStart: '2026-10-19', newEnd: '2026-10-30', categoryId: revisionCategoryId, note: 'Scope bertambah' },
        progress: { value: 40, note: '' },
        status: { target: 'RUNNING', reason: '', note: '' },
      }),
    );
    expect(result.saved).toEqual(['planning', 'revision', 'progress', 'status']);
    expect(result.revisionSeq).toBe(1);
    const after = (await snapshot(projectId)).stages[0];
    expect(after).toMatchObject({ status: 'RUNNING', manualProgress: 40, estimate: { end: '2026-10-30' }, revisionCount: 1 });
    expect(after?.assignees.map((a) => a.picId).sort()).toEqual([rina.picId, sari.picId].sort());
  });

  it.skipIf(!isPg)('atomik: bila satu bagian ditolak, bagian lain yang sudah diproses dibatalkan', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number, sari.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    await insertCard(sari.picId as number, projectId, 'BA', { column: 'IN_PROGRESS', progress: 25 });
    const before = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const rejected = await updateStage(container.project, rina, {
      stageId: before.id,
      expectedVersion: before.version,
      revision: { newStart: '2026-10-19', newEnd: '2026-11-06', categoryId: revisionCategoryId, note: 'Perpanjang' },
      progress: { value: 40, note: 'Kartu belum diperbarui' },
      status: { target: 'DONE', reason: '', note: '' },
    });
    expect(!rejected.ok && rejected.error.rule).toBe('STAGE_HAS_OPEN_CARDS');
    const after = (await snapshot(projectId)).stages[0];
    expect(after).toMatchObject({ status: 'NOT_STARTED', manualProgress: null, revisionCount: 0, version: before.version });
    expect(after?.estimate).toEqual({ start: '2026-10-19', end: '2026-10-30' });
  });

  it.skipIf(!isPg)('tanpa bagian yang diisi ditolak, versi lama ditolak, dan hak tetap dicek per bagian', async () => {
    const { projectId } = await makeProject({ stages: { BA: { picIds: [rina.picId as number], estStart: '2026-10-19', estEnd: '2026-10-30' } } });
    const ba = (await snapshot(projectId)).stages[0] as NonNullable<ProjectSnapshot['stages'][number]>;
    const empty = await updateStage(container.project, rina, { stageId: ba.id, expectedVersion: ba.version });
    expect(!empty.ok && empty.error.message).toBe('Tidak ada perubahan untuk disimpan.');
    const stale = await updateStage(container.project, rina, { stageId: ba.id, expectedVersion: ba.version - 1, progress: { value: 10, note: '' } });
    expect(!stale.ok && stale.error.code).toBe('CONFLICT');
    const forbidden = await updateStage(container.project, sari, { stageId: ba.id, expectedVersion: ba.version, status: { target: 'RUNNING', reason: '', note: '' } });
    expect(!forbidden.ok && forbidden.error.code).toBe('FORBIDDEN');
    expect((await snapshot(projectId)).stages[0]?.version).toBe(ba.version);
  });
});
