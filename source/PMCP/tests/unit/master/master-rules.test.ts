/**
 * Uji aturan master dan input PIC (FR-08-01, FR-08-02, FR-08-03).
 */
import { describe, expect, it } from 'vitest';
import { checkMasterName, checkPicInput, isValidThreshold, MASTER_RULES } from '@/modules/master/domain/master-rules';

describe('nama item master (FR-08-02 butir a)', () => {
  it('membuang spasi di tepi', () => {
    expect(checkMasterName('application', '  ESS  ')).toEqual({ ok: true, name: 'ESS' });
  });

  it('kosong atau spasi saja ditolak (EC-08-02.01)', () => {
    expect(checkMasterName('application', '')).toEqual({ ok: false, reason: 'EMPTY' });
    expect(checkMasterName('application', '    ')).toEqual({ ok: false, reason: 'EMPTY' });
  });

  it('batas panjang per master: tepat batas diterima, lebih satu ditolak (EC-08-02.03)', () => {
    expect(checkMasterName('application', 'a'.repeat(50)).ok).toBe(true);
    expect(checkMasterName('application', 'a'.repeat(51))).toEqual({ ok: false, reason: 'TOO_LONG' });
    expect(checkMasterName('activity_category', 'a'.repeat(60)).ok).toBe(true);
    expect(checkMasterName('stage_step', 'a'.repeat(61))).toEqual({ ok: false, reason: 'TOO_LONG' });
  });

  it('aturan minimal satu aktif: Aplikasi tidak mewajibkan, master lain mewajibkan', () => {
    expect(MASTER_RULES.application.requiresOneActive).toBe(false);
    expect(MASTER_RULES.revision_category.requiresOneActive).toBe(true);
    expect(MASTER_RULES.activity_category.requiresOneActive).toBe(true);
    expect(MASTER_RULES.reschedule_reason.requiresOneActive).toBe(true);
    expect(MASTER_RULES.stage_step.requiresOneActive).toBe(true);
  });
});

describe('ambang peringatan (EC-08-03.01)', () => {
  it('hanya bilangan bulat 1 sampai 20', () => {
    expect(isValidThreshold(1)).toBe(true);
    expect(isValidThreshold(20)).toBe(true);
    expect(isValidThreshold(0)).toBe(false);
    expect(isValidThreshold(21)).toBe(false);
    expect(isValidThreshold(2.5)).toBe(false);
  });
});

describe('isian PIC (FR-08-01)', () => {
  it('PIC QA dengan akun diterima', () => {
    expect(checkPicInput({ name: ' Sari ', stage: 'QA', withLogin: true })).toEqual({ ok: true, name: 'Sari', stage: 'QA', withLogin: true });
  });

  it('PIC Development tidak boleh memakai akun login (EC-08-01.02)', () => {
    const result = checkPicInput({ name: 'Andi', stage: 'DEV', withLogin: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fields.login).toBe('DEV_NO_LOGIN');
  });

  it('PIC Development tanpa akun diterima', () => {
    expect(checkPicInput({ name: 'Andi', stage: 'DEV', withLogin: false }).ok).toBe(true);
  });

  it('nama kosong, nama lebih dari 100, dan tahapan tidak dipilih ditolak', () => {
    const empty = checkPicInput({ name: ' ', stage: 'BA', withLogin: false });
    const long = checkPicInput({ name: 'x'.repeat(101), stage: 'BA', withLogin: false });
    const noStage = checkPicInput({ name: 'Budi', stage: '', withLogin: false });
    expect(!empty.ok && empty.fields.name).toBe('EMPTY');
    expect(!long.ok && long.fields.name).toBe('TOO_LONG');
    expect(!noStage.ok && noStage.fields.stage).toBe('REQUIRED');
  });
});
