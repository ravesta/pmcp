/**
 * Dunia uji bersama untuk uji integrasi project: container, Manager, beberapa PIC, jam uji yang dapat diatur,
 * dan pembantu untuk membuat project dan kartu. Dipakai oleh uji sisi tulis dan sisi baca irisan 2.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Actor } from '@/modules/auth';
import { createPic } from '@/modules/master';
import { createProject, type CreateProjectInput, type ProjectSnapshot, type StageKind } from '@/modules/project';
import { buildContainer, type Container } from '@/platform/container';
import { loadConfig } from '@/platform/config';
import { createPrismaClient } from '@/platform/db';
import type { Clock } from '@/shared/clock';
import { toIsoDate } from '@/shared/iso-date';
import type { TestDb } from './database';

const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', 'prisma', 'migrations');

/** Keadaan jam uji yang dapat diubah oleh uji (tanggal bisnis dan waktu sekarang). */
export interface ClockState {
  today: string;
  now: Date;
}

/** Semua yang dibutuhkan uji project. */
export interface World {
  readonly container: Container;
  readonly clockState: ClockState;
  readonly manager: Actor;
  /** PIC BA, PIC BA lain, dan PIC QA yang memiliki akun login. */
  readonly rina: Actor;
  readonly sari: Actor;
  readonly dimas: Actor;
  /** Id dua PIC Development (tanpa akun login). */
  readonly devPicId: number;
  readonly devPicId2: number;
  /** Id kategori alasan revisi "Perubahan scope" dari data awal. */
  readonly revisionCategoryId: number;
}

/**
 * Mengambil nilai berhasil dari sebuah hasil, gagal uji bila hasilnya galat.
 * Masukan: hasil use case. Keluaran: data.
 * Efek samping: tidak ada.
 * Rujukan: Technical Design §8.
 */
export function unwrap<T>(result: { ok: true; data: T } | { ok: false; error: { code: string; message: string } }): T {
  if (!result.ok) throw new Error(`Hasil gagal tak terduga: ${result.error.code} ${result.error.message}`);
  return result.data;
}

/**
 * Menjalankan seluruh migrasi pada database uji lalu merakit container dengan jam uji.
 * Masukan: database uji PostgreSQL. Keluaran: `World` siap pakai.
 * Efek samping: membuat skema, akun Manager, empat PIC (tiga dengan akun), dan memuat data awal master.
 * Rujukan: Technical Design §14.
 */
export async function createWorld(testDb: TestDb): Promise<World> {
  if (!testDb.url) throw new Error('Database uji tidak punya URL (bukan PostgreSQL).');
  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const folder of folders) await testDb.exec(readFileSync(join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8'));

  const clockState: ClockState = { today: '2026-10-28', now: new Date('2026-10-28T05:00:00Z') };
  const clock: Clock = { today: () => toIsoDate(clockState.today), now: () => new Date(clockState.now.getTime()) };
  const container = buildContainer(createPrismaClient(testDb.url), clock, loadConfig({ NODE_ENV: 'test', DATABASE_URL: testDb.url }));

  const hash = await container.auth.hasher.hash('kopi-hitam-tanpa-gula');
  const user = await container.prisma.app_user.create({
    data: { username: 'manager', role: 'MANAGER', password_hash: hash, must_change_password: false },
  });
  const manager: Actor = { userId: Number(user.id), role: 'MANAGER', picId: null, picStage: null, label: 'Manager', mustChangePassword: false };

  const makePic = async (name: string, stage: StageKind, username?: string): Promise<{ actor: Actor | null; picId: number }> => {
    const created = unwrap(await createPic(container.master, manager, { name, stage, withLogin: stage !== 'DEV', username }));
    if (stage === 'DEV') return { actor: null, picId: created.picId };
    const account = await container.prisma.app_user.findFirstOrThrow({ where: { pic_id: BigInt(created.picId) } });
    return {
      actor: { userId: Number(account.id), role: 'PIC', picId: created.picId, picStage: stage, label: name, mustChangePassword: false },
      picId: created.picId,
    };
  };

  const rina = (await makePic('Rina', 'BA', 'rina.ba')).actor as Actor;
  const sari = (await makePic('Sari', 'BA', 'sari.ba')).actor as Actor;
  const dimas = (await makePic('Dimas', 'QA', 'dimas.qa')).actor as Actor;
  const devPicId = (await makePic('Budi', 'DEV')).picId;
  const devPicId2 = (await makePic('Wawan', 'DEV')).picId;
  const category = await container.prisma.revision_category.findFirstOrThrow({ where: { name: 'Perubahan scope' } });
  return { container, clockState, manager, rina, sari, dimas, devPicId, devPicId2, revisionCategoryId: Number(category.id) };
}

/**
 * Membuat project lewat use case dengan nilai bawaan yang dapat ditimpa.
 * Masukan: dunia uji dan bagian masukan yang ingin diganti. Keluaran: id project dan kode.
 * Efek samping: membuat project dan audit.
 * Rujukan: FR-02-01.
 */
export async function makeProject(world: World, over: Partial<CreateProjectInput> = {}): Promise<{ projectId: number; code: string }> {
  const result = unwrap(
    await createProject(world.container.project, world.manager, {
      info: { name: 'Portal Klaim Online' },
      status: 'RUNNING',
      statusReason: '',
      stages: {},
      ...over,
    }),
  );
  return { projectId: result.projectId, code: result.code };
}

/**
 * Membaca snapshot project dari database untuk asersi (tanpa mengunci).
 * Masukan: dunia uji dan id project. Keluaran: snapshot.
 * Efek samping: tidak ada (hanya baca).
 * Rujukan: FR-11-01.
 */
export async function snapshotOf(world: World, projectId: number): Promise<ProjectSnapshot> {
  const loaded = await world.container.project.queries.loadSnapshot(projectId);
  if (!loaded) throw new Error('Project tidak ditemukan');
  return loaded;
}

/** Pilihan kartu uji. */
export interface CardOptions {
  readonly column?: 'PLANNED' | 'IN_PROGRESS' | 'DONE';
  readonly progress?: number;
  readonly start?: string;
  readonly end?: string;
}

/**
 * Menyisipkan kartu project langsung ke tabel (use case kartu belum ada pada irisan 2).
 * Masukan: dunia uji, pemilik, project, tahapan, dan pilihan kartu. Keluaran: id kartu.
 * Efek samping: INSERT `card`.
 * Rujukan: FR-17-01, BL-40.
 */
export async function insertCard(world: World, picId: number, projectId: number, stage: 'BA' | 'QA', options: CardOptions = {}): Promise<number> {
  const start = new Date(`${options.start ?? '2026-10-26'}T00:00:00Z`);
  const end = new Date(`${options.end ?? '2026-10-30'}T00:00:00Z`);
  const column = options.column ?? 'PLANNED';
  const card = await world.container.prisma.card.create({
    data: {
      kind: 'PROJECT',
      owner_pic_id: BigInt(picId),
      project_id: BigInt(projectId),
      stage,
      title: 'Kartu uji rencana',
      board_column: column,
      progress: options.progress ?? 0,
      plan_start: start,
      plan_end: end,
      plan_baseline_start: start,
      plan_baseline_end: end,
      done_on: column === 'DONE' ? end : null,
    },
    select: { id: true },
  });
  return Number(card.id);
}
