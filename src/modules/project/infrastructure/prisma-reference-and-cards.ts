/**
 * Adapter Prisma untuk rujukan master (baca saja) bagi modul project.
 */
import type { PrismaClient } from '@/generated/prisma/client';
import type { ReferencePort } from '../application/ports';
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
