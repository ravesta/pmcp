-- Migrasi 5: jejak audit append-only.
-- Rujukan: dev/database-design.md §7; FSD FR-09-01, NFR-04, BL-07; TD-09.
-- Dua peran database tidak tersedia (CD-175): perlindungan utama adalah trigger penolak di bawah ini
-- ditambah aturan bahwa kode aplikasi tidak pernah menerbitkan UPDATE atau DELETE pada audit_event.
-- Bila dua peran tersedia kelak, tambahkan: REVOKE UPDATE, DELETE, TRUNCATE ON audit_event FROM pmcp_app;

CREATE TABLE audit_event (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at   timestamptz      NOT NULL DEFAULT now(),
  actor_user_id bigint           REFERENCES app_user (id),   -- NULL untuk percobaan login username tak dikenal
  actor_label   varchar(120)     NOT NULL,
  category      audit_category_t NOT NULL,
  action        varchar(60)      NOT NULL,
  project_code  varchar(12),
  entity_type   varchar(30)      NOT NULL,
  entity_id     varchar(40),
  summary       varchar(300)     NOT NULL,
  -- daftar {field, old, new}; tidak pernah memuat password, token, atau nilai username tak dikenal (CL-056d)
  changes       jsonb            NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX audit_event_time_idx ON audit_event (occurred_at DESC);
CREATE INDEX audit_event_project_idx ON audit_event (project_code, occurred_at DESC);
CREATE INDEX audit_event_category_idx ON audit_event (category, occurred_at DESC);
CREATE INDEX audit_event_actor_idx ON audit_event (actor_user_id, occurred_at DESC);

CREATE FUNCTION audit_event_block_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_event bersifat append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_event_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_event
  FOR EACH ROW EXECUTE FUNCTION audit_event_block_change();

-- TRUNCATE tidak lewat trigger baris; dicegah dengan trigger pernyataan.
CREATE TRIGGER audit_event_no_truncate
  BEFORE TRUNCATE ON audit_event
  FOR EACH STATEMENT EXECUTE FUNCTION audit_event_block_change();
