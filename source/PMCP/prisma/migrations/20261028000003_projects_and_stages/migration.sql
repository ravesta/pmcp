-- Migrasi 3: project, tahapan, penugasan PIC, revisi estimasi, dan riwayat hold.
-- Rujukan: dev/database-design.md §5; FSD FR-02, FR-03, FR-05, FR-07-02, FR-10 sampai FR-14.

CREATE TABLE project (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code           varchar(12) NOT NULL UNIQUE
                   DEFAULT ('PRJ-' || lpad(nextval('project_code_seq')::text, 3, '0')),
  name           varchar(100) NOT NULL CHECK (char_length(btrim(name)) >= 1),
  reference_no   varchar(50),
  project_type   project_type_t,
  business_owner varchar(100),
  department     varchar(100),
  request_date   date,
  description    varchar(1000),
  status         project_status_t NOT NULL DEFAULT 'BACKLOG',
  status_reason  varchar(200),
  version        integer      NOT NULL DEFAULT 1,
  created_by     bigint       NOT NULL REFERENCES app_user (id),
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  -- Ditunda dan Batal wajib alasan; status lain tanpa alasan (BL-20)
  CONSTRAINT project_status_reason CHECK ((status IN ('DEFERRED', 'CANCELLED')) = (status_reason IS NOT NULL))
);
CREATE INDEX project_status_idx ON project (status);
CREATE INDEX project_name_lower_idx ON project (lower(name));
CREATE INDEX project_reference_idx ON project (reference_no);

CREATE TABLE project_application (
  project_id     bigint NOT NULL REFERENCES project (id),
  application_id bigint NOT NULL REFERENCES affected_application (id),
  PRIMARY KEY (project_id, application_id)
);

-- Tepat tiga baris per project (BL-01), dijaga UNIQUE (project_id, stage) dan pembuatan oleh use case.
CREATE TABLE project_stage (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id           bigint        NOT NULL REFERENCES project (id),
  stage                stage_t       NOT NULL,
  status               stage_status_t NOT NULL DEFAULT 'NOT_STARTED',
  est_start            date,
  est_end              date,
  baseline_start       date,
  baseline_end         date,
  actual_start         date,
  actual_end           date,
  hold_since           date,
  hold_reason          varchar(300),
  manual_progress      smallint,
  manual_progress_note varchar(300),
  manual_progress_by   bigint REFERENCES app_user (id),
  manual_progress_at   timestamptz,
  version              integer       NOT NULL DEFAULT 1,
  CONSTRAINT project_stage_uq UNIQUE (project_id, stage),
  -- estimasi terkini berpasangan dan berurutan (BL-03)
  CONSTRAINT project_stage_est_pair CHECK ((est_start IS NULL) = (est_end IS NULL) AND (est_start IS NULL OR est_end >= est_start)),
  -- estimasi awal berpasangan dan berurutan; tidak berubah setelah terisi (dijaga use case, BL-11)
  CONSTRAINT project_stage_baseline_pair CHECK ((baseline_start IS NULL) = (baseline_end IS NULL) AND (baseline_start IS NULL OR baseline_end >= baseline_start)),
  -- hold: Ditahan mensyaratkan tanggal mulai dan alasan (BL-13)
  CONSTRAINT project_stage_hold CHECK ((status = 'HELD') = (hold_since IS NOT NULL) AND (status <> 'HELD' OR hold_reason IS NOT NULL)),
  CONSTRAINT project_stage_manual_progress CHECK (manual_progress IS NULL OR manual_progress BETWEEN 0 AND 99)
);
CREATE INDEX project_stage_project_idx ON project_stage (project_id);
CREATE INDEX project_stage_status_idx ON project_stage (status);
CREATE INDEX project_stage_est_end_idx ON project_stage (est_end);
CREATE INDEX project_stage_est_start_idx ON project_stage (est_start);

-- Penugasan PIC dan penanda "Assignment baru" (FR-07-02): seen_at NULL = belum dilihat.
CREATE TABLE stage_assignment (
  stage_id    bigint      NOT NULL REFERENCES project_stage (id),
  pic_id      bigint      NOT NULL REFERENCES pic (id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by bigint      NOT NULL REFERENCES app_user (id),
  seen_at     timestamptz,
  PRIMARY KEY (stage_id, pic_id)
);
CREATE INDEX stage_assignment_pic_idx ON stage_assignment (pic_id);

-- Revisi estimasi bernomor (BL-12); kartu asal revisi otomatis ada di stage_revision_source (migrasi 4).
CREATE TABLE stage_revision (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stage_id      bigint        NOT NULL REFERENCES project_stage (id),
  seq           integer       NOT NULL CHECK (seq >= 1),
  prev_start    date          NOT NULL,
  prev_end      date          NOT NULL,
  new_start     date          NOT NULL,
  new_end       date          NOT NULL,
  category_name varchar(50)   NOT NULL,
  note          varchar(2000) NOT NULL,
  created_by    bigint        NOT NULL REFERENCES app_user (id),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT stage_revision_uq UNIQUE (stage_id, seq),
  CONSTRAINT stage_revision_order CHECK (new_end >= new_start AND prev_end >= prev_start)
);

-- Periode hold yang sudah berakhir (hold berjalan ada di project_stage).
CREATE TABLE stage_hold_history (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stage_id   bigint       NOT NULL REFERENCES project_stage (id),
  hold_since date         NOT NULL,
  resumed_on date         NOT NULL,
  reason     varchar(300) NOT NULL,
  held_by    bigint       NOT NULL REFERENCES app_user (id),
  resumed_by bigint       NOT NULL REFERENCES app_user (id),
  CONSTRAINT stage_hold_history_order CHECK (resumed_on >= hold_since)
);
CREATE INDEX stage_hold_history_stage_idx ON stage_hold_history (stage_id);
