/**
 * Pembantu bersama Server Action: membaca FormData dengan aman dan mengubah hasil use case menjadi `ActionState`.
 *
 * Seluruh masukan formulir tidak tepercaya (Security Design §7): nilai dibaca sebagai teks atau bilangan dan
 * divalidasi ulang oleh use case di server.
 */
import { nextStamp, type ActionState } from '@/ui/action-state';

/** Bentuk hasil use case yang dikenali, berhasil atau gagal dengan rincian galat. */
export type UseCaseResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly error: {
        readonly message: string;
        readonly fields?: Readonly<Record<string, string>>;
        readonly details?: unknown;
        readonly rule?: string;
      };
    };

/**
 * Membaca satu isian teks dari FormData.
 * Masukan: FormData dan nama isian. Keluaran: teks (kosong bila tidak ada atau bukan teks).
 * Efek samping: tidak ada.
 * Rujukan: Security Design §7.
 */
export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

/**
 * Membaca satu isian bilangan bulat dari FormData.
 * Masukan: FormData dan nama isian. Keluaran: bilangan bulat, atau null bila kosong atau bukan bilangan bulat.
 * Efek samping: tidak ada.
 * Rujukan: Security Design §7.
 */
export function formInteger(formData: FormData, name: string): number | null {
  const raw = formText(formData, name).trim();
  if (raw === '' || !/^-?\d+$/.test(raw)) return null;
  return Number(raw);
}

/**
 * Membaca isian berulang (pilihan ganda) sebagai daftar bilangan bulat, membuang nilai yang bukan bilangan bulat.
 * Masukan: FormData dan nama isian. Keluaran: daftar bilangan bulat tanpa duplikat.
 * Efek samping: tidak ada.
 * Rujukan: Security Design §7, FR-02-02 (PIC lebih dari satu).
 */
export function formIntegers(formData: FormData, name: string): number[] {
  const values = formData
    .getAll(name)
    .filter((value): value is string => typeof value === 'string' && /^\d+$/.test(value))
    .map(Number);
  return [...new Set(values)];
}

/**
 * Membangun state aksi dari hasil use case.
 * Masukan: hasil use case, pesan sukses, dan data opsional. Keluaran: `ActionState`.
 * Efek samping: tidak ada (selain menaikkan penanda hasil).
 * Rujukan: Technical Design §8 (bentuk hasil aksi).
 */
export function toActionState(result: UseCaseResult, success: string, data?: unknown): ActionState {
  if (result.ok) return { ok: true, message: success, data, stamp: nextStamp() };
  return { ok: false, message: result.error.message, fields: result.error.fields, data: result.error.details ?? data, stamp: nextStamp() };
}
