/**
 * Uji konvensi kode: setiap fungsi tingkat atas diberi komentar dokumentasi yang memuat "Efek samping:".
 * Menegakkan keputusan pemilik CD-160 dan NFR-09 (Technical Design Lampiran B) secara otomatis.
 */
import { describe, expect, it } from 'vitest';
import { listSourceFiles, readSource, srcRelative } from './_support/sources';

/** Pola baris deklarasi fungsi tingkat atas (fungsi biasa, async, default, dan panah ber-const). */
const FUNCTION_DECLARATION =
  /^(export\s+)?(default\s+)?(async\s+)?function\b|^(export\s+)?const\s+\w+(\s*:[^=]+)?\s*=\s*(async\s*)?(\([^)]*\)|\w+)\s*(:[^=]+)?=>/;

/**
 * Mencari fungsi tingkat atas yang tidak diberi komentar dokumentasi lengkap.
 * Masukan: isi berkas. Keluaran: daftar nomor baris (1-based) fungsi yang melanggar konvensi.
 * Efek samping: tidak ada.
 * Rujukan: CD-160, NFR-09, Technical Design Lampiran B butir 1.
 */
function findUndocumentedFunctions(source: string): number[] {
  const lines = source.split('\n');
  const violations: number[] = [];
  lines.forEach((line, index) => {
    if (!FUNCTION_DECLARATION.test(line)) return;
    let cursor = index - 1;
    while (cursor >= 0 && (lines[cursor] ?? '').trim() === '') cursor -= 1;
    const closing = (lines[cursor] ?? '').trim();
    if (!closing.endsWith('*/')) {
      violations.push(index + 1);
      return;
    }
    let start = cursor;
    while (start >= 0 && !(lines[start] ?? '').includes('/**')) start -= 1;
    const doc = lines.slice(Math.max(start, 0), cursor + 1).join('\n');
    if (!doc.includes('Efek samping:')) violations.push(index + 1);
  });
  return violations;
}

describe('komentar fungsi (CD-160)', () => {
  it('setiap fungsi tingkat atas di src/ memiliki komentar dengan "Efek samping:"', () => {
    for (const absolute of listSourceFiles()) {
      const violations = findUndocumentedFunctions(readSource(absolute));
      expect(violations, `${srcRelative(absolute)}: fungsi tanpa komentar lengkap pada baris ${violations.join(', ')}`).toEqual([]);
    }
  });

  it('pemeriksa itu sendiri mendeteksi fungsi tanpa komentar', () => {
    const sample = ['export function tanpaKomentar() {}', '', '/** Tujuan saja. */', 'export function kurang() {}'].join('\n');
    expect(findUndocumentedFunctions(sample)).toEqual([1, 4]);
  });

  it('pemeriksa menerima fungsi yang lengkap', () => {
    const sample = ['/**', ' * Tujuan.', ' * Efek samping: tidak ada.', ' */', 'export function lengkap() {}'].join('\n');
    expect(findUndocumentedFunctions(sample)).toEqual([]);
  });
});
