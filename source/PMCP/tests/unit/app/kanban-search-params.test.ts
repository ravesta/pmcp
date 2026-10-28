import { describe, expect, it } from 'vitest';
import { kanbanHref, parseKanbanParams } from '../../../src/app/(app)/kanban/_lib/search-params';

describe('parameter alamat Kanban', () => {
  it('PIC melihat kartu miliknya secara bawaan; Manager melihat semua PIC', () => {
    expect(parseKanbanParams({}, 7)).toMatchObject({ picChoice: 'saya', board: { picId: 7, period: 'THIS_WEEK', kind: null, extendsOnly: false } });
    expect(parseKanbanParams({}, null)).toMatchObject({ picChoice: 'semua', board: { picId: null } });
  });

  it('pilihan "saya" tidak berlaku bagi Manager dan id PIC dibaca sebagai angka', () => {
    expect(parseKanbanParams({ pic: 'saya' }, null).picChoice).toBe('semua');
    expect(parseKanbanParams({ pic: '12' }, 7)).toMatchObject({ picChoice: '12', board: { picId: 12 } });
    expect(parseKanbanParams({ pic: '12; DROP' }, 7).picChoice).toBe('semua');
  });

  it('hanya nilai dikenal yang diterima (periode, jenis, tanggal, kartu, dialog)', () => {
    const parsed = parseKanbanParams({ periode: 'rentang', dari: '2026-10-01', sampai: 'bukan-tanggal', jenis: 'activity', kartu: '15', buat: 'project', dibuat: 'KB-00007', perpanjang: '1' }, 1);
    expect(parsed.board).toMatchObject({ period: 'RANGE', from: '2026-10-01', to: null, kind: 'ACTIVITY', extendsOnly: true });
    expect(parsed).toMatchObject({ openCardId: 15, create: 'project', createdCode: 'KB-00007' });
    const hostile = parseKanbanParams({ periode: 'x', jenis: 'x', kartu: '1x', buat: 'x', dibuat: '<script>' }, 1);
    expect(hostile.board.period).toBe('THIS_WEEK');
    expect(hostile).toMatchObject({ openCardId: null, create: null, createdCode: null });
  });

  it('menyusun alamat dengan mengganti dan menghapus parameter', () => {
    expect(kanbanHref({ pic: 'semua', q: 'klaim' }, { kartu: '3' })).toBe('/kanban?pic=semua&q=klaim&kartu=3');
    expect(kanbanHref({ pic: 'semua', kartu: '3' }, { kartu: null })).toBe('/kanban?pic=semua');
    expect(kanbanHref({}, { buat: null })).toBe('/kanban');
  });
});
