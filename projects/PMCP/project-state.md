# Project State: PMCP

Ringkasan navigasi. Detail tetap di artifact masing-masing (ini bukan sumber kebenaran baru,
hanya pointer, lihat `.claude/skills/context-management/SKILL.md` §Jangan Duplikasi Register).

## Source Code

`source/PMCP/` (repository git tersendiri, belum di-commit). Irisan 0 (fondasi) selesai (CD-177); irisan 1 sampai 5 belum. Catatan: `dev/implementation-log.md`.

## Deployment

Belum ada.

## Current Phase

BRD v3.5 dan Technology Baseline v1.0 disetujui pemilik 2026-10-28 (CD-158, CD-159). FSD v1.0 DRAFT bagian 1 dari 4 (Akun, peran, Master) disusun (CD-161) dan dinyatakan ok pemilik (CD-162); bagian 2 sudah disusun (CD-163), bagian 3 dan 4 menyusul, lalu G2 dan kode (CD-154). Belum ada kode.

## Current Gate

G1 Requirement Baseline terpenuhi (2026-10-28, CD-158, diperbarui BRD v4.0 CD-169). **G2 Functional Baseline terpenuhi (2026-10-28, CD-172).** Berikutnya: implementasi irisan 0 sampai 5 di `source/PMCP/` (Technical Design Lampiran A), handoff UX/UI paralel, perencanaan uji (QA).

## Current Owner

Pemilik (Head of BA), Human Approver untuk seluruh artifact.

## Approved Artifacts

- `ba/fsd.md` v1.1 APPROVED (2026-10-28, CD-172 dan CD-173/CR-002), **baseline fungsional**; v1.0 SUPERSEDED (arsip `ba/arsip/fsd-v1.0-APPROVED.md`); waktu muat maksimal 3 detik; serah terima: `ba/handover-ba-dev-qa-fsd-v1.0.md`; hasil readiness check: `ba/readiness-check-fsd-v1.0.md`.
- `ba/brd.md` v4.1 APPROVED (2026-10-28, CD-175, CR-003; sebelumnya v4.0 CD-169 CR-001), **baseline berlaku**; v4.0 dan v3.5 SUPERSEDED, arsip di `ba/arsip/`.
- `dev/technical-design.md`, `dev/database-design.md`, `dev/security-design.md` v1.0 APPROVED (2026-10-28, CD-176), **baseline teknis**; `dev/documentation-plan.md`.
- `dev/technology-baseline.md` v1.0 APPROVED (2026-10-28, CD-159), dengan butir terbuka: jawaban tim infra (`dev/pertanyaan-tim-infra.md`) ditunda pemilik.

## In Review Artifacts

`ux-ui/handover/handoff-ux-ui-fsd-v1.1.md` v0.1 DRAFT (CD-178); mockup layar baru v0.3 sudah diterima pemilik (CD-179), dokumen handoff menunggu persetujuan.

## Open Clarifications

Lihat `ba/clarification-log.md` (CL-001 s.d. CL-057). Yang masih terbuka: CL-007 dan CL-008 ON HOLD, CL-057 (data acuan uji performa; target 3 detik sudah ditetapkan), serta asumsi BA bertanda "belum dikonfirmasi" (CL-042, CL-043 s.d. CL-048).

## Open Change Requests

Tidak ada. CR-001 (hak lihat kartu Kanban, log tidak dapat diubah, Rencana kerja) ditutup 2026-10-28 dengan BRD v4.0 APPROVED (CD-169). CR-002 (target waktu muat 3 detik) ditutup 2026-10-28 dengan FSD v1.1 (CD-173); CR-003 (klasifikasi data Internal) ditutup dengan BRD v4.1 (CD-175). Lihat `pm/change-request-log.md`.

## Open Risks / Issues

Lihat catatan R-01 di `ba/clarification-log.md` (tumpang tindih fungsi dengan TASKMON dan
TEAM-PLANNER).

## Working Files

`ux-ui/mockup/mockup-eksplorasi-v0.2.html`: mockup eksplorasi 3 tahapan (CD-121 s.d. CD-153); tahap mockup dinyatakan cukup oleh pemilik 2026-10-28. Bukan baseline dan belum menjadi handoff UX/UI; handoff mengikuti FSD yang disetujui. `mockup-eksplorasi-v0.1.html` (10 modul, CD-120) tidak lagi jadi acuan.

`ba/lampiran/prompt-awal-pemilik.md`: sumber mentah permintaan pemilik. Bukan requirement.

## Current Handover

Belum ada.

## Blockers

CL-001, CL-002, CL-003, CL-004, CL-005, CL-006, CL-009, CL-010 dijawab. CL-007 dan CL-008 ON HOLD. CL-005a dan pertanyaan lanjutan (cuti, master, akun) sudah dijawab. Tidak ada klarifikasi blocking. Langkah berikutnya (CD-154): (1) ~~BRD~~ dan (2) ~~Technology Baseline~~ sudah disetujui; (3) BA menyusun FSD untuk persetujuan pemilik (G2); (4) kode di `source/PMCP/`. Jawaban tim infra ditunda; ditagih sebelum deploy pertama.
