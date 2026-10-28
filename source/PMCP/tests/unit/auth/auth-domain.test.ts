/**
 * Uji domain auth: kebijakan password, username, throttle, aturan sesi, password sementara, hak akses.
 * Rujukan: FR-01-01, FR-01-02, FR-01-04, FR-01-05, FR-08-01, EC-01-02.xx.
 */
import { randomInt } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { can, type Actor } from '@/modules/auth/domain/actor';
import { isCommonPassword, validatePassword } from '@/modules/auth/domain/password-policy';
import { LAST_SEEN_REFRESH_MS, sessionStatus, shouldRefreshLastSeen } from '@/modules/auth/domain/session-rules';
import { generateTemporaryPassword } from '@/modules/auth/domain/temporary-password';
import { afterFailure, emptyThrottle, lockedUntil, THROTTLE_RULES } from '@/modules/auth/domain/throttle';
import { isValidUsername, normalizeUsername } from '@/modules/auth/domain/username';

const NOW = new Date('2026-10-28T05:00:00Z');
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

describe('kebijakan password (FR-01-02 butir 2)', () => {
  const ctx = { username: 'rina' };

  it('11 karakter ditolak, 12 diterima', () => {
    expect(validatePassword('kalimat-aman', ctx)).toEqual([]);
    expect(validatePassword('kalimat-ama', ctx)).toContain('TOO_SHORT');
  });

  it('129 karakter ditolak, 128 diterima (EC-01-02.04)', () => {
    const phrase = (length: number) => 'kata-sandi-panjang-'.repeat(10).slice(0, length);
    expect(validatePassword(phrase(129), ctx)).toContain('TOO_LONG');
    expect(validatePassword(phrase(128), ctx)).not.toContain('TOO_LONG');
  });

  it('tanpa aturan huruf besar, angka, atau simbol', () => {
    expect(validatePassword('hanyahurufkecil', ctx)).toEqual([]);
  });

  it('ditolak bila sama dengan username (tanpa membedakan huruf besar kecil)', () => {
    expect(validatePassword('RINAMANAGER12'.toLowerCase(), { username: 'rinamanager12' })).toContain('SAME_AS_USERNAME');
  });

  it('ditolak bila sama dengan password saat ini', () => {
    expect(validatePassword('kalimat-aman-lama', { username: 'rina', currentPassword: 'kalimat-aman-lama' })).toContain('SAME_AS_CURRENT');
  });

  it('password umum ditolak, termasuk variasi spasi dan huruf besar', () => {
    expect(validatePassword('password12345', ctx)).toContain('COMMON');
    expect(validatePassword('Password 12345', ctx)).toContain('COMMON');
    expect(validatePassword('123456789012', ctx)).toContain('COMMON');
    expect(validatePassword('aaaaaaaaaaaa', ctx)).toContain('COMMON');
    expect(validatePassword('abcdefghijkl', ctx)).toContain('COMMON');
  });

  it('spasi saja dikategorikan kosong', () => {
    expect(validatePassword('            ', ctx)).toContain('BLANK');
  });

  it('kalimat panjang yang wajar tidak dianggap umum', () => {
    expect(isCommonPassword('kopi-hitam-tanpa-gula-pagi-ini')).toBe(false);
  });
});

describe('username (FR-08-01 butir 2)', () => {
  it('menormalkan menjadi huruf kecil dan membuang spasi tepi', () => {
    expect(normalizeUsername('  Rina.BA  ')).toBe('rina.ba');
  });

  it('format 4 sampai 30 karakter dari huruf kecil, angka, titik, garis bawah, strip', () => {
    expect(isValidUsername('rina')).toBe(true);
    expect(isValidUsername('rina_ba-01.x')).toBe(true);
    expect(isValidUsername('abc')).toBe(false);
    expect(isValidUsername('a'.repeat(31))).toBe(false);
    expect(isValidUsername('Rina')).toBe(false);
    expect(isValidUsername('rina baru')).toBe(false);
    expect(isValidUsername('rina@x')).toBe(false);
  });
});

describe('throttle login (FR-01-01 butir 3)', () => {
  const { userMaxFailures, lockMinutes } = THROTTLE_RULES;

  it('kegagalan ke-5 berturut-turut memulai penundaan 15 menit', () => {
    let state = emptyThrottle(NOW);
    for (let i = 1; i < userMaxFailures; i += 1) {
      state = afterFailure(state, NOW, userMaxFailures, lockMinutes);
      expect(lockedUntil(state, NOW)).toBeNull();
    }
    state = afterFailure(state, NOW, userMaxFailures, lockMinutes);
    expect(state.failures).toBe(5);
    expect(lockedUntil(state, NOW)?.getTime()).toBe(minutes(15).getTime());
  });

  it('penundaan berakhir tepat pada waktunya dan siklus baru dimulai dari nol', () => {
    let state = emptyThrottle(NOW);
    for (let i = 0; i < userMaxFailures; i += 1) state = afterFailure(state, NOW, userMaxFailures, lockMinutes);
    expect(lockedUntil(state, minutes(14))).not.toBeNull();
    expect(lockedUntil(state, minutes(15))).toBeNull();
    const next = afterFailure(state, minutes(16), userMaxFailures, lockMinutes);
    expect(next.failures).toBe(1);
    expect(next.lockedUntil).toBeNull();
  });

  it('per sumber alamat: kegagalan di luar jendela tidak dihitung', () => {
    const first = afterFailure(null, NOW, THROTTLE_RULES.ipMaxFailures, lockMinutes, THROTTLE_RULES.ipWindowMinutes);
    const later = afterFailure(first, minutes(20), THROTTLE_RULES.ipMaxFailures, lockMinutes, THROTTLE_RULES.ipWindowMinutes);
    expect(later.failures).toBe(1);
  });

  it('tanpa keadaan sebelumnya tidak ditunda', () => {
    expect(lockedUntil(null, NOW)).toBeNull();
  });
});

describe('masa berlaku sesi (FR-01-01 butir 5)', () => {
  const base = { lastSeenAt: NOW, expiresAt: minutes(720), revokedAt: null };

  it('valid sebelum idle 2 jam', () => {
    expect(sessionStatus(base, minutes(119), 120)).toBe('valid');
  });

  it('idle tepat 2 jam ditolak', () => {
    expect(sessionStatus(base, minutes(120), 120)).toBe('idle');
  });

  it('maksimum 12 jam ditolak walau aktif (AC FR-01-01)', () => {
    const active = { ...base, lastSeenAt: minutes(719) };
    expect(sessionStatus(active, minutes(719), 120)).toBe('valid');
    expect(sessionStatus(active, minutes(720), 120)).toBe('expired');
  });

  it('sesi dicabut ditolak', () => {
    expect(sessionStatus({ ...base, revokedAt: NOW }, NOW, 120)).toBe('revoked');
  });

  it('last_seen diperbarui paling sering sekali per menit', () => {
    expect(shouldRefreshLastSeen(NOW, new Date(NOW.getTime() + LAST_SEEN_REFRESH_MS - 1))).toBe(false);
    expect(shouldRefreshLastSeen(NOW, new Date(NOW.getTime() + LAST_SEEN_REFRESH_MS))).toBe(true);
  });
});

describe('password sementara (FR-01-05 butir 1)', () => {
  it('16 karakter dalam empat kelompok dan selalu lolos kebijakan', () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generateTemporaryPassword((max) => randomInt(max));
      expect(password).toMatch(/^[a-z2-9]{4}(-[a-z2-9]{4}){3}$/);
      expect(validatePassword(password, { username: 'rina' })).toEqual([]);
    }
  });

  it('tidak memakai karakter yang mudah tertukar', () => {
    const joined = Array.from({ length: 100 }, () => generateTemporaryPassword((max) => randomInt(max))).join('');
    expect(joined).not.toMatch(/[ilo01]/);
  });

  it('dua password berturut-turut berbeda', () => {
    expect(generateTemporaryPassword((max) => randomInt(max))).not.toBe(generateTemporaryPassword((max) => randomInt(max)));
  });
});

describe('hak akses (FR-01-04, matriks FSD)', () => {
  const manager: Actor = { userId: 1, role: 'MANAGER', picId: null, picStage: null, label: 'Manager', mustChangePassword: false };
  const pic: Actor = { userId: 2, role: 'PIC', picId: 10, picStage: 'BA', label: 'Rina', mustChangePassword: false };

  it('Manager boleh mengelola master, akun, dan melihat jejak', () => {
    expect(can(manager, 'master.manage')).toBe(true);
    expect(can(manager, 'account.manage')).toBe(true);
    expect(can(manager, 'audit.view')).toBe(true);
  });

  it('PIC tidak boleh mengelola master, akun, atau melihat jejak', () => {
    expect(can(pic, 'master.manage')).toBe(false);
    expect(can(pic, 'account.manage')).toBe(false);
    expect(can(pic, 'audit.view')).toBe(false);
  });

  it('semua pengguna boleh mengganti password sendiri', () => {
    expect(can(manager, 'password.changeOwn')).toBe(true);
    expect(can(pic, 'password.changeOwn')).toBe(true);
  });
});
