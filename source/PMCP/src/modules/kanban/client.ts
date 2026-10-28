/**
 * Pintu masuk modul kanban yang aman untuk komponen klien: hanya konstanta dan tipe tanpa kode server (repository,
 * Prisma, atau use case). Komponen klien mengimpor nilai dari sini, bukan dari `index.ts` (Technical Design §5.1).
 */
export { CARD_PROGRESS_CHOICES, COLUMN_LABEL } from './domain/card-types';
export type { CardColumn, CardKind } from './domain/card-types';
