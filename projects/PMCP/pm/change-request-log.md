# Change Request Log: PMCP

Perubahan pada artifact APPROVED hanya lewat Change Request (`.claude/rules/artifact-source-of-truth.md`
aturan 4, CD-22). Versi baru mulai dari DRAFT; baseline sebelumnya tetap berlaku sampai versi baru
disetujui Pemilik.

| ID | Tanggal | Diminta oleh | Artifact terdampak | Ringkasan | Klasifikasi | Status |
|---|---|---|---|---|---|---|
| CR-001 | 2026-10-28 | Pemilik (Head of Business Analyst) | `ba/brd.md` v3.5 APPROVED, `ba/fsd.md` (DRAFT bagian 3), `ux-ui/mockup/mockup-eksplorasi-v0.2.html` (tidak berubah) | Hak lihat kartu Kanban dan log (CL-053): (1) PIC melihat kartu semua PIC di papan Kanban dan hanya mengelola miliknya (BL-29); (2) log tidak dapat diubah, hanya dihapus (BL-30); (3) detail project memuat bagian Rencana kerja hanya baca (BR-20). | **Major** (mengubah perilaku fungsional, CD-22): BRD v3.5 menjadi v4.0 | **DITUTUP 2026-10-28.** Permintaan disetujui Pemilik (CD-166); BRD v4.0 disetujui Pemilik (CD-169) dan menggantikan v3.5 (SUPERSEDED). |
| CR-002 | 2026-10-28 | Pemilik (Head of Business Analyst) | `ba/fsd.md` v1.0 APPROVED (NFR-08, NFR-14, FR-15-01) | Target waktu muat front end maksimal 3 detik; mengisi TBD CL-050. Data acuan verifikasi dicatat di CL-057. | **Minor** (CD-22): memperjelas tanpa mengubah perilaku fungsional; FSD v1.0 menjadi v1.1 | **DITUTUP 2026-10-28.** Disetujui Pemilik atas keputusan langsung (CD-173); FSD v1.1 APPROVED; v1.0 SUPERSEDED (arsip `ba/arsip/fsd-v1.0-APPROVED.md`). |
| CR-003 | 2026-10-28 | Pemilik (Head of Business Analyst) | `ba/brd.md` v4.0 APPROVED (§5 Information Security Assessment) | Klasifikasi data PMCP ditetapkan **Internal**; kebijakan password dan sesi dirujuk ke Technology Baseline §8; menggantikan TBD. Dampak: FSD tidak berubah (rujukan BRD v4.0 tetap valid karena hanya §5 yang berubah); Security Design memakai klasifikasi ini. | **Minor** (CD-22): klarifikasi tanpa mengubah perilaku fungsional; BRD v4.0 menjadi v4.1 | **DITUTUP 2026-10-28.** Disetujui Pemilik atas keputusan langsung (CD-175); BRD v4.1 APPROVED; v4.0 SUPERSEDED (arsip `ba/arsip/brd-v4.0-APPROVED.md`). |

## CR-001: Analisis dampak

| Area | Dampak |
|---|---|
| BRD | BL-29, BL-30, BR-20 diubah; versi 3.5 menjadi 4.0 DRAFT; arsip v3.5 di `ba/arsip/brd-v3.5-APPROVED.md` |
| FSD | FR-16-01 (hak lihat papan), EC-16-01.01, FR-01-04 (matriks dan AC), FR-18-01 (log tidak dapat diubah), FR-20-02 (Rencana kerja), NFR-13, Screen [017] field PIC. FSD masih DRAFT sehingga diperbarui langsung |
| Mockup | Tidak berubah: mockup sudah sesuai (PIC melihat kartu rekan, hanya baca) |
| Keamanan | Hak lihat kartu menjadi lebih luas; hak ubah tidak berubah. Server tetap menegakkan hak ubah per pemilik (NFR-01, NFR-13). Privasi log kartu rekan sudah tampil di detail project (CL-033), jadi tidak ada data baru yang terbuka selain judul dan rencana kartu |
| Test case | Belum ada (QA menyusun setelah G2) |
| Kode | Belum ada |
| Jadwal | Tidak ada dampak |
