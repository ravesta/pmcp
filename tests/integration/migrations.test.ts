/**
 * Uji integrasi skema database: migrasi dapat dijalankan dari database kosong dan invarian kritis
 * ditegakkan database (BL-28, BL-20, BL-03, BL-13, BL-10, NFR-04).
 *
 * Uji berjalan di PostgreSQL sungguhan (database sementara yang dihapus otomatis) bila `DATABASE_URL`
 * tersedia; bila tidak, memakai PGlite sebagai cadangan (lihat `_support/database.ts`).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type TestDb } from './_support/database';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'prisma', 'migrations');

let db: TestDb;

/**
 * Menerapkan semua migrasi SQL berurutan nama folder pada database kosong.
 * Masukan: instansi database. Keluaran: janji selesai.
 * Efek samping: menjalankan DDL dan data awal pada database uji.
 * Rujukan: Technical Design §15, database-design §11.
 */
async function applyMigrations(target: TestDb): Promise<void> {
  const folders = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const folder of folders) {
    await target.exec(readFileSync(join(MIGRATIONS_DIR, folder, 'migration.sql'), 'utf8'));
  }
}

/**
 * Menegaskan bahwa sebuah pernyataan ditolak database dan pesan galatnya cocok.
 * Masukan: janji pernyataan dan pola pesan. Keluaran: janji selesai.
 * Efek samping: tidak ada (hanya memeriksa galat).
 * Rujukan: uji invarian database.
 */
async function expectRejected(statement: Promise<unknown>, pattern: RegExp): Promise<void> {
  await expect(statement).rejects.toThrow(pattern);
}

/**
 * Mengambil satu nilai skalar dari hasil kueri.
 * Masukan: SQL. Keluaran: nilai kolom pertama baris pertama.
 * Efek samping: membaca database uji.
 * Rujukan: uji invarian database.
 */
async function scalar<T>(sql: string): Promise<T> {
  const result = await db.query<Record<string, T>>(sql);
  return Object.values(result.rows[0] as Record<string, T>)[0] as T;
}

/**
 * Membuat akun Manager dan mengembalikan id-nya (dibutuhkan kolom created_by).
 * Masukan: username. Keluaran: id akun.
 * Efek samping: menulis satu baris app_user pada database uji.
 * Rujukan: FR-01-06.
 */
async function insertManager(username: string): Promise<number> {
  return scalar<number>(
    `INSERT INTO app_user (username, role, password_hash) VALUES ('${username}', 'MANAGER', 'hash-uji') RETURNING id`,
  );
}

/**
 * Membuat PIC dan mengembalikan id-nya.
 * Masukan: nama dan tahapan. Keluaran: id PIC.
 * Efek samping: menulis satu baris pic pada database uji.
 * Rujukan: FR-08-01.
 */
async function insertPic(name: string, stage: 'BA' | 'DEV' | 'QA'): Promise<number> {
  return scalar<number>(`INSERT INTO pic (name, stage) VALUES ('${name}', '${stage}') RETURNING id`);
}

/**
 * Membuat project minimal dan mengembalikan id dan kodenya.
 * Masukan: id pembuat. Keluaran: id dan kode project.
 * Efek samping: menulis satu baris project pada database uji.
 * Rujukan: FR-02-01.
 */
async function insertProject(createdBy: number): Promise<{ id: number; code: string }> {
  const result = await db.query<{ id: number; code: string }>(
    `INSERT INTO project (name, created_by) VALUES ('Project Uji', ${createdBy}) RETURNING id, code`,
  );
  return result.rows[0] as { id: number; code: string };
}

/**
 * Membuat kartu activity minimal milik PIC dan mengembalikan id dan kodenya.
 * Masukan: id PIC pemilik. Keluaran: id dan kode kartu.
 * Efek samping: menulis satu baris card pada database uji.
 * Rujukan: FR-21-01.
 */
async function insertActivityCard(ownerPicId: number): Promise<{ id: number; code: string }> {
  const result = await db.query<{ id: number; code: string }>(
    `INSERT INTO card (kind, owner_pic_id, category_name, title, plan_start, plan_end, plan_baseline_start, plan_baseline_end)
     VALUES ('ACTIVITY', ${ownerPicId}, 'Rapat departemen', 'Rapat mingguan', '2026-10-26', '2026-10-26', '2026-10-26', '2026-10-26')
     RETURNING id, code`,
  );
  return result.rows[0] as { id: number; code: string };
}

beforeAll(async () => {
  db = await createTestDb();
  console.info(`Mesin uji skema: ${db.engine}`);
  await applyMigrations(db);
});

afterAll(async () => {
  await db.close();
});

describe('migrasi dari database kosong', () => {
  it('membuat 22 tabel aplikasi', async () => {
    const result = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const names = result.rows.map((row) => row.table_name).sort();
    expect(names).toEqual(
      [
        'activity_category', 'affected_application', 'app_setting', 'app_user', 'audit_event', 'card',
        'card_progress_event', 'card_reschedule', 'login_throttle', 'pic', 'project', 'project_application',
        'project_stage', 'reschedule_reason', 'revision_category', 'session', 'stage_assignment',
        'stage_hold_history', 'stage_revision', 'stage_revision_source', 'stage_step', 'work_log',
      ].sort(),
    );
  });

  it('memasukkan data awal master sesuai FSD', async () => {
    expect(Number(await scalar<number>('SELECT count(*) FROM affected_application'))).toBe(7);
    expect(Number(await scalar<number>('SELECT count(*) FROM revision_category'))).toBe(6);
    expect(Number(await scalar<number>('SELECT count(*) FROM activity_category'))).toBe(8);
    expect(Number(await scalar<number>('SELECT count(*) FROM reschedule_reason'))).toBe(6);
    expect(Number(await scalar<number>(`SELECT count(*) FROM stage_step WHERE stage = 'BA'`))).toBe(9);
    expect(Number(await scalar<number>(`SELECT count(*) FROM stage_step WHERE stage = 'QA'`))).toBe(9);
    expect(Number(await scalar<number>(`SELECT int_value FROM app_setting WHERE key = 'revision_warn_threshold'`))).toBe(3);
    expect(Number(await scalar<number>(`SELECT int_value FROM app_setting WHERE key = 'reschedule_warn_threshold'`))).toBe(3);
  });

  it('dua kategori revisi bawaan sistem memiliki system_key (FR-08-03 butir 3)', async () => {
    const result = await db.query<{ system_key: string }>(
      'SELECT system_key FROM revision_category WHERE system_key IS NOT NULL ORDER BY system_key',
    );
    expect(result.rows.map((row) => row.system_key)).toEqual(['HOLD_RESUMED', 'LATE']);
  });

  it('master memakai keunikan nama tanpa membedakan huruf besar kecil (FR-08-02 butir a)', async () => {
    await expectRejected(db.query(`INSERT INTO affected_application (name) VALUES ('ess')`), /affected_application_name_uq/);
  });

  it('step tidak boleh untuk tahapan Development (BR-19)', async () => {
    await expectRejected(
      db.query(`INSERT INTO stage_step (stage, name, sort_order) VALUES ('DEV', 'Coding', 1)`),
      /stage_step_stage_check/,
    );
  });

  it('ambang peringatan hanya bilangan bulat 1 sampai 20 (FR-08-03, FR-08-05)', async () => {
    await expectRejected(db.query(`UPDATE app_setting SET int_value = 0 WHERE key = 'revision_warn_threshold'`), /app_setting_int_value_check/);
    await expectRejected(db.query(`UPDATE app_setting SET int_value = 21 WHERE key = 'revision_warn_threshold'`), /app_setting_int_value_check/);
  });
});

describe('akun (FR-01, FR-08-01)', () => {
  it('format username ditegakkan dan huruf besar ditolak', async () => {
    await expectRejected(
      db.query(`INSERT INTO app_user (username, role, password_hash) VALUES ('Mgr.Uji', 'MANAGER', 'x')`),
      /app_user_username_format/,
    );
    await expectRejected(
      db.query(`INSERT INTO app_user (username, role, password_hash) VALUES ('abc', 'MANAGER', 'x')`),
      /app_user_username_format/,
    );
  });

  it('akun PIC wajib menunjuk PIC dan akun Manager tidak boleh', async () => {
    const picId = await insertPic('Rina', 'BA');
    await expectRejected(
      db.query(`INSERT INTO app_user (username, role, password_hash) VALUES ('rina.pic', 'PIC', 'x')`),
      /app_user_role_pic/,
    );
    await expectRejected(
      db.query(`INSERT INTO app_user (username, role, pic_id, password_hash) VALUES ('mgr.salah', 'MANAGER', ${picId}, 'x')`),
      /app_user_role_pic/,
    );
    await db.query(`INSERT INTO app_user (username, role, pic_id, password_hash) VALUES ('rina', 'PIC', ${picId}, 'x')`);
  });

  it('username unik', async () => {
    await insertManager('manager1');
    await expectRejected(insertManager('manager1'), /app_user_username_key/);
  });
});

describe('project dan tahapan (FR-02, FR-05, FR-13)', () => {
  it('kode project dibuat otomatis berurutan PRJ-nnn (FR-02-01 butir 2)', async () => {
    const managerId = await insertManager('pembuat.project');
    const first = await insertProject(managerId);
    const second = await insertProject(managerId);
    expect(first.code).toMatch(/^PRJ-\d{3,}$/);
    expect(Number(second.code.slice(4))).toBeGreaterThan(Number(first.code.slice(4)));
  });

  it('Ditunda atau Batal wajib alasan, status lain tanpa alasan (BL-20)', async () => {
    const managerId = await insertManager('pembuat.status');
    await expectRejected(
      db.query(`INSERT INTO project (name, status, created_by) VALUES ('X', 'DEFERRED', ${managerId})`),
      /project_status_reason/,
    );
    await expectRejected(
      db.query(`INSERT INTO project (name, status, status_reason, created_by) VALUES ('X', 'RUNNING', 'alasan', ${managerId})`),
      /project_status_reason/,
    );
    await db.query(`INSERT INTO project (name, status, status_reason, created_by) VALUES ('X', 'CANCELLED', 'Dibatalkan unit bisnis', ${managerId})`);
  });

  it('estimasi berpasangan dan selesai tidak sebelum mulai (BL-03)', async () => {
    const managerId = await insertManager('pembuat.estimasi');
    const project = await insertProject(managerId);
    await expectRejected(
      db.query(`INSERT INTO project_stage (project_id, stage, est_start) VALUES (${project.id}, 'BA', '2026-10-26')`),
      /project_stage_est_pair/,
    );
    await expectRejected(
      db.query(`INSERT INTO project_stage (project_id, stage, est_start, est_end) VALUES (${project.id}, 'BA', '2026-10-30', '2026-10-26')`),
      /project_stage_est_pair/,
    );
    await db.query(`INSERT INTO project_stage (project_id, stage, est_start, est_end) VALUES (${project.id}, 'BA', '2026-10-26', '2026-10-30')`);
  });

  it('satu tahapan per jenis per project (BL-01)', async () => {
    const managerId = await insertManager('pembuat.unik');
    const project = await insertProject(managerId);
    await db.query(`INSERT INTO project_stage (project_id, stage) VALUES (${project.id}, 'QA')`);
    await expectRejected(db.query(`INSERT INTO project_stage (project_id, stage) VALUES (${project.id}, 'QA')`), /project_stage_uq/);
  });

  it('Ditahan wajib tanggal mulai dan alasan hold (BL-13)', async () => {
    const managerId = await insertManager('pembuat.hold');
    const project = await insertProject(managerId);
    await expectRejected(
      db.query(`INSERT INTO project_stage (project_id, stage, status) VALUES (${project.id}, 'BA', 'HELD')`),
      /project_stage_hold/,
    );
    await expectRejected(
      db.query(`INSERT INTO project_stage (project_id, stage, status, hold_since) VALUES (${project.id}, 'BA', 'HELD', '2026-10-26')`),
      /project_stage_hold/,
    );
    await db.query(
      `INSERT INTO project_stage (project_id, stage, status, hold_since, hold_reason) VALUES (${project.id}, 'BA', 'HELD', '2026-10-26', 'Menunggu bisnis')`,
    );
  });

  it('progres manual hanya 0 sampai 99 (FR-05-02 butir 3)', async () => {
    const managerId = await insertManager('pembuat.progres');
    const project = await insertProject(managerId);
    await expectRejected(
      db.query(`INSERT INTO project_stage (project_id, stage, manual_progress) VALUES (${project.id}, 'DEV', 100)`),
      /project_stage_manual_progress/,
    );
  });
});

describe('kartu dan log (FR-17, FR-18)', () => {
  it('kode kartu dibuat otomatis berformat KB-nnnnn lima angka (CD-171)', async () => {
    const picId = await insertPic('Pemilik Kartu', 'BA');
    const card = await insertActivityCard(picId);
    expect(card.code).toMatch(/^KB-\d{5}$/);
  });

  it('bentuk kartu mengikuti jenisnya (FR-17-01, FR-21-01)', async () => {
    const picId = await insertPic('Bentuk Kartu', 'BA');
    await expectRejected(
      db.query(
        `INSERT INTO card (kind, owner_pic_id, title, plan_start, plan_end, plan_baseline_start, plan_baseline_end)
         VALUES ('ACTIVITY', ${picId}, 'Tanpa kategori', '2026-10-26', '2026-10-26', '2026-10-26', '2026-10-26')`,
      ),
      /card_kind_shape/,
    );
    await expectRejected(
      db.query(
        `INSERT INTO card (kind, owner_pic_id, category_name, title, plan_start, plan_end, plan_baseline_start, plan_baseline_end)
         VALUES ('PROJECT', ${picId}, 'Rapat', 'Project tanpa project', '2026-10-26', '2026-10-26', '2026-10-26', '2026-10-26')`,
      ),
      /card_kind_shape/,
    );
  });

  it('judul minimal 3 karakter, rencana berurutan, estimasi jam lebih dari 0 sampai 80 jam', async () => {
    const picId = await insertPic('Batas Kartu', 'BA');
    const base = `kind, owner_pic_id, category_name, title, plan_start, plan_end, plan_baseline_start, plan_baseline_end`;
    await expectRejected(
      db.query(`INSERT INTO card (${base}) VALUES ('ACTIVITY', ${picId}, 'Rapat', 'ab', '2026-10-26', '2026-10-26', '2026-10-26', '2026-10-26')`),
      /card_title_len/,
    );
    await expectRejected(
      db.query(`INSERT INTO card (${base}) VALUES ('ACTIVITY', ${picId}, 'Rapat', 'Judul sah', '2026-10-30', '2026-10-26', '2026-10-30', '2026-10-26')`),
      /card_plan_order/,
    );
    await expectRejected(
      db.query(`INSERT INTO card (${base}, est_minutes) VALUES ('ACTIVITY', ${picId}, 'Rapat', 'Judul sah', '2026-10-26', '2026-10-26', '2026-10-26', '2026-10-26', 4801)`),
      /card_est_minutes/,
    );
    await expectRejected(
      db.query(`INSERT INTO card (${base}, est_minutes) VALUES ('ACTIVITY', ${picId}, 'Rapat', 'Judul sah', '2026-10-26', '2026-10-26', '2026-10-26', '2026-10-26', 0)`),
      /card_est_minutes/,
    );
  });

  it('progres kartu hanya 0, 25, 50, 75 dan tanggal selesai konsisten dengan kolom Done (BL-37, BL-40)', async () => {
    const picId = await insertPic('Progres Kartu', 'BA');
    const card = await insertActivityCard(picId);
    await expectRejected(db.query(`UPDATE card SET progress = 60 WHERE id = ${card.id}`), /card_progress_values/);
    await expectRejected(db.query(`UPDATE card SET board_column = 'DONE' WHERE id = ${card.id}`), /card_done_on/);
    await db.query(`UPDATE card SET board_column = 'DONE', done_on = '2026-10-26' WHERE id = ${card.id}`);
  });

  it('pembatalan wajib alasan (FR-21-04)', async () => {
    const picId = await insertPic('Batal Kartu', 'BA');
    const card = await insertActivityCard(picId);
    await expectRejected(db.query(`UPDATE card SET cancelled_at = now() WHERE id = ${card.id}`), /card_cancel/);
  });

  it('pemilik log harus pemilik kartu (foreign key komposit)', async () => {
    const owner = await insertPic('Pemilik Log', 'BA');
    const other = await insertPic('Bukan Pemilik', 'QA');
    const card = await insertActivityCard(owner);
    await expectRejected(
      db.query(
        `INSERT INTO work_log (card_id, owner_pic_id, work_date, start_time, end_time, description)
         VALUES (${card.id}, ${other}, '2026-10-26', '09:00', '10:00', 'Salah pemilik')`,
      ),
      /work_log_card_owner_fk/,
    );
  });

  it('jam selesai harus setelah jam mulai dan uraian wajib (FR-18-01)', async () => {
    const owner = await insertPic('Urutan Jam', 'BA');
    const card = await insertActivityCard(owner);
    await expectRejected(
      db.query(
        `INSERT INTO work_log (card_id, owner_pic_id, work_date, start_time, end_time, description)
         VALUES (${card.id}, ${owner}, '2026-10-26', '10:00', '10:00', 'Nol durasi')`,
      ),
      /work_log_time_order/,
    );
    await expectRejected(
      db.query(
        `INSERT INTO work_log (card_id, owner_pic_id, work_date, start_time, end_time, description)
         VALUES (${card.id}, ${owner}, '2026-10-26', '09:00', '10:00', '   ')`,
      ),
      /work_log_description_check/,
    );
  });
});

describe('log tidak boleh tumpang tindih per PIC (BL-28, TD-15)', () => {
  /**
   * Menambah log untuk satu kartu pada tanggal tetap 26/10/2026.
   * Masukan: id kartu, id PIC pemilik, jam mulai dan selesai. Keluaran: janji penulisan.
   * Efek samping: menulis satu baris work_log (atau ditolak trigger).
   * Rujukan: FR-18-01.
   */
  function addLog(cardId: number, ownerId: number, from: string, to: string): Promise<unknown> {
    return db.query(
      `INSERT INTO work_log (card_id, owner_pic_id, work_date, start_time, end_time, description)
       VALUES (${cardId}, ${ownerId}, '2026-10-26', '${from}', '${to}', 'Uji log')`,
    );
  }

  it('log yang beririsan ditolak, termasuk lintas kartu', async () => {
    const owner = await insertPic('Pemilik Overlap', 'BA');
    const cardA = await insertActivityCard(owner);
    const cardB = await insertActivityCard(owner);
    await addLog(cardA.id, owner, '09:00', '11:00');
    await expectRejected(addLog(cardA.id, owner, '10:00', '12:00'), /work_log_overlap/);
    await expectRejected(addLog(cardB.id, owner, '10:30', '11:30'), /work_log_overlap/);
    await expectRejected(addLog(cardB.id, owner, '08:00', '09:30'), /work_log_overlap/);
    await expectRejected(addLog(cardB.id, owner, '09:30', '10:00'), /work_log_overlap/);
  });

  it('log berimpit tepat tidak bentrok (selesai 11:00 dan mulai 11:00)', async () => {
    const owner = await insertPic('Pemilik Berimpit', 'BA');
    const card = await insertActivityCard(owner);
    await addLog(card.id, owner, '09:00', '11:00');
    await addLog(card.id, owner, '11:00', '12:00');
    await addLog(card.id, owner, '08:00', '09:00');
  });

  it('PIC lain pada waktu yang sama tidak bentrok', async () => {
    const first = await insertPic('PIC Satu', 'BA');
    const second = await insertPic('PIC Dua', 'QA');
    const cardOne = await insertActivityCard(first);
    const cardTwo = await insertActivityCard(second);
    await addLog(cardOne.id, first, '09:00', '11:00');
    await addLog(cardTwo.id, second, '09:00', '11:00');
  });

  it('tanggal berbeda tidak bentrok', async () => {
    const owner = await insertPic('Pemilik Tanggal', 'BA');
    const card = await insertActivityCard(owner);
    await addLog(card.id, owner, '09:00', '11:00');
    await db.query(
      `INSERT INTO work_log (card_id, owner_pic_id, work_date, start_time, end_time, description)
       VALUES (${card.id}, ${owner}, '2026-10-27', '09:00', '11:00', 'Hari lain')`,
    );
  });
});

describe('jejak audit append-only (NFR-04, TD-09)', () => {
  it('menerima INSERT tetapi menolak UPDATE, DELETE, dan TRUNCATE', async () => {
    await db.query(
      `INSERT INTO audit_event (actor_label, category, action, entity_type, summary)
       VALUES ('Manager', 'MASTER', 'master.created', 'affected_application', 'Aplikasi ditambahkan')`,
    );
    await expectRejected(db.query(`UPDATE audit_event SET summary = 'diubah'`), /append-only/);
    await expectRejected(db.query(`DELETE FROM audit_event`), /append-only/);
    await expectRejected(db.query(`TRUNCATE audit_event`), /append-only/);
    expect(Number(await scalar<number>('SELECT count(*) FROM audit_event'))).toBe(1);
  });

  it('perubahan default memakai daftar kosong dan kategori dibatasi enum', async () => {
    await db.query(
      `INSERT INTO audit_event (actor_label, category, action, entity_type, summary)
       VALUES ('Sistem', 'SECURITY', 'login.failed', 'session', 'Login gagal')`,
    );
    expect(await scalar<string>(`SELECT changes::text FROM audit_event WHERE action = 'login.failed'`)).toBe('[]');
    await expectRejected(
      db.query(`INSERT INTO audit_event (actor_label, category, action, entity_type, summary) VALUES ('X', 'LAIN', 'a', 'b', 'c')`),
      /invalid input value for enum/,
    );
  });
});
