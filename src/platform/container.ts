/**
 * Container (titik komposisi) PMCP: satu-satunya tempat yang merakit modul, repository, dan layanan.
 *
 * Hanya berkas ini yang boleh mengimpor beberapa modul sekaligus dan mengetahui implementasi
 * infrastructure (Technical Design §5.1 butir 3, uji arsitektur).
 */
import type { PrismaClient } from '@/generated/prisma/client';
import {
  createArgon2Hasher,
  createPrismaAuthRepository,
  createTokenService,
  cryptoRandomIndex,
  type AuthDeps,
} from '@/modules/auth';
import {
  createPrismaAuditRepository,
  recordAudit,
  type AuditRepository,
} from '@/modules/audit';
import { createPrismaMasterRepository, createPrismaPicRepository, type MasterDeps } from '@/modules/master';
import {
  createPrismaCardSource,
  createPrismaProjectQueries,
  createPrismaProjectRepository,
  createPrismaReference,
  type ProjectDeps,
} from '@/modules/project';
import type { AuditWriter } from '@/shared/audit';
import type { Clock } from '@/shared/clock';
import { createClockFor } from './clock-provider';
import { loadConfig, type AppConfig } from './config';
import { createPrismaClient, createTransactor } from './db';

/** Seluruh ketergantungan siap pakai untuk lapisan UI dan use case. */
export interface Container {
  readonly config: AppConfig;
  readonly clock: Clock;
  readonly prisma: PrismaClient;
  readonly auditRepository: AuditRepository;
  readonly auth: AuthDeps;
  readonly master: MasterDeps;
  readonly project: ProjectDeps;
}

/**
 * Merakit container dari klien database, jam, dan konfigurasi yang diberikan.
 * Masukan: klien Prisma, jam, konfigurasi. Keluaran: `Container`.
 * Efek samping: tidak ada selain membuat objek (tidak membuka koneksi).
 * Rujukan: Technical Design §5.1 dan §6; dipakai produksi dan uji integrasi dengan database uji.
 */
export function buildContainer(prisma: PrismaClient, clock: Clock, config: AppConfig): Container {
  const transactor = createTransactor(prisma);
  const auditRepository = createPrismaAuditRepository(prisma);
  const writeAudit: AuditWriter = (tx, event) => recordAudit(auditRepository, tx, event);
  const authRepository = createPrismaAuthRepository(prisma);
  const hasher = createArgon2Hasher();

  const auth: AuthDeps = {
    clock,
    repository: authRepository,
    hasher,
    tokens: createTokenService(),
    transactor,
    writeAudit,
    sessionIdleMinutes: config.sessionIdleMinutes,
    sessionAbsoluteMinutes: config.sessionAbsoluteMinutes,
  };

  const master: MasterDeps = {
    clock,
    transactor,
    masters: createPrismaMasterRepository(prisma),
    pics: createPrismaPicRepository(prisma),
    auth: authRepository,
    hasher,
    randomIndex: cryptoRandomIndex,
    writeAudit,
  };

  const project: ProjectDeps = {
    clock,
    transactor,
    projects: createPrismaProjectRepository(prisma),
    queries: createPrismaProjectQueries(prisma),
    reference: createPrismaReference(prisma),
    // sementara membaca tabel kartu langsung; modul kanban (irisan 3) menggantikan adapter ini
    cards: createPrismaCardSource(prisma),
    writeAudit,
  };

  return { config, clock, prisma, auditRepository, auth, master, project };
}

/** Kunci global agar satu container dipakai ulang saat hot reload pengembangan (hindari habis koneksi). */
const GLOBAL_KEY = '__pmcp_container__';

/**
 * Mengambil container aplikasi (dibuat sekali per proses dari variabel lingkungan).
 * Masukan: tidak ada. Keluaran: `Container` aplikasi.
 * Efek samping: pada pemanggilan pertama membaca konfigurasi dan membuat klien database; melempar galat bila
 * `DATABASE_URL` tidak diatur.
 * Rujukan: Technical Design §15, Technology Baseline §6.
 */
export function getContainer(): Container {
  const holder = globalThis as unknown as Record<string, Container | undefined>;
  const existing = holder[GLOBAL_KEY];
  if (existing) return existing;
  const config = loadConfig();
  if (!config.databaseUrl) throw new Error('DATABASE_URL tidak diatur.');
  const container = buildContainer(createPrismaClient(config.databaseUrl), createClockFor(config), config);
  holder[GLOBAL_KEY] = container;
  return container;
}
