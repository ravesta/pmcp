/**
 * Uji arsitektur: arah dependensi antar lapisan dan modul, serta larangan jam sistem di luar `Clock`.
 * Aturan mengikuti Technical Design §5.1 dan TD-05, TD-06. Berjalan di CI agar pelanggaran gagal bangun.
 */
import { dirname, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listSourceFiles, readSource, srcRelative, stripComments } from './_support/sources';

/** Satu impor dalam berkas: path yang sudah dinormalisasi relatif terhadap `src/`, atau paket luar. */
interface ImportRef {
  readonly raw: string;
  readonly target: string;
  readonly external: boolean;
}

/**
 * Mengambil semua spesifikasi impor dari sebuah berkas dan menormalisasinya.
 * Masukan: path relatif berkas terhadap `src/` dan isi berkas tanpa komentar.
 * Keluaran: daftar impor (alias `@/` dan impor relatif dijadikan path relatif `src/`).
 * Efek samping: tidak ada.
 * Rujukan: TD-06.
 */
function readImports(relPath: string, code: string): ImportRef[] {
  const refs: ImportRef[] = [];
  const pattern = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
  for (const match of code.matchAll(pattern)) {
    const raw = match[1] as string;
    if (raw.startsWith('@/')) refs.push({ raw, target: raw.slice(2), external: false });
    else if (raw.startsWith('.')) refs.push({ raw, target: posix.normalize(posix.join(dirname(relPath), raw)), external: false });
    else refs.push({ raw, target: raw, external: true });
  }
  return refs;
}

const files = listSourceFiles().map((absolute) => ({
  rel: srcRelative(absolute),
  code: stripComments(readSource(absolute)),
}));

describe('dependensi satu arah (Technical Design §5.1)', () => {
  it('shared tidak bergantung pada apa pun selain shared (bebas kerangka kerja)', () => {
    for (const file of files.filter((f) => f.rel.startsWith('shared/'))) {
      for (const ref of readImports(file.rel, file.code)) {
        const allowed = !ref.external && ref.target.startsWith('shared/');
        expect(allowed, `${file.rel} mengimpor ${ref.raw}`).toBe(true);
      }
    }
  });

  it('domain murni: hanya impor domain modul sendiri dan shared', () => {
    for (const file of files.filter((f) => /^modules\/[^/]+\/domain\//.test(f.rel))) {
      const moduleName = file.rel.split('/')[1];
      for (const ref of readImports(file.rel, file.code)) {
        const allowed =
          !ref.external &&
          (ref.target.startsWith('shared/') || ref.target.startsWith(`modules/${moduleName}/domain/`));
        expect(allowed, `${file.rel} mengimpor ${ref.raw}`).toBe(true);
      }
    }
  });

  it('application tidak mengimpor infrastructure sendiri maupun bagian dalam modul lain', () => {
    for (const file of files.filter((f) => /^modules\/[^/]+\/application\//.test(f.rel))) {
      const moduleName = file.rel.split('/')[1];
      for (const ref of readImports(file.rel, file.code)) {
        if (ref.external) continue;
        const ownInfra = ref.target.startsWith(`modules/${moduleName}/infrastructure`);
        const otherModuleInternals =
          /^modules\/([^/]+)\/.+/.test(ref.target) && !ref.target.startsWith(`modules/${moduleName}/`);
        expect(ownInfra, `${file.rel} mengimpor infrastructure: ${ref.raw}`).toBe(false);
        expect(otherModuleInternals, `${file.rel} mengimpor bagian dalam modul lain: ${ref.raw}`).toBe(false);
      }
    }
  });

  it('UI dan halaman hanya memakai API publik modul (index), tidak repository atau domain dalam', () => {
    for (const file of files.filter((f) => f.rel.startsWith('app/') || f.rel.startsWith('ui/'))) {
      for (const ref of readImports(file.rel, file.code)) {
        if (ref.external) continue;
        // `modules/<m>/client` adalah pintu masuk aman-klien yang sah (tanpa kode server)
        const deepModuleImport = /^modules\/[^/]+\/.+/.test(ref.target) && !/^modules\/[^/]+\/client$/.test(ref.target);
        expect(deepModuleImport, `${file.rel} mengimpor bagian dalam modul: ${ref.raw}`).toBe(false);
      }
    }
  });

  it('platform tidak mengimpor modul kecuali container (titik komposisi)', () => {
    for (const file of files.filter((f) => f.rel.startsWith('platform/') && f.rel !== 'platform/container.ts')) {
      for (const ref of readImports(file.rel, file.code)) {
        expect(!ref.external && ref.target.startsWith('modules/'), `${file.rel} mengimpor modul: ${ref.raw}`).toBe(false);
      }
    }
  });
});

describe('jam sistem hanya lewat Clock (TD-05)', () => {
  it('tidak ada Date.now() atau new Date() tanpa argumen di luar shared/clock.ts', () => {
    for (const file of files.filter((f) => f.rel !== 'shared/clock.ts')) {
      expect(/\bDate\.now\s*\(/.test(file.code), `${file.rel} memakai Date.now()`).toBe(false);
      expect(/new\s+Date\s*\(\s*\)/.test(file.code), `${file.rel} memakai new Date() tanpa argumen`).toBe(false);
    }
  });
});
