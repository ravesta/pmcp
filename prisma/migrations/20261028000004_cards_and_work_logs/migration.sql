-- Migrasi 4: kartu Kanban, riwayat progres dan jadwal ulang, log aktivitas, dan sumber revisi otomatis.
-- Rujukan: dev/database-design.md §6; FSD FR-16 sampai FR-21; TD-15.

CREATE TABLE card (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code                 varchar(8)   NOT NULL UNIQUE
                         DEFAULT ('KB-' || lpad(nextval('card_code_seq')::text, 5, '0')),
  kind                 card_kind_t  NOT NULL,
  owner_pic_id         bigint       NOT NULL REFERENCES pic (id),
  project_id           bigint       REFERENCES project (id),
  stage                stage_t,
  step_name            varchar(60),
  category_name        varchar(60),
  title                varchar(120) NOT NULL,
  board_column         card_column_t NOT NULL DEFAULT 'PLANNED',
  progress             smallint     NOT NULL DEFAULT 0,
  progress_needs_input boolean      NOT NULL DEFAULT false,
  plan_start           date         NOT NULL,
  plan_end             date         NOT NULL,
  plan_baseline_start  date         NOT NULL,
  plan_baseline_end    date         NOT NULL,
  est_minutes          integer,
  is_adhoc             boolean      NOT NULL DEFAULT false,
  done_on              date,
  cancelled_at         timestamptz,
  cancel_reason        varchar(200),
  -- kartu asal perpanjangan estimasi tahapan otomatis, permanen (FR-13-05 butir 5, CL-056b)
  extends_stage        boolean      NOT NULL DEFAULT false,
  extension_note       varchar(300),
  version              integer      NOT NULL DEFAULT 1,
  created_at           timestamptz  NOT NULL DEFAULT now(),
  -- diperlukan foreign key komposit dari work_log agar pemilik log selalu sama dengan pemilik kartu
  CONSTRAINT card_id_owner_uq UNIQUE (id, owner_pic_id),
  CONSTRAINT card_title_len CHECK (char_length(btrim(title)) >= 3),
  CONSTRAINT card_plan_order CHECK (plan_end >= plan_start AND plan_baseline_end >= plan_baseline_start),
  CONSTRAINT card_progress_values CHECK (progress IN (0, 25, 50, 75)),
  -- lebih dari 0 sampai 80 jam (FR-17-01 butir 3)
  CONSTRAINT card_est_minutes CHECK (est_minutes IS NULL OR (est_minutes > 0 AND est_minutes <= 4800)),
  -- Done mengisi tanggal selesai dan sebaliknya (BL-37)
  CONSTRAINT card_done_on CHECK ((board_column = 'DONE') = (done_on IS NOT NULL)),
  CONSTRAINT card_cancel CHECK ((cancelled_at IS NULL) = (cancel_reason IS NULL)),
  -- jenis kartu: project (BA atau QA, tanpa kategori) atau activity (kategori, tanpa project)
  CONSTRAINT card_kind_shape CHECK (
    (kind = 'PROJECT'  AND project_id IS NOT NULL AND stage IN ('BA', 'QA') AND category_name IS NULL)
    OR
    (kind = 'ACTIVITY' AND project_id IS NULL AND stage IS NULL AND category_name IS NOT NULL)
  )
);
CREATE INDEX card_owner_column_idx ON card (owner_pic_id, board_column);
CREATE INDEX card_project_stage_idx ON card (project_id, stage);
CREATE INDEX card_plan_end_idx ON card (plan_end);
CREATE INDEX card_plan_start_idx ON card (plan_start);
CREATE INDEX card_extends_stage_idx ON card (extends_stage) WHERE extends_stage;

-- Kartu asal revisi estimasi otomatis (FR-13-05); revisi manual tidak punya baris di sini.
CREATE TABLE stage_revision_source (
  revision_id bigint NOT NULL REFERENCES stage_revision (id),
  card_id     bigint NOT NULL REFERENCES card (id),
  PRIMARY KEY (revision_id, card_id)
);

CREATE TABLE card_progress_event (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id    bigint      NOT NULL REFERENCES card (id),
  old_value  smallint    NOT NULL,
  new_value  smallint    NOT NULL,
  source     varchar(30) NOT NULL,
  created_by bigint      NOT NULL REFERENCES app_user (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX card_progress_event_card_idx ON card_progress_event (card_id);

CREATE TABLE card_reschedule (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id     bigint      NOT NULL REFERENCES card (id),
  old_start   date        NOT NULL,
  old_end     date        NOT NULL,
  new_start   date        NOT NULL,
  new_end     date        NOT NULL,
  reason_name varchar(60) NOT NULL,
  note        varchar(200),
  created_by  bigint      NOT NULL REFERENCES app_user (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT card_reschedule_order CHECK (new_end >= new_start)
);
CREATE INDEX card_reschedule_card_idx ON card_reschedule (card_id);

-- Log aktivitas (FR-18-01). Log tidak dapat diubah, hanya dihapus pemilik kartu (BL-30).
CREATE TABLE work_log (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id      bigint       NOT NULL,
  owner_pic_id bigint       NOT NULL,
  work_date    date         NOT NULL,
  start_time   time(0)      NOT NULL,
  end_time     time(0)      NOT NULL,
  step_name    varchar(60),
  description  varchar(300) NOT NULL CHECK (char_length(btrim(description)) >= 1),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT work_log_time_order CHECK (end_time > start_time),
  -- pemilik log selalu pemilik kartu
  CONSTRAINT work_log_card_owner_fk FOREIGN KEY (card_id, owner_pic_id) REFERENCES card (id, owner_pic_id)
);
CREATE INDEX work_log_owner_date_idx ON work_log (owner_pic_id, work_date, start_time);
CREATE INDEX work_log_card_idx ON work_log (card_id);

-- BL-28: log tidak boleh bentrok waktu dengan log PIC yang sama pada tanggal yang sama (lintas kartu).
-- Tanpa ekstensi btree_gist (tidak diizinkan, CD-175): trigger dengan kunci advisory per PIC (TD-15).
CREATE FUNCTION work_log_guard_overlap() RETURNS trigger AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(7001, NEW.owner_pic_id::int);   -- serialkan penulisan log per PIC
  IF EXISTS (
    SELECT 1 FROM work_log w
     WHERE w.owner_pic_id = NEW.owner_pic_id
       AND w.work_date    = NEW.work_date
       AND w.id IS DISTINCT FROM NEW.id
       AND w.start_time < NEW.end_time
       AND w.end_time   > NEW.start_time
  ) THEN
    RAISE EXCEPTION 'work_log_overlap' USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_log_no_overlap
  BEFORE INSERT OR UPDATE ON work_log
  FOR EACH ROW EXECUTE FUNCTION work_log_guard_overlap();
