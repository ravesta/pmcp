# Pencocokan FSD dengan implementasi (2026-10-28)

Cakupan: seluruh 64 FR beserta butir aturan dan AC yang saya baca ulang terhadap kode, daftar edge case (EC), dan NFR-01
sampai NFR-16. Bukti: kode di `ravesta/pmcp_app` (cabang `main`), uji otomatis (399 uji), dan alur di browser.

Status: **Terpenuhi**, **Disederhanakan** (fungsi ada, tampilan atau cara berbeda dari mockup), **Belum**.

## Ringkasan per bagian

| Bagian FSD | FR | Status |
|---|---|---|
| Akun, sesi, hak akses | FR-01-01 sampai FR-01-06 | Terpenuhi (FR-01-06 lewat skrip `bootstrap-manager.mjs`, bukan layar) |
| Master | FR-08-01 sampai FR-08-06, FR-19-01 | Terpenuhi |
| Jejak Perubahan | FR-09-01 | Terpenuhi (saringan Keamanan kini memuat akses ditolak) |
| Project dan tahapan | FR-02, FR-03, FR-05, FR-06 | Terpenuhi |
| Daftar, Gantt, Detail | FR-10, FR-11, FR-12, FR-14-02, FR-15-01 | Terpenuhi |
| Revisi, hold, terlambat, status | FR-13-01 sampai FR-13-05, FR-14-01 | Terpenuhi |
| Kanban | FR-16, FR-17, FR-18, FR-20, FR-21 | Terpenuhi (tombol "+ Dadakan" diganti kotak centang, lihat bawah) |
| Dashboard Head | FR-04-01 sampai FR-04-06 | Terpenuhi |
| Dashboard PIC | FR-07-01 sampai FR-07-07 | Terpenuhi; FR-07-04 **Disederhanakan** (garis waktu ringkas, bukan bar Gantt penuh) |
| Riwayat | FR-07-08, FR-07-09 | Terpenuhi |

## Celah yang ditemukan dan sudah ditutup

| Butir FSD | Celah | Perbaikan |
|---|---|---|
| FR-01-04 butir 4, EC-16-01.01 | Akses ditolak belum tercatat di Jejak Perubahan | `recordAccessDenied`; setiap Server Action bertindak-ubah dan layar Master mencatat peristiwa Keamanan |
| EC-15-01.01 | Tidak ada pesan gagal memuat dengan "Coba lagi" | `error.tsx`, `global-error.tsx`, `not-found.tsx` |
| EC-08-01.05 | Kartu dan jam PIC nonaktif hilang dari kapasitas dan kepatuhan | PIC nonaktif tetap dihitung bila punya kartu atau jam pada periode; tidak dihitung sebagai PIC aktif |
| FR-12-03 butir 1 | Tahapan PIC terpilih pada filter tidak disorot | Bar milik PIC terpilih diberi tepi sorot |
| EC-21-05.03 | Rentang tanggal tidak valid diabaikan tanpa pesan | Pesan peringatan pada papan Kanban |
| EC-17-01.03, EC-17-01.05 | Teks pesan berbeda dari FSD | Disamakan dengan FSD |
| Technical Design §15 | Tidak ada log aplikasi, health check tanpa database, tidak ada pembersihan sesi | `platform/logger`, `instrumentation.ts`, `/api/health` memeriksa database, `scripts/cleanup-sessions.mjs` |

## Yang sengaja berbeda atau belum

| Hal | Keterangan |
|---|---|
| Login dan Ubah Password belum selaras mockup | Mockup v0.2 hanya memuat layar setelah login |
| FR-07-04 Timeline proyek saya | Garis waktu ringkas; bar penuh ada di tab Project |
| Tombol "+ Dadakan" | Diganti kotak centang "Pekerjaan dadakan" di dialog Buat kartu (berlaku untuk kartu project dan activity) |
| Papan Kanban | Maksimal 40 kartu per kolom dengan "Tampilkan lebih banyak" (anggaran muat 3 detik); jumlah sebenarnya tetap tampil |
| Uji E2E otomatis permanen | Skenario browser baru berupa skrip sementara; belum menjadi bagian repository |
| Kontras tema gelap, pembaca layar | Belum diuji sistematis (NFR-05); lebar telepon 375 px diuji: tanpa gulir mendatar pada seluruh layar utama |
| Dokumen deployment dan operasi, data awal master final, handover QA | Menunggu jawaban tim infra dan jadwal rilis |
| Di luar lingkup FSD | Ekspor dan laporan, notifikasi, cuti dan libur nasional |

## Catatan metode

Pencocokan dilakukan dengan membaca setiap FR (aturan dan AC) dan EC terhadap kode serta uji. Butir yang hanya
diverifikasi lewat membaca kode (bukan uji otomatis) adalah: urutan pesan galat per isian, penyorotan bar Gantt, teks pesan
FSD, dan hak tombol per peran pada layar. QA sebaiknya memeriksa butir-butir ini pada strategi uji.
