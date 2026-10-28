/**
 * Klien database dan transactor PMCP (Prisma + adapter PostgreSQL).
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import type { Transactor, TxContext } from '@/shared/transaction';

/** Batas waktu transaksi interaktif (milidetik); transaksi PMCP pendek (database-design §9). */
const TRANSACTION_TIMEOUT_MS = 15_000;

/**
 * Membuat klien Prisma ke PostgreSQL. Satu instansi per proses (kumpulan koneksi kecil, Technology Baseline §6).
 * Masukan: URL koneksi. Keluaran: `PrismaClient`.
 * Efek samping: membuka kumpulan koneksi ke database secara malas saat kueri pertama.
 * Rujukan: Technical Design §13 butir 6, TD-16.
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}

/**
 * Membuat `Transactor` di atas klien Prisma: satu use case mutasi = satu transaksi.
 * Masukan: klien Prisma. Keluaran: `Transactor`.
 * Efek samping: `run` membuka transaksi, meng-commit bila selesai, dan membatalkan seluruhnya bila ada galat.
 * Rujukan: database-design §9, Technical Design §6.1.
 */
export function createTransactor(prisma: PrismaClient): Transactor {
  return {
    run: (work) =>
      prisma.$transaction((tx) => work(tx as unknown as TxContext), { timeout: TRANSACTION_TIMEOUT_MS }),
  };
}
