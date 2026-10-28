# Handover Note: FSD PMCP v1.0 (BA ke DEV dan QA)

| | |
|---|---|
| HANDOVER-ID | HO-PMCP-001 |
| Dari | BA Agent |
| Ke | DEV, QA (dan UX/UI untuk layar) |
| Artifact | `ba/fsd.md` v1.1 APPROVED (CD-172, CD-173), `ba/brd.md` v4.1 APPROVED (CD-169, CD-175) |
| Status | Diserahkan 2026-10-28 |
| Gate | G2 Functional Baseline terpenuhi |

## Scope

Sistem web PMCP untuk memantau project dan tiga tahapan (BA, Development, QA), Kanban rencana kerja,
log aktivitas, kapasitas, dashboard Head dan PIC, dan riwayat. Pengguna kurang dari 20 orang, hanya
dari jaringan kantor, server lokal, PostgreSQL (Technology Baseline v1.0, CD-159).

## Summary

- 21 BR terpetakan ke 64 FR (FR-01-01 s.d. FR-21-05 pada tabel §3.4.1), 16 NFR, 158 edge case (`EC-`), 25 layar (Screen [001] s.d. [025]), 3 diagram alur per proses utama.
- Setiap FR memiliki baris `AC:` pada kolom Rules; setiap BL BRD muncul pada kolom Rules sedikitnya satu FR.
- Konvensi hitung (tanggal, hari kerja, pembulatan, jam sistem uji) ada di **NFR-16**; baca sebelum menulis modul hitung dan test case.
- Readiness check DEV dan QA sudah dijalankan (`ba/readiness-check-fsd-v1.0.md`), seluruh temuan ditutup atau ditunda ke Technical Design dengan alasan.

## Action Required

| Untuk | Tindakan |
|---|---|
| DEV | Technical Design (arsitektur modular monolith sesuai Technology Baseline §4, skema data, kontrak API, entitas riwayat penugasan, konkurensi, sumber waktu yang dapat diatur, kontrol jejak tidak dapat diubah). Aturan bisnis berada di lapisan domain. Kode mengikuti developer-governance §9 dan **setiap fungsi diberi komentar** (CD-160, NFR-09) |
| QA | Strategi uji dan test case dari baris `AC:` dan `EC-`; uji waktu memakai jam sistem uji (NFR-16); NFR non-fungsi (NFR-05, NFR-07, NFR-09) lewat tinjauan dan uji pemulihan |
| UX/UI | Handoff dari mockup v0.2 (bukan baseline) ke desain final per `.claude/rules/ui-ux-governance.md`; lihat butir mockup di bawah |
| PM | Jadwal implementasi dan koordinasi tim infra (pertanyaan di `dev/pertanyaan-tim-infra.md`, ditunda pemilik, dibutuhkan sebelum deploy pertama) |

## Constraints

- FSD tidak menetapkan teknologi; Technology Baseline v1.0 mengikat. Perubahan material lewat Technology Change Proposal.
- Hanya perubahan lewat Change Request untuk BRD dan FSD yang approved.
- Hosting server lokal, akses jaringan kantor, HTTPS wajib, RPO 24 jam, RTO satu hari kerja (CD-157).
- Kode di `source/PMCP/`, bukan di `projects/`.

## Open Items

1. **Target waktu muat ditetapkan: maksimal 3 detik** di front end untuk setiap layar (NFR-08, FR-15-01, NFR-14; CR-002, FSD v1.1, CD-173). Butir terbuka: **data acuan** untuk verifikasi karena volume data belum ada (CL-057); DEV dan QA mengusulkan, pemilik mengonfirmasi.
2. **Menunggu tim infra** (`dev/pertanyaan-tim-infra.md`): sistem operasi, HTTPS, versi PostgreSQL, alat CI/CD, backup. Ditunda pemilik; perubahan material akibat jawabannya lewat Technology Change Proposal.
3. **Ditunda ke fase berikut** (BRD §3.3.3): cuti dan libur nasional pada kapasitas, laporan dan ekspor (CL-008 ON HOLD), approval formal (CL-007 ON HOLD).
4. **Prosedur pemulihan akun Manager** (FR-01-06 butir 3): rincian teknis ditetapkan di Technical Design.

## Catatan untuk UX/UI (mockup v0.2 belum sesuai FSD)

- Layar **Login**, **Ubah Password**, formulir **Tambah PIC** dan **Reset password** belum ada di mockup.
- Tertinggal dari laju: hari kerja hold dikeluarkan (FR-05-02 butir 6); mockup belum menerapkannya.
- Kartu "Estimasi diperpanjang lewat rencana": hanya kartu belum Done (FR-04-01 kartu 6); kartu "Perlu dilengkapi": tanpa project Batal dan Selesai.
- Kartu activity ikut dihitung pada kapasitas bila berestimasi jam (FR-07-05).
- Tahapan kartu project otomatis tahapan PIC (tidak dipilih); kartu tidak dapat diubah selain progres, kolom, jadwal ulang, pembatalan, log (FR-17-03).
- Utilisasi, rasio pencatatan, dan kepatuhan dibulatkan sebelum dibandingkan ambang (NFR-16).
- Jejak Perubahan: saringan jenis Kartu dan Keamanan (FR-09-01).

## Requirement IDs

BR-01 s.d. BR-21; FR-01-01 s.d. FR-21-05 (64 FR); NFR-01 s.d. NFR-16; EC-xx-xx.xx; BL-01 s.d. BL-47 (BRD v4.0); keputusan CD-158 s.d. CD-172; klarifikasi CL-043 s.d. CL-056.

## Acceptance Criteria

Dinyatakan pada baris `AC:` setiap FR (kolom Rules, §3.4.1) dan pada NFR-16 (contoh acuan tanggal).
