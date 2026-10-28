-- Migrasi 2: akun, sesi, throttle login, dan master (beserta data awal master).
-- Rujukan: dev/database-design.md §3 dan §4; FSD FR-01-xx, FR-08-xx, FR-19-01.

-- ---------------------------------------------------------------- PIC (FR-08-01)
CREATE TABLE pic (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       varchar(100) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  stage      stage_t      NOT NULL,
  is_active  boolean      NOT NULL DEFAULT true,
  created_at timestamptz  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- akun login (FR-01-xx)
CREATE TABLE app_user (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username             varchar(30)  NOT NULL UNIQUE,
  role                 user_role_t  NOT NULL,
  pic_id               bigint       UNIQUE REFERENCES pic (id),
  password_hash        text         NOT NULL,
  must_change_password boolean      NOT NULL DEFAULT true,
  is_active            boolean      NOT NULL DEFAULT true,
  password_changed_at  timestamptz,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  -- username disimpan huruf kecil oleh aplikasi; format FR-08-01 butir 2
  CONSTRAINT app_user_username_format CHECK (username = lower(username) AND username ~ '^[a-z0-9._-]{4,30}$'),
  -- akun PIC menunjuk PIC; akun Manager tidak
  CONSTRAINT app_user_role_pic CHECK ((role = 'PIC') = (pic_id IS NOT NULL))
);

-- ---------------------------------------------------------------- sesi (FR-01-01 butir 5, Security Design §5)
CREATE TABLE session (
  token_hash   bytea       PRIMARY KEY,
  user_id      bigint      NOT NULL REFERENCES app_user (id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz
);
CREATE INDEX session_user_idx ON session (user_id);

-- ---------------------------------------------------------------- throttle login (FR-01-01 butir 3, CL-056)
CREATE TABLE login_throttle (
  scope        varchar(4)   NOT NULL CHECK (scope IN ('USER', 'IP')),
  key          varchar(100) NOT NULL,
  failures     integer      NOT NULL DEFAULT 0 CHECK (failures >= 0),
  locked_until timestamptz,
  updated_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, key)
);

-- ---------------------------------------------------------------- master (FR-08-02 sampai FR-08-05, FR-19-01)
CREATE TABLE affected_application (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       varchar(50) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX affected_application_name_uq ON affected_application (lower(name));

CREATE TABLE revision_category (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       varchar(50) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  is_active  boolean     NOT NULL DEFAULT true,
  -- kategori bawaan sistem yang dipilih otomatis; tidak dapat diubah nama atau dinonaktifkan (TD-12)
  system_key varchar(20) UNIQUE CHECK (system_key IN ('HOLD_RESUMED', 'LATE')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX revision_category_name_uq ON revision_category (lower(name));

CREATE TABLE activity_category (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       varchar(60) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX activity_category_name_uq ON activity_category (lower(name));

CREATE TABLE reschedule_reason (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       varchar(60) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX reschedule_reason_name_uq ON reschedule_reason (lower(name));

CREATE TABLE stage_step (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stage      stage_t     NOT NULL CHECK (stage IN ('BA', 'QA')),   -- Development tidak punya step (BR-19)
  name       varchar(60) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  sort_order integer     NOT NULL,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX stage_step_name_uq ON stage_step (stage, lower(name));
CREATE INDEX stage_step_order_idx ON stage_step (stage, sort_order);

CREATE TABLE app_setting (
  key       varchar(40) PRIMARY KEY,
  int_value integer     NOT NULL CHECK (int_value BETWEEN 1 AND 20)
);

-- ---------------------------------------------------------------- data awal master (sesuai FSD)
INSERT INTO affected_application (name) VALUES
  ('Precentia Life'), ('Group Insurance'), ('AJK'), ('Microsite'), ('ELSA'), ('ERIS'), ('ESS');

INSERT INTO revision_category (name, system_key) VALUES
  ('Ditahan lalu dilanjutkan', 'HOLD_RESUMED'),
  ('Terlambat dari estimasi',  'LATE'),
  ('Perubahan scope',          NULL),
  ('Pekerjaan dadakan',        NULL),
  ('Perubahan sumber daya',    NULL),
  ('Lainnya',                  NULL);

INSERT INTO activity_category (name) VALUES
  ('Rapat departemen'), ('Tata kelola BA/QA'), ('Dokumentasi & SOP'), ('Administrasi'),
  ('Pelatihan & berbagi pengetahuan'), ('Dukungan produksi'), ('Koordinasi internal'), ('Lainnya');

INSERT INTO reschedule_reason (name) VALUES
  ('Scope atau requirement berubah'), ('Menunggu pihak lain'), ('Prioritas berubah'),
  ('Estimasi terlalu optimis'), ('Sumber daya terbatas'), ('Lainnya');

INSERT INTO stage_step (stage, name, sort_order) VALUES
  ('BA', 'Intake & Asesmen Awal', 1), ('BA', 'Analisis Requirement', 2), ('BA', 'Definisi Business Rule', 3),
  ('BA', 'Dokumentasi Requirement', 4), ('BA', 'Review & Validasi', 5), ('BA', 'Konfirmasi Bisnis/User', 6),
  ('BA', 'Handover', 7), ('BA', 'Dukungan Klarifikasi', 8), ('BA', 'BA Closure', 9),
  ('QA', 'Tinjau Scope & Requirement', 1), ('QA', 'Test Planning', 2), ('QA', 'Skenario & Test Case', 3),
  ('QA', 'Data & Environment Uji', 4), ('QA', 'Eksekusi Test', 5), ('QA', 'Dokumentasi Defect', 6),
  ('QA', 'Retest & Regresi', 7), ('QA', 'Review Hasil Uji', 8), ('QA', 'Sign-off & Closure', 9);

INSERT INTO app_setting (key, int_value) VALUES
  ('revision_warn_threshold', 3),
  ('reschedule_warn_threshold', 3);
