/**
 * Adapter Prisma untuk rujukan master (baca saja) dan sumber kartu bagi modul project.
 *
 * `createPrismaCardSource` membaca tabel `card` secara langsung dan bersifat sementara sampai modul kanban
 * (irisan 3) menyediakan adapter `CardSourcePort` miliknya sendiri, yang kemudian dirakit di container
 * menggantikan adapter ini (Technical Design §5.2).
 */
import type { PrismaClient } from '@/generated/prisma/client';
import { toIsoDate } from '@/shared/iso-date';
import { roundHalfUp } from '@/shared/rounding';
import type {
  CardSourcePort,
  PicCardSummary,
  ReferencePort,
  StageCardFacts,
} from '../application/ports';
import { cardWeight, type ProgressCard } from '../domain/stage-progress';
import type { StageKind } from '../domain/stage-types';

/** Kunci pengaturan batas peringatan revisi berulang (master, FR-08-03). */
const REVISION_THRESHOLD_KEY = 'revision_warn_threshold';

/**
 * Membuat adapter rujukan master di atas klien Prisma.
 * Masukan: klien Prisma. Keluaran: `ReferencePort`.
 * Efek samping: tidak ada pada pembuatan; metode yang dikembalikan hanya membaca tabel master.
 * Rujukan: FR-02-02, FR-08-02, FR-08-03, FR-13-01.
 */
export function createPrismaReference(prisma: PrismaClient): ReferencePort {
  return {
    /** Membaca PIC menurut id. Efek samping: tidak ada (hanya baca). */
    async getPics(ids) {
      if (ids.length === 0) return [];
      const rows = await prisma.pic.findMany({ where: { id: { in: ids.map(BigInt) } } });
      return rows.map((row) => ({ id: Number(row.id), name: row.name, stage: row.stage as StageKind, isActive: row.is_active }));
    },

    /** Membaca aplikasi terdampak menurut id. Efek samping: tidak ada (hanya baca). */
    async getApplications(ids) {
      if (ids.length === 0) return [];
      const rows = await prisma.affected_application.findMany({ where: { id: { in: ids.map(BigInt) } } });
      return rows.map((row) => ({ id: Number(row.id), name: row.name, isActive: row.is_active }));
    },

    /** Membaca satu kategori alasan revisi. Efek samping: tidak ada (hanya baca). */
    async getRevisionCategory(id) {
      const row = await prisma.revision_category.findUnique({ where: { id: BigInt(id) } });
      return row ? { id: Number(row.id), name: row.name, isActive: row.is_active } : null;
    },

    /** Membaca batas peringatan revisi; 3 bila baris pengaturan tidak ada. Efek samping: tidak ada (hanya baca). */
    async getRevisionWarnThreshold() {
      const row = await prisma.app_setting.findUnique({ where: { key: REVISION_THRESHOLD_KEY } });
      return row?.int_value ?? 3;
    },

    /** Aplikasi aktif terurut nama. Efek samping: tidak ada (hanya baca). */
    async listActiveApplications() {
      const rows = await prisma.affected_application.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
      return rows.map((row) => ({ id: Number(row.id), name: row.name, isActive: row.is_active }));
    },

    /** PIC aktif terurut nama. Efek samping: tidak ada (hanya baca). */
    async listActivePics() {
      const rows = await prisma.pic.findMany({ where: { is_active: true }, orderBy: { name: 'asc' } });
      return rows.map((row) => ({ id: Number(row.id), name: row.name, stage: row.stage as StageKind, isActive: row.is_active }));
    },

    /** Kategori alasan revisi aktif terurut id. Efek samping: tidak ada (hanya baca). */
    async listActiveRevisionCategories() {
      const rows = await prisma.revision_category.findMany({ where: { is_active: true }, orderBy: { id: 'asc' } });
      return rows.map((row) => ({ id: Number(row.id), name: row.name, isActive: row.is_active }));
    },
  };
}

/**
 * Menghitung progres gabungan sekumpulan kartu (berbobot hari kerja rencana) tanpa batas 99%.
 * Masukan: kartu. Keluaran: persen bulat 0..100.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 2 (rincian per PIC), BL-40(b).
 */
function combinedProgress(cards: ReadonlyArray<ProgressCard>): number {
  let weighted = 0;
  let total = 0;
  for (const card of cards) {
    const weight = cardWeight(card);
    weighted += card.progress * weight;
    total += weight;
  }
  return total === 0 ? 0 : roundHalfUp(weighted / total);
}

/**
 * Membuat sumber kartu di atas klien Prisma (kartu project yang tidak dibatalkan).
 * Masukan: klien Prisma. Keluaran: `CardSourcePort`.
 * Efek samping: tidak ada pada pembuatan; metode yang dikembalikan hanya membaca tabel `card`.
 * Rujukan: FR-05-01 butir 4, FR-05-02 butir 1 dan 2, BL-40.
 */
export function createPrismaCardSource(prisma: PrismaClient): CardSourcePort {
  return {
    /** Nama pemilik kartu terbuka (belum Done, tidak dibatalkan). Efek samping: tidak ada (hanya baca). */
    async openCardOwners(stage) {
      const rows = await prisma.card.findMany({
        where: {
          kind: 'PROJECT',
          project_id: BigInt(stage.projectId),
          stage: stage.kind,
          cancelled_at: null,
          board_column: { not: 'DONE' },
        },
        select: { pic: { select: { name: true } } },
      });
      return [...new Set(rows.map((row) => row.pic.name))].sort((a, b) => a.localeCompare(b));
    },

    /** Fakta kartu banyak tahapan dalam satu kueri. Efek samping: tidak ada (hanya baca). */
    async cardFacts(stages) {
      const result = new Map<number, StageCardFacts>();
      if (stages.length === 0) return result;
      const rows = await prisma.card.findMany({
        where: {
          kind: 'PROJECT',
          cancelled_at: null,
          OR: stages.map((stage) => ({ project_id: BigInt(stage.projectId), stage: stage.kind })),
        },
        select: {
          project_id: true,
          stage: true,
          owner_pic_id: true,
          board_column: true,
          progress: true,
          plan_start: true,
          plan_end: true,
          pic: { select: { name: true } },
        },
      });

      for (const stage of stages) {
        const own = rows.filter((row) => Number(row.project_id) === stage.projectId && row.stage === stage.kind);
        const cards: ProgressCard[] = own.map((row) => ({
          progress: row.board_column === 'DONE' ? 100 : row.progress,
          plannedStart: toIsoDate(row.plan_start.toISOString().slice(0, 10)),
          plannedEnd: toIsoDate(row.plan_end.toISOString().slice(0, 10)),
        }));
        const byPic = new Map<number, { name: string; cards: ProgressCard[] }>();
        own.forEach((row, index) => {
          const picId = Number(row.owner_pic_id);
          const entry = byPic.get(picId) ?? { name: row.pic.name, cards: [] };
          entry.cards.push(cards[index] as ProgressCard);
          byPic.set(picId, entry);
        });
        const perPic: PicCardSummary[] = [...byPic.entries()].map(([picId, entry]) => ({
          picId,
          name: entry.name,
          cardCount: entry.cards.length,
          progress: combinedProgress(entry.cards),
        }));
        result.set(stage.stageId, { cards, perPic, openCount: own.filter((row) => row.board_column !== 'DONE').length });
      }
      return result;
    },
  };
}
