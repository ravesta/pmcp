-- Migrasi 1: tipe enum dan sequence.
-- Rujukan: dev/database-design.md §2 (Technical Design baseline v1.0, CD-176).
-- Tidak ada CREATE EXTENSION: ekstensi btree_gist tidak diizinkan (CD-175).

CREATE TYPE stage_t          AS ENUM ('BA', 'DEV', 'QA');
CREATE TYPE user_role_t      AS ENUM ('MANAGER', 'PIC');
CREATE TYPE project_type_t   AS ENUM ('NEW', 'CHANGE_REQUEST');
-- Backlog, Berjalan, Ditunda, Batal, Selesai
CREATE TYPE project_status_t AS ENUM ('BACKLOG', 'RUNNING', 'DEFERRED', 'CANCELLED', 'COMPLETED');
-- Belum Mulai, Berjalan, Ditahan, Selesai
CREATE TYPE stage_status_t   AS ENUM ('NOT_STARTED', 'RUNNING', 'HELD', 'DONE');
CREATE TYPE card_kind_t      AS ENUM ('PROJECT', 'ACTIVITY');
CREATE TYPE card_column_t    AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE');
CREATE TYPE audit_category_t AS ENUM ('PROJECT', 'CARD', 'MASTER', 'ACCOUNT', 'SECURITY');

-- PRJ-001, PRJ-002, ... (tiga angka atau lebih, CL-052); KB-00001, ... (lima angka, CD-171).
-- Celah nomor akibat transaksi batal diterima (NFR-10).
CREATE SEQUENCE project_code_seq START 1;
CREATE SEQUENCE card_code_seq    START 1;
