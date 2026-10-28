# Handoff UX/UI: PMCP (untuk DEV)

| | |
|---|---|
| Project | PMCP |
| Versi | 0.1 |
| Tanggal | 2026-10-28 |
| Status | **DRAFT** (menunggu review pemilik; mockup bukan baseline) |
| Disusun oleh | UX/UI Agent |
| Sumber fungsional | `ba/fsd.md` v1.1 APPROVED (G2), `ba/brd.md` v4.1 |
| Acuan visual | `ux-ui/mockup/mockup-eksplorasi-v0.2.html` (layar utama) dan `ux-ui/mockup/mockup-layar-baru-v0.3.html` (layar baru) |
| Aturan | FSD tetap sumber kebenaran fungsional; dokumen ini tidak mengubah aturan bisnis (`.claude/rules/ui-ux-governance.md`). Bila desain bertentangan dengan FSD, FSD menang dan hal itu kembali ke BA |

## 1. Ringkasan handoff

```yaml
feature: PMCP seluruh layar (25 layar FSD)
source_fsd: ba/fsd.md v1.1 (Screen [001] s.d. [025])
source_requirement: FR-01-01..FR-21-05, NFR-05 (aksesibilitas, responsif), NFR-08 (3 detik), NFR-16
uiux_artifacts:
  - mockup-eksplorasi-v0.2.html: layar Dashboard, Project, Kanban, Riwayat, Master (acuan visual)
  - mockup-layar-baru-v0.3.html: Login, Ubah Password, Master PIC (Tambah, Reset, Nonaktifkan, Ubah nama), Header
components: bagian 4
interactions: bagian 5
states: bagian 6
validation: bagian 7
responsive_behavior: bagian 8
accessibility: bagian 9
design_constraints: MUI inti dengan tema sendiri (Technology Baseline §7, disetujui pemilik); Gantt, Kanban, kapasitas dibangun sendiri; anggaran muat 3 detik; tanpa pustaka berbayar
open_issues: bagian 11
```

## 2. Cakupan dan status per layar

| Screen FSD | Layar | Acuan | Status |
|---|---|---|---|
| 001 | Login | mockup v0.3 | **Baru, perlu review pemilik** |
| 002 | Ubah Password (wajib ganti dan sukarela) | mockup v0.3 | **Baru, perlu review pemilik** |
| 003 s.d. 007, 009 | Sub menu Master dan Jejak Perubahan | mockup v0.2 | Ada; sesuai FSD |
| 008 | Master PIC (Tambah PIC, Reset password, Password sementara, Nonaktifkan, Ubah nama) | mockup v0.3 | **Baru, perlu review pemilik** |
| 010 s.d. 016 | Project (Gantt, Daftar, Baru, Detail, Ubah informasi, Perbarui tahapan) | mockup v0.2 | Ada; ada penyesuaian (bagian 3) |
| 017 s.d. 020 | Kanban, Buat kartu, Rincian kartu, Rencana kerja dan log di detail project | mockup v0.2 | Ada; ada penyesuaian (bagian 3) |
| 021, 022 | Dashboard Head dan Dashboard PIC | mockup v0.2 | Ada; ada penyesuaian (bagian 3) |
| 023, 024 | Riwayat (Tahapan selesai, Aktivitas harian) | mockup v0.2 | Ada |
| 025 | Header aplikasi dan menu pengguna | mockup v0.3 | **Baru, perlu review pemilik** |

## 3. Penyesuaian mockup v0.2 terhadap FSD v1.1 (wajib diterapkan DEV)

Mockup v0.2 dibuat sebelum beberapa keputusan; FSD yang berlaku. Daftar ini diturunkan dari handover BA
dan readiness check.

| No | Hal | Mockup v0.2 | Menurut FSD v1.1 |
|---|---|---|---|
| 1 | Tertinggal dari laju | hari hold tidak dikeluarkan | hari kerja hold dikeluarkan dari pembilang dan penyebut (FR-05-02 butir 6) |
| 2 | Kartu "Estimasi diperpanjang lewat rencana" | juga menghitung kartu Done | hanya kartu belum Done (FR-04-01 kartu 6) |
| 3 | Kartu "Perlu dilengkapi" | semua project | selain Batal dan Selesai (FR-04-01 kartu 7) |
| 4 | Kapasitas | kartu activity ikut dihitung bila berestimasi jam | sama (FR-07-05); pastikan teks catatan layar menyebutnya |
| 5 | Pembuatan kartu project | tahapan dipilih dari dropdown | tahapan otomatis dari tahapan tetap PIC (EC-17-01.04); tampilkan sebagai teks hanya baca |
| 6 | Detail kartu | tidak mengubah isi kartu | memang tidak dapat diubah selain progres, kolom, jadwal ulang, pembatalan, log (FR-17-03); jangan menambah tombol ubah |
| 7 | Log | tidak ada tombol ubah | tetap tidak ada; hanya Hapus dengan konfirmasi (BL-30) |
| 8 | Utilisasi, rasio pencatatan, kepatuhan | dibulatkan saat tampil | dibulatkan **sebelum** dibandingkan ambang (NFR-16); tampilan harus memakai angka bulat yang sama dengan status |
| 9 | Kanban untuk PIC | boleh melihat kartu rekan | sama (BL-29, CR-001); kartu rekan hanya baca, tanpa tombol pindah atau ubah |
| 10 | Jejak Perubahan | saringan Jenis: Semua, Project, Master, Akun | tambah **Kartu** dan **Keamanan** (FR-09-01) |
| 11 | Kategori alasan revisi bawaan sistem | dapat diubah nama atau dinonaktifkan | "Ditahan lalu dilanjutkan" dan "Terlambat dari estimasi" tidak dapat diubah nama atau dinonaktifkan: sembunyikan tombolnya dan beri keterangan "Bawaan sistem" (FR-08-03 butir 3) |
| 12 | Master PIC | hanya daftar dan tombol Reset nonaktif | pakai layar baru v0.3 (Tambah, Reset, Nonaktifkan, Ubah nama) |
| 13 | Daftar Project | pagination 5, 10, 20 | sama; bawaan 5 |
| 14 | Dashboard PIC "Antrean", "Riwayat" | mockup sudah sesuai BRD v4.1 | tidak ada perubahan |

## 4. Komponen (Technology Baseline §7: MUI inti, tema sendiri)

Token warna, jarak, dan radius mengikuti variabel CSS pada mockup (`--accent`, `--late`, `--warn`, `--ok`,
`--hold`, `--ba`, `--dev`, `--qa`, status project, tema terang dan gelap). Tema MUI disetel dari token ini
supaya tampilan tidak menjadi tampilan Material bawaan (kontras tetap memenuhi bagian 9).

| Kebutuhan | Komponen | Catatan |
|---|---|---|
| Tombol, tombol sekunder, tombol bahaya | MUI Button (variant contained, outlined; color error) | Bahaya hanya untuk aksi yang tidak mudah dibalik (Reset password, Nonaktifkan) |
| Isian teks dan password | MUI TextField; password dengan tombol "Lihat/Sembunyi" (InputAdornment) | Teks tombol berupa kata, bukan ikon saja |
| Dropdown biasa | MUI Select | |
| Pilihan ganda dengan pencarian (nama project, PIC, aplikasi) | MUI Autocomplete multiple | Ada tombol Terapkan di panel pada mockup; boleh tanpa bila pembaruan segera tidak membuat layar berkedip |
| Dialog | MUI Dialog | Fokus masuk ke dialog dan kembali ke pemicu saat ditutup |
| Tab dan sub menu Master | MUI Tabs (scrollable) | Mockup memakai bentuk pil; boleh Tabs bergaris bawah |
| Kontrol segmen (Minggu/Bulan, Hari/Minggu, Daftar/Gantt) | MUI ToggleButtonGroup (exclusive) | `aria-pressed` |
| Chip status | MUI Chip (ukuran kecil) | Warna **dan teks** (tidak hanya warna) |
| Tabel + pagination | MUI Table, TablePagination | Header tetap pada tabel panjang; tabel dibungkus agar dapat digulir mendatar |
| Bar progres | MUI LinearProgress (determinate) | Beri teks persen di sampingnya |
| Tooltip | MUI Tooltip | Hanya tambahan; informasi penting harus terlihat tanpa hover |
| Pesan (sukses, galat, peringatan) | MUI Alert | `role="alert"` untuk galat, `role="status"` untuk sukses |
| **Dibangun sendiri** | Gantt (bar, garis hari ini, akhir pekan, estimasi awal dan aktual, hold), papan Kanban dan kartu, kotak kapasitas harian, garis waktu pribadi, kartu ringkasan dashboard | Mengacu mockup v0.2; tidak ada pustaka gratis yang sesuai (Technology Baseline §7) |

## 5. Interaksi penting (layar baru)

### 5.1 Login (FR-01-01)
- Fokus awal pada Username. Enter mengirim. Tombol Masuk tidak dinonaktifkan sebelum isian terisi (kesalahan ditampilkan setelah kirim agar pembaca layar tidak kehilangan konteks).
- Satu pesan generik "Username atau password salah." untuk username tidak dikenal, password salah, dan akun nonaktif. **Jangan** menyorot isian mana yang salah (mencegah enumerasi username).
- Penundaan: pesan menyebut jam boleh mencoba lagi; isian dan tombol dinonaktifkan; teks yang sama untuk username tidak dikenal (FR-01-01 butir 3, CL-056).
- Sesi habis: pesan informasi pada layar login, setelah login pengguna kembali ke menu awal (EC-01-01.04).
- Tidak ada tautan "Lupa password"; keterangan "Hubungi Manager untuk direset". Field Username `autocapitalize="none"`.

### 5.2 Ubah Password (FR-01-02, FR-01-05)
- **Mode wajib ganti** (akun dengan password sementara): menu aplikasi tidak tersedia, hanya Simpan dan Keluar; label isian pertama "Password sementara".
- **Mode sukarela** (dari menu pengguna): label "Password saat ini"; keterangan bahwa sesi lain akan berakhir dan sesi ini tetap.
- Daftar aturan pada bawah isian "Password baru" berubah menjadi tanda lulus atau gagal **saat mengetik**, diumumkan dengan `aria-live="polite"`. Aturan yang ditampilkan: minimal 12, maksimal 128, berbeda dari username, bukan password umum. Tidak ada aturan huruf besar, angka, atau simbol (kebijakan disetujui pemilik).
- Kegagalan "password sementara atau saat ini salah" memakai pesan galat umum dan dihitung sebagai percobaan login (FR-01-02).
- Setelah sukses: pesan berhasil; mode wajib langsung mengarah ke Dashboard.

### 5.3 Master PIC (FR-08-01, FR-01-05)
- **Tambah PIC**: dialog dengan Nama, Tahapan, Akun login (Ya/Tidak), Username. Memilih **Development** otomatis memilih "Tidak" dan menonaktifkan "Ya" disertai keterangan (EC-08-01.02). Username diubah ke huruf kecil saat mengetik. Galat per isian di bawah isiannya.
- **Password sementara tampil sekali**: dialog khusus dengan password dalam huruf monospasi, tombol Salin, peringatan "tidak dapat ditampilkan lagi", kotak centang "Saya sudah mencatat password ini" yang **harus dicentang** agar tombol Selesai aktif; dialog tidak tertutup dengan Escape atau klik luar (EC-01-05.01). Jangan menyimpan password di URL, riwayat browser, atau log; respons tanpa cache.
- **Reset password**: dialog konfirmasi menjelaskan dampak (sesi berakhir, penundaan dihapus) lalu menampilkan dialog password sementara yang sama.
- **Nonaktifkan**: bila PIC masih bertugas pada tahapan belum Selesai, dialog menampilkan **daftar project terdampak** dan menyatakan penugasan tidak dilepas otomatis (EC-08-01.03). Tombol bahaya "Ya, nonaktifkan". Mengaktifkan kembali cukup dengan konfirmasi ringan.
- **Ubah nama**: dialog kecil; keterangan bahwa tahapan dan username tidak dapat diubah.
- Akun Manager tidak ada di daftar ini (FR-08-01 butir 7).

### 5.4 Header dan menu pengguna (FR-01-03, FR-01-04, Screen 025)
- Menu utama sesuai peran (Manager: Dashboard, Project, Kanban, Riwayat, Master; PIC tanpa Master). Menu aktif ditandai garis bawah dan `aria-current="page"`.
- Menu pengguna (tombol berisi inisial, nama, peran) membuka daftar "Ganti password" dan "Keluar". Dapat dioperasikan dengan keyboard (Enter membuka, panah memilih, Escape menutup dan mengembalikan fokus).
- Akses ke halaman di luar hak: layar "Anda tidak memiliki akses ke halaman ini." dengan tautan ke Dashboard (FR-01-04 butir 4).

## 6. Keadaan layar (wajib dirancang untuk semua layar)

Setiap layar daftar atau data wajib memiliki: **memuat** (kerangka abu atau penunjuk, dengan target 3 detik),
**kosong** (kalimat dari FSD, mis. "Tidak ada project yang cocok dengan filter." dengan tombol Reset filter),
**galat muat** (pesan, tombol "Coba lagi", tanpa data sebagian, EC-15-01.01), **berhasil** (pesan singkat),
**terkunci** (tombol nonaktif disertai alasan terlihat, bukan hanya warna abu), dan **tanpa izin**.
Pesan galat memakai katalog tunggal (`platform/messages.ts`) dengan teks dari FSD.

| Keadaan | Layar yang paling terdampak | Perlakuan |
|---|---|---|
| Memuat | Dashboard, Gantt, Daftar, Riwayat, Jejak | Kerangka per bagian (dashboard di-stream per bagian, Technical Design §13) |
| Kosong | Daftar, Gantt, Kanban (papan), Riwayat, Assignment baru | Kalimat dari FSD |
| Galat validasi | semua formulir | Pesan per isian, ringkasan di atas formulir untuk kegagalan server |
| Konflik data | Perbarui tahapan, kartu, master | "Data telah berubah, muat ulang." dengan tombol muat ulang (NFR-10) |
| Peringatan tidak memblokir | batas revisi, jadwal ulang, jam lebih dari 8 per hari | Alert kuning, aksi tetap dapat dilanjutkan |

## 7. Validasi formulir

Validasi utama di server (NFR-01); UI menampilkan hasilnya dan boleh memvalidasi lebih awal untuk kenyamanan.
Galat tampil di bawah isian (`aria-describedby`, `aria-invalid="true"`) dan fokus pindah ke isian pertama yang
salah. Batas panjang, format tanggal dd/mm/yyyy, dan pesan mengikuti FSD (EC dan tabel field Screen Detail).
Catatan wajib berisi spasi saja dianggap kosong (EC-13-01.06).

## 8. Responsif

| Lebar | Perilaku |
|---|---|
| 1100 px dan lebih | Tata letak seperti mockup; maksimum lebar konten 1100 px |
| 641 sampai 1099 px | Kartu ringkasan membungkus; tabel dapat digulir mendatar |
| 640 px dan kurang | Satu kolom; filter ditumpuk; menu utama baris dapat digulir mendatar; tabel dapat digulir mendatar; Kanban satu papan per layar yang dapat digeser atau papan bertumpuk; Gantt dapat digulir mendatar dengan kolom nama tetap; dialog hampir selebar layar |
Target sentuh minimal 36 px (sebaiknya 44 px pada layar sentuh). Aplikasi tidak untuk aplikasi mobile native (di luar scope) tetapi tetap dapat dipakai di tablet.

## 9. Aksesibilitas (NFR-05)

- Operasi penuh dengan keyboard; urutan fokus mengikuti urutan baca; fokus terlihat jelas (kontur 2 px).
- Setiap kontrol formulir memiliki label terhubung; dialog memakai `aria-labelledby`; fokus dikembalikan ke pemicu saat dialog ditutup.
- Status **tidak hanya warna**: chip dan penanda selalu memiliki teks (Terlambat, Tertinggal, Ditahan, Baik, Kurang, Rendah).
- Kontras teks dan komponen minimal **WCAG 2.2 AA** (4,5:1 untuk teks, 3:1 untuk komponen) pada tema terang dan gelap; token mockup diperiksa saat tema MUI disetel.
- Pesan dinamis diumumkan (`role="alert"`/`aria-live`); daftar aturan password memakai `aria-live="polite"`.
- Gantt: setiap bar memiliki teks alternatif ringkas (project, tahapan, rentang, status), dan data yang sama tersedia pada tampilan Daftar; seret dan lepas Kanban selalu memiliki alternatif tombol panah (sudah pada mockup).
- Menghormati preferensi pengurangan gerak; tidak ada animasi yang wajib.

## 10. UX writing

Bahasa Indonesia; kalimat pendek dan langsung; pesan galat menyebut apa yang salah dan apa yang harus dilakukan;
istilah mengikuti FSD ("Jadwal ulang", "Assignment baru", "Perlu dilengkapi", "Estimasi diperpanjang lewat rencana");
tanggal dd/mm/yyyy; jam dengan satu desimal ("6,5 j"). Satu istilah untuk satu hal: "Tertinggal dari laju" (kartu
dan filter) dan "Tertinggal" (chip ringkas), "Terlambat n hari" (tahapan) dan "Terlambat n hr" (kartu) mengikuti FSD
agar uji dan layar identik. Penyeragaman teks akhir dikunci di `platform/messages.ts` dan dicocokkan QA.

## 11. Isu terbuka

| ID | Isu | Pemilik |
|---|---|---|
| UX-01 | Review pemilik atas layar baru (Login, Ubah Password, Master PIC, Header) pada mockup v0.3 | Pemilik |
| UX-02 | Penyetelan tema MUI dari token dan pemeriksaan kontras WCAG AA pada tema terang dan gelap | DEV bersama UX/UI saat irisan 0/1 (tema) |
| UX-03 | Rancangan akhir Gantt, Kanban, dan kapasitas di layar sempit (belum ada mockup layar telepon) | UX/UI, sebelum irisan 2 |
| UX-04 | Penyeragaman string label (Tertinggal, Terlambat n hari, dst.) | BA dan UX/UI, saat katalog pesan dibuat |
| UX-05 | Mekanisme "Terapkan" pada filter pilihan ganda (mockup memakai tombol; boleh langsung) | Pemilik atau UX/UI |

## 12. Traceability singkat

| FR | Layar | Bagian |
|---|---|---|
| FR-01-01 | Login | 5.1 |
| FR-01-02, FR-01-05 | Ubah Password, Password sementara | 5.2, 5.3 |
| FR-01-03, FR-01-04 | Header, menu pengguna, tanpa izin | 5.4 |
| FR-08-01, FR-01-06 | Master PIC | 5.3 |
| FR-02 s.d. FR-21 | Layar mockup v0.2 | bagian 3 (penyesuaian) |

## 13. Status

```yaml
status: draft
approved_by:
approved_at:
```

UX/UI Agent tidak menyetujui artifact desainnya sendiri (`.claude/agents/ux-ui.md`). Persetujuan oleh Human Approver.
