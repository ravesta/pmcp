# Readiness Check FSD PMCP v1.0 (BA-6)

| | |
|---|---|
| Artifact yang dinilai | `ba/fsd.md` v1.0 DRAFT (bagian 1 sampai 4) |
| Dasar | `ba/brd.md` v4.0 APPROVED, `dev/technology-baseline.md` v1.0 APPROVED |
| Tanggal | 2026-10-28 |
| Pelaksana | Dua agent independen yang menjalankan peran DEV dan QA (bukan penyusun FSD), pilihan Pemilik (CD-169). Keduanya hanya membaca dan tidak mengubah berkas |
| Status | Hasil dicatat; tindak lanjut sudah diterapkan ke FSD; seluruh butir keputusan pemilik (CL-055, CL-056) sudah dijawab (CD-171) |

Catatan batas penilaian: agent DEV tidak membaca penuh Screen [012], [014], [020] s.d. [022] dan
tidak membaca isi clarification-log; agent QA membaca seluruh FSD. Temuan yang diverifikasi BA
terhadap teks FSD dan mockup sebelum diterapkan; temuan tentang perilaku mockup (mis. hari ini tidak
dihitung pada laju, penghitung manual tetap) dicek ke kode mockup v0.2.

## Putusan

| Peran | Putusan | Ringkasan |
|---|---|---|
| DEV | **Cukup dengan catatan** | Cakupan, hak akses, panjang field, daftar nilai, edge case konsisten dengan Technology Baseline. 10 dari 20 temuan menghalangi desain modul hitung (progres, kapasitas, kepatuhan, penanda rencana) dan Auth sebelum ditutup |
| QA | **Cukup dengan catatan** | Sekitar 90% FR dapat dites tegas; angka pada AC dihitung ulang dan benar; 6 dari 22 temuan menghalangi penulisan test case (satuan hari, rencana awal atau terkini, batas peringatan, definisi kartu dashboard, kontrol jam sistem) |

Setelah tindak lanjut di bawah, kedua penghalang kelompok aturan hitung dan aturan waktu ditutup di FSD.
Yang tersisa adalah keputusan pemilik di CL-056 dan butir yang memang ditunda ke Technical Design.

## Tindak lanjut per temuan

Kolom Disposisi: **Ditutup** = diperbaiki di FSD (rujukan); **Ditutup (usulan)** = diperbaiki dengan
usulan BA yang menunggu keputusan pemilik (CL-056); **TD** = ditunda ke Technical Design (bukan
kekurangan FSD); **UX** = ditunda ke handoff UX/UI.

### Temuan DEV

| ID | Inti temuan | Disposisi |
|---|---|---|
| DEV-01 | Kepatuhan memakai rencana awal atau terkini | **Ditutup**: rencana terkini (FR-21-02, FR-21-05, NFR-16), mengikuti mockup; jadwal ulang tetap terlihat sebagai penanda dan kolom |
| DEV-02 | Pembilang dan penyebut kepatuhan | **Ditutup**: identitas penjumlahan, definisi jatuh tempo, contoh angka (FR-21-05 butir 2, AC) |
| DEV-03 | Satuan "n hari" dan batas hari | **Ditutup**: hari kalender, terlambat bila sebelum hari ini (NFR-16 butir 4, FR-13-03) |
| DEV-04 | Pembulatan dan ambang | **Ditutup (usulan)**: dibulatkan sebelum dibandingkan (NFR-16 butir 5; FR-05-02, FR-07-05, FR-04-06) |
| DEV-05 | Angka manual, hari berlalu, hold | **Ditutup**: angka manual tetap berlaku; hari ini tidak dihitung pada laju; **hari kerja hold dikeluarkan** dari laju sesuai keputusan pemilik (FR-05-02 butir 6, CD-171). Mockup v0.2 belum menerapkan pengecualian hold: dicatat untuk handoff UX/UI |
| DEV-06 | Belum Mulai berprogres vs hitungan kartu | **Ditutup**: aturan hanya untuk angka manual (FR-05-01 butir 5, EC-05-01.05) |
| DEV-07 | Pemicu revisi otomatis dan penanda "memperpanjang" | **Ditutup (usulan)**: pemicu sedikitnya satu hari kerja, flag permanen, penggabungan revisi, tahapan Selesai (FR-13-05, EC-13-05.02, FR-04-01 kartu 6) |
| DEV-08 | Kapasitas: akhir pekan, kartu Done, minggu parsial | **Ditutup**: FR-07-05 butir 2 |
| DEV-09 | Penundaan login dan enumerasi username | **Ditutup (usulan)**: penghitung per username dan sumber, pesan sama, username tak dikenal tidak dicatat (FR-01-01, EC-01-01.03) |
| DEV-10 | PIC BA dan QA sekaligus; PIC tanpa login | **Ditutup (usulan)**: tahapan PIC tetap; PIC tanpa akun tidak dihitung (EC-17-01.04, FR-17-01, FR-08-01) |
| DEV-11 | Kategori otomatis bisa diganti nama | **Ditutup (usulan)**: kategori bawaan sistem terkunci (FR-08-03 butir 3) |
| DEV-12 | Log pada kartu status lain; kartu dibatalkan | **Ditutup (usulan)**: FR-18-01 butir 8, EC-21-04.03 |
| DEV-13 | Jenis Jejak Perubahan | **Ditutup**: jenis Kartu dan Keamanan ditambah (FR-09-01); satu sumber dan pemetaan jenis: **TD** |
| DEV-14 | Entitas riwayat penugasan | **TD** (entitas dan penanda dilihat); perilaku pelepasan dan penugasan ulang sudah di FR-07-02 dan EC-07-02.03 |
| DEV-15 | Cakupan konkurensi, celah nomor | **Ditutup**: NFR-10 diperluas, celah nomor diterima |
| DEV-16 | Riwayat pribadi vs log terbuka | **Ditutup (usulan)**: disengaja dan dicatat di NFR-15; konfirmasi di CL-056 |
| DEV-17 | Ketidakkonsistenan editorial | **Ditutup**: rujukan v4.0, kalimat ganda, matriks hak akses dirinci. Dua mekanisme progres pada Screen [016]: **UX** |
| DEV-18 | EC-04-01.06 tidak mungkin | **Ditutup**: ditulis ulang (EC-04-01.06, FR-04-06) |
| DEV-19 | Presisi estimasi jam | **Ditutup**: disimpan dalam menit (FR-07-05) |
| DEV-20 | Jadwal ulang pada tahapan Selesai | **Ditutup**: EC-13-05.02 |

### Temuan QA

| ID | Inti temuan | Disposisi |
|---|---|---|
| QA-01 | Satuan "n hari" | **Ditutup**: NFR-16 butir 4 dan contoh tanggal absolut |
| QA-02 | Rencana awal atau terkini | **Ditutup**: FR-21-02, FR-21-05 (AC jadwal ulang) |
| QA-03 | Kolom kepatuhan dan identitas | **Ditutup**: FR-21-05 butir 2 dan AC contoh |
| QA-04 | Kapan peringatan batas muncul | **Ditutup**: EC-21-03.03, EC-13-01.05 (sama dengan atau lebih dari batas) |
| QA-05 | AC dashboard vs Kanban | **Ditutup**: AC FR-04-05 dan FR-04-01 diperbaiki, NFR-14 dijelaskan |
| QA-06 | Kontrol jam sistem dan definisi minggu | **Ditutup**: NFR-16 butir 1, 3, 6 |
| QA-07 | Batas laju dan akhir pekan revisi | **Ditutup**: AC batas 20 poin, FR-13-05 butir 1 |
| QA-08 | Angka manual dan kartu dibatalkan | **Ditutup**: FR-05-02 butir 1 dan 3, AC |
| QA-09 | Transisi dan prioritas status | **Ditutup**: FR-05-01 butir 7 dan AC |
| QA-10 | Transisi status project dan kartu terbuka | **Ditutup**: FR-14-01 butir 8 |
| QA-11 | Definisi kartu 3 dan 5 | **Ditutup**: FR-04-01, FR-04-03 |
| QA-12 | Rasio pencatatan | **Ditutup**: FR-04-06, EC-04-01.06 |
| QA-13 | Status kapasitas dan mode Bulan | **Ditutup**: FR-07-05 butir 2, 5 dan AC |
| QA-14 | Tidak ada FR ubah kartu | **Ditutup (usulan)**: kartu tidak dapat diubah selain progres, kolom, jadwal ulang, pembatalan, log (FR-17-03) |
| QA-15 | Kasus batas log | **Ditutup**: FR-18-01 butir 2 dan 8 |
| QA-16 | Login: batas waktu, password panjang | **Ditutup**: AC dan EC-01-02.04; sumber daftar password umum: **TD** |
| QA-17 | Manager nonaktif; huruf besar username | **Ditutup**: FR-08-01 butir 2, 7 |
| QA-18 | Filter PIC dan tahapan; nilai filter | **Ditutup**: FR-10-02 butir 3, Screen [010] |
| QA-19 | Riwayat: Selesai, 30 hari, output | **Ditutup**: FR-07-08 |
| QA-20 | Edge case belum ada | **Ditutup** sebagian: EC-02-01.08/.09, EC-08-01.05, EC-13-01.06, EC-16-02.04; konkurensi dua tab: NFR-10 |
| QA-21 | NFR yang tidak dapat dites sebagai test case | NFR-08, NFR-14 (performa) TBD [CL-050] harus diterima pemilik tertulis (CD-28); NFR-05, NFR-07, NFR-09 diverifikasi lewat tinjauan dan uji pemulihan, dicatat di strategi uji QA (**TD**) |
| QA-22 | Konsistensi label dan editorial | **Ditutup**: rujukan v4.0, kalimat ganda. Penyeragaman pesan penolakan dan string label: **UX** (UX writing) |

### Daftar Periksa G2 butir 8 (QA)

Kolom Data Type dan Mandatory bernilai "-" atau "Berpasangan" pada banyak tabel field layar: **ditutup**
(85 sel dinormalisasi menjadi Ya, Tidak, atau Komposit). Screen untuk Keluar ditambahkan (Screen [025]).

## Hal yang ditunda ke Technical Design (bukan kekurangan FSD)

Skema database dan entitas riwayat penugasan; mekanisme konkurensi (versi atau kunci optimistis);
sumber waktu yang dapat diatur; ambang penghitung login per sumber alamat; token sesi dan CSRF;
sumber daftar password umum; kontrol agar tabel jejak tidak dapat diubah; target performa setelah ada
volume data; strategi uji untuk NFR non-fungsi; pustaka UI dan seret-lepas; prosedur pemulihan akun
Manager (aturan sudah di FR-01-06).

## Kesimpulan

Setelah tindak lanjut, FSD cukup untuk memulai Technical Design dan penulisan test case, dengan
catatan: (1) usulan BA di CL-055 dan CL-056 sudah diterima pemilik (CD-171; ID Kartu menjadi `KB-nnnnn`); (2) TBD
performa sudah diterima tertulis oleh pemilik (CD-28, CD-171); (3) readiness check sebaiknya diulang bila FSD
berubah signifikan sebelum diserahkan ke DEV dan QA (BA-6 catatan).
