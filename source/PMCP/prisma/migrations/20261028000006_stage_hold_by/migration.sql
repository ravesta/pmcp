-- Migrasi 6: mencatat siapa yang memulai hold berjalan.
-- Alasan: stage_hold_history.held_by wajib terisi saat hold ditutup, tetapi project_stage belum menyimpan
-- pelaku yang memulai hold. Penambahan kolom ini searah dengan database-design §5 (tidak mengubah keputusan).
-- Rujukan: FR-13-02 butir 3 (periode hold, alasan, dan pelaku tersimpan sebagai riwayat), BL-13.

ALTER TABLE project_stage ADD COLUMN hold_by bigint REFERENCES app_user (id);

-- Hold berjalan wajib berpelaku; status lain tanpa pelaku hold.
ALTER TABLE project_stage
  ADD CONSTRAINT project_stage_hold_by CHECK ((status = 'HELD') = (hold_by IS NOT NULL));
