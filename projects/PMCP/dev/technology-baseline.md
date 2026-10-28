# Technology Baseline: PMCP

| | |
|---|---|
| Project | PMCP (Project Monitoring & Capacity Planning System, BA & QA) |
| Versi | 1.0 |
| Tanggal | 2026-10-28 |
| Status | **APPROVED** (disetujui Pemilik 2026-10-28, CD-159), dengan butir terbuka: jawaban tim infra (§9.2) ditunda oleh pemilik |
| Disusun oleh | DEV Agent |
| Dasar | `ba/brd.md` v3.5 APPROVED, `ba/clarification-log.md` (CL-009, CL-049), `.claude/rules/developer-governance.md` §2 dan §10 |
| Perubahan dari v0.3 | Hanya status: v0.3 disetujui Pemilik tanpa perubahan isi menjadi v1.0 (CD-159). Perubahan material sesudah ini lewat Technology Change Proposal (developer-governance §3). |
| Perubahan dari v0.2 | Jawaban pemilik 2026-10-28 (CL-050): rekomendasi password/sesi (§8) dan MUI (§7) **disetujui**; akses hanya dari jaringan kantor; deploy manual sementara diizinkan; volume data belum ada. Target RPO 24 jam dan RTO satu hari kerja disetujui kemudian pada hari yang sama (§9.1). Daftar pertanyaan untuk tim infra dibuat di `dev/pertanyaan-tim-infra.md`. |
| Perubahan dari v0.1 | Hosting berubah dari Vercel menjadi **server lokal perusahaan** (CL-049, CD-155). Opsi serverless dan penyedia database terkelola dihapus. Ditambah rekomendasi kebijakan password dan sesi, pustaka UI, lingkungan dan CI/CD, serta daftar pertanyaan untuk tim infra. |
| Catatan | BRD v3.5 sudah APPROVED. Baseline dan BRD sudah disetujui; FSD belum ada dan kode belum dimulai (CD-154). Jawaban tim infra yang menunjukkan batasan yang bertentangan dengan baseline harus diproses lewat Technology Change Proposal, bukan diubah diam-diam. |

## 1. Context

Sistem web internal untuk tim BA dan QA di bawah satu Head (Manager): project dengan tiga
tahapan (BA, Development, QA), Gantt dan Dashboard, Kanban sebagai pelacak rencana kerja,
log aktivitas, kapasitas, dan Riwayat. Pengguna **kurang dari 20 orang** (CL-049), dengan tiga
peran akses (Manager, PIC BA, PIC QA) dan satu peran dicatat tanpa login (PIC Development).

Keputusan pemilik (CL-049, 2026-10-28): aplikasi dijalankan di **server lokal perusahaan** yang
dapat diakses tim pemilik; database PostgreSQL ada di server lokal; **Vercel tidak dipakai**.
Pengelolaan backup oleh tim infra perusahaan. CI/CD akan disediakan. Login username dan password
yang dibuat dan di-reset Manager (CL-005, CL-009).

## 2. Requirements yang memengaruhi teknologi

Dari BRD (rujukan, bukan salinan):

- Data relasional dengan jejak perubahan (BL-07, BL-10: tidak ada hapus permanen).
- Aturan bisnis dan hak akses di sisi server (RK-04, BL-29): PIC hanya mengelola kartu miliknya, Manager melihat semua.
- Filter, paging, dan agregat di server untuk Gantt, Daftar Project, dan Dashboard (BR-15).
- Tanggal tanpa pergeseran zona (BL-09): zona bisnis Asia/Jakarta, tampil dd/mm/yyyy, antarmuka bahasa Indonesia (CL-010).
- Aturan hitung yang dapat berubah lewat master (BR-08, BR-19, BL-33, BL-36).
- Antarmuka interaktif: Gantt, Kanban dengan seret dan lepas, dialog, filter berganda dengan pencarian, aksesibel dan responsif (mockup v0.2).
- Out-of-scope rilis ini: SSO, aplikasi mobile native, approval formal (BRD §3.3.2).

## 3. Constraints

- Deployment di server lokal perusahaan; tidak memakai Vercel atau layanan cloud terkelola (CL-049).
- Database PostgreSQL di server lokal (CL-049).
- Server, jaringan, dan backup dikelola tim infra perusahaan; CI/CD akan disediakan (CL-049). Detailnya belum diketahui DEV (§9).
- Autentikasi username dan password; akun dibuat dan di-reset Manager (CL-005, CL-009).
- Source code berada di `source/PMCP/`, bukan di dalam `projects/` (CLAUDE.md).
- Human-readable code dan secure coding wajib (developer-governance §9 dan Secure Coding).
- Skala: kurang dari 20 pengguna. Tidak ada kebutuhan skala horizontal yang dapat dibenarkan.
- Akses hanya dari jaringan kantor (CL-050); tidak ada akses publik atau VPN pada rilis ini. Aplikasi tidak dipublikasikan ke internet.

## 4. Architecture style

**Monolithic (modular monolith).** Alasan: satu domain, kurang dari 20 pengguna, satu tim pemilik,
tidak ada kebutuhan skala atau penerapan independen per modul (developer-governance §10:
kompleksitas harus dibenarkan kebutuhan nyata). Syarat tata kelola monolith dipenuhi dengan:

- batas modul jelas: Auth/Akun, Project dan Tahapan, Kanban dan Log, Kapasitas, Dashboard/Laporan baca, Master, Audit;
- arah dependensi eksplisit: antarmuka (route) → aplikasi (use case) → domain (aturan bisnis) → akses data; domain tidak mengimpor akses data atau framework;
- aturan bisnis (rumus progres, revisi estimasi, kepatuhan, kapasitas) berada di lapisan domain agar dapat diuji dan ditemukan manusia, bukan tersebar di komponen tampilan;
- data milik satu modul diakses modul lain lewat use case, bukan langsung ke tabelnya.

## 5. Candidate Options

### Option A: Next.js (full-stack) + TypeScript + PostgreSQL, dijalankan sebagai proses Node di server lokal
- stack: Next.js dan React, TypeScript, PostgreSQL, ORM (§6), dijalankan sebagai satu proses Node (build standalone) di belakang reverse proxy.
- strengths: satu codebase dan satu artefak deploy untuk antarmuka dan API; TypeScript memberi tipe dari data sampai tampilan; render server membantu filter dan paging di server (BR-15); proses berumur panjang sehingga koneksi database cukup dengan satu pool aplikasi (masalah serverless hilang); ekosistem luas.
- weaknesses: butuh runtime Node dan proses yang dijaga (service manager atau container) di server lokal; framework relatif besar untuk 20 pengguna; aturan bisnis harus sengaja dipisah dari framework.
- risks: versi Node dan Next.js harus dipelihara (patch keamanan) oleh tim pemilik dan infra.

### Option B: SPA (React) + API Node terpisah + PostgreSQL
- strengths: batas frontend dan backend tegas.
- weaknesses: dua proses dan dua kontrak yang dijaga, konfigurasi CORS dan sesi lintas origin; lebih berat daripada kebutuhan.
- risks: kompleksitas operasional lebih besar daripada nilai yang didapat untuk <20 pengguna.

### Option C: Aplikasi server-rendered dengan framework backend non-JavaScript
- strengths: runtime sederhana, kuat untuk CRUD dan aturan bisnis di server.
- weaknesses: Gantt dan Kanban interaktif tetap membutuhkan JavaScript di klien sehingga dua bahasa; tim pemilik dan infra belum menyatakan keahlian pada stack ini.
- risks: bergantung pada keahlian yang belum terkonfirmasi.

## 6. Recommended Option dan Technology Baseline (usulan)

**Option A.** Alasan utama yang tersisa setelah Vercel tidak dipakai: satu bahasa dan satu artefak
untuk seluruh sistem, tipe data end-to-end, dan render server untuk paging. Option B dan C
ditunda, bukan dibuang; dipertimbangkan kembali lewat Technology Change Proposal
(developer-governance §3) bila ada kebutuhan atau batasan infra yang tidak dapat dipenuhi Option A.

| Aspek | Usulan | Status keputusan |
|---|---|---|
| Architecture style | Modular monolith (§4) | Usulan |
| Frontend | Next.js dan React, TypeScript strict | Usulan |
| Backend | Server Actions dan Route Handlers Next.js sebagai lapisan antarmuka; use case dan domain di modul TypeScript terpisah | Usulan |
| Database | PostgreSQL di server lokal; satu instance; versi mayor yang masih didukung, ditentukan bersama tim infra | **Keputusan pemilik (CL-049)**; versi **TERBUKA** (§9) |
| Akses data | ORM bertipe dengan migrasi terversi (kandidat: Prisma; alternatif: Drizzle atau SQL langsung); kueri agregat berat boleh SQL langsung di modul akses data | Usulan; DEV merekomendasikan Prisma karena migrasi dan tipe mudah ditelusuri tim kecil |
| Koneksi database | Satu pool koneksi per proses aplikasi, ukuran kecil (skala <20 pengguna) | Usulan |
| Tipe data tanggal | Kolom DATE untuk tanggal bisnis, tanpa konversi zona; TIMESTAMPTZ hanya untuk jejak audit | Usulan (BL-09) |
| UI | **MUI (paket inti) dengan tema sendiri** dari token mockup v0.2; Gantt, Kanban, kotak kapasitas, dan garis waktu dibangun sendiri (§7) | **Disetujui pemilik 2026-10-28 (CL-050)**; detail akhir bersama UX/UI setelah FSD |
| Autentikasi dan sesi | Lihat §8 | **Disetujui pemilik 2026-10-28 (CL-050)** |
| Otorisasi | Dicek di server pada setiap use case (peran dan kepemilikan), bukan di antarmuka | Usulan |
| Validasi | Skema validasi di batas masuk (server), bukan hanya di formulir | Usulan |
| Respons | Allowlist field per endpoint; entitas database mentah tidak menjadi respons publik | Usulan |
| Logging | Log aplikasi ke stdout dalam format terstruktur, tanpa payload sensitif mentah (password, token); jejak perubahan bisnis di tabel audit (BL-07) | Usulan; pengumpulan log oleh infra **TERBUKA** |
| Integrasi | Tidak ada integrasi eksternal pada rilis ini | Usulan |
| Deployment | Proses Node sebagai service atau container di server lokal, di belakang reverse proxy dengan HTTPS (§9); rahasia lewat variabel lingkungan atau secret store yang disediakan infra, tidak di repo | Keputusan pemilik: server lokal; bentuk teknisnya **TERBUKA** |
| Lingkungan | Local (developer), **test/staging** di server lokal dengan database terpisah, dan **production** (§10) | Usulan |
| CI/CD | Disediakan perusahaan; tahapan yang DEV butuhkan di §10 | Keputusan pemilik: akan ada; alatnya **TERBUKA** |
| Backup | Oleh tim infra (CL-049); kebutuhan DEV di §10 | Keputusan pemilik; jadwal dan uji pemulihan **TERBUKA** |
| Pengujian | Unit untuk domain; integrasi untuk use case dan hak akses dengan PostgreSQL sungguhan; end-to-end untuk alur utama | Usulan |
| Bahasa dan format | Antarmuka bahasa Indonesia, tanggal dd/mm/yyyy, zona Asia/Jakarta (CL-010) | Dikonfirmasi pemilik |

## 7. Pustaka UI (disetujui pemilik, CL-050)

Kebutuhan komponen dari mockup v0.2: dialog, tab dan sub menu, tabel dengan pagination, chip dan
penanda status, dropdown pilihan ganda yang dapat dicari (filter nama project, PIC), pilihan
tunggal yang dapat dicari, kontrol segmen (Minggu/Bulan, Hari/Minggu), input tanggal, bar
progres, tema terang dan gelap, dan seluruhnya aksesibel serta responsif. Gantt, Kanban, kotak
kapasitas harian, dan garis waktu **tidak ada** di pustaka komponen umum mana pun yang gratis;
komponen itu dibangun sendiri apa pun pilihannya.

**Rekomendasi: MUI (paket inti, gratis) dengan tema sendiri.**
- Mencakup komponen standar di atas, termasuk Autocomplete pilihan ganda dengan pencarian, Dialog, Tabs, Table dan pagination, Chip, ToggleButtonGroup, dan dukungan tema terang/gelap berbasis token.
- Aksesibilitas bawaan, sehingga tim kecil tidak membangun ulang combobox dan dialog yang rawan cacat aksesibilitas.
- Tema disetel dari token mockup (warna status, jarak, radius) agar tampilan tidak menjadi tampilan Material bawaan.
- Hindari paket berbayar (mis. komponen MUI X tingkat Pro/Premium); input tanggal memakai paket komunitas atau input teks dd/mm/yyyy seperti mockup. Lisensi dicek saat dependensi dipasang.
- Kanban: seret dan lepas bawaan browser seperti mockup, ditambah tombol panah sebagai alternatif keyboard yang sudah ada; pustaka dnd khusus dievaluasi di Technical Design bila diperlukan.

**Alternatif:** komponen headless (mis. Radix UI atau React Aria) dengan CSS sendiri memberi kemiripan mockup paling persis, tetapi tim membangun lebih banyak komponen (terutama dropdown berganda dengan pencarian). Dipilih MUI karena kebutuhan terpenuhi dengan usaha lebih kecil; keputusan akhir bersama UX/UI setelah FSD.

## 8. Kebijakan password dan sesi (disetujui pemilik, CL-050)

Untuk aplikasi internal tanpa SSO dengan <20 pengguna. Mengikuti pedoman umum yang
mengutamakan panjang daripada aturan kompleksitas dan tidak mewajibkan penggantian berkala.
Pemilik menyetujui usulan ini pada 2026-10-28 (CL-050). Perubahan angka lewat keputusan tercatat.

| Aspek | Usulan |
|---|---|
| Panjang minimum | 12 karakter; tanpa aturan huruf besar/angka/simbol wajib; menolak password umum atau sama dengan username |
| Penyimpanan | Hash argon2id (atau bcrypt cost memadai); password tidak pernah disimpan atau dicatat dalam bentuk asli |
| Akun baru dan reset | Manager membuat akun dan reset; sistem membuat **password sementara yang tampil sekali**; PIC **wajib mengganti** saat masuk pertama; Manager tidak dapat melihat password yang sedang dipakai |
| Sesi | Cookie HttpOnly, Secure, SameSite; kedaluwarsa bila tidak aktif 2 jam dan maksimum 12 jam; reset password mengakhiri semua sesi akun itu |
| Percobaan gagal | Penundaan bertahap setelah 5 kali gagal berturut-turut (mis. 15 menit), tanpa mengunci permanen; pesan kesalahan tidak membedakan username salah atau password salah |
| Penggantian berkala | Tidak dipaksa; hanya bila ada indikasi kebocoran atau reset |
| Jejak | Login berhasil/gagal, ganti dan reset password dicatat di audit tanpa memuat password |
| HTTPS | Wajib agar cookie Secure bekerja; sertifikat dari infra (§9) |

## 9. Pertanyaan terbuka

### 9.1 Untuk pemilik
1. ~~Rekomendasi §7 dan §8~~ **Disetujui** (CL-050).
2. ~~Target pemulihan data~~ **Disetujui pemilik 2026-10-28 (CL-050):** RPO 24 jam (backup minimal harian) dan RTO satu hari kerja. Menjadi masukan bagi tim infra.
3. **Volume data: belum ada perkiraan** (CL-050). Tidak diasumsikan; desain tetap memakai paging dan agregat di server (BR-15), dan target performa ditetapkan di FSD bila angkanya sudah ada.
4. ~~Akses~~ **Hanya dari jaringan kantor** (CL-050).
5. ~~Deploy manual sementara~~ **Diizinkan** (CL-050), dengan persetujuan pemilik per rilis sampai pipeline CI/CD berjalan.

### 9.2 Untuk tim infra (belum diketahui DEV)
1. Sistem operasi server dan apakah runtime container tersedia (mis. Docker); bila tidak, cara menjalankan proses Node sebagai service.
2. Reverse proxy yang dipakai, nama domain internal, dan sertifikat HTTPS (CA internal atau lainnya).
3. PostgreSQL: versi, satu server dengan aplikasi atau terpisah, dan siapa pemilik akun database administrasi.
4. Alat CI/CD, runner, dan apakah bisa menyediakan PostgreSQL sementara untuk pengujian.
5. Pengelolaan rahasia (variabel lingkungan atau secret store) dan pengumpulan log.
6. Jadwal backup, lokasi penyimpanan, retensi, dan **uji pemulihan berkala**.
7. Ketersediaan: apakah satu server (tanpa cadangan siaga) dapat diterima oleh perusahaan untuk sistem ini.
8. Sinkronisasi waktu server (NTP) dan zona waktu server.

## 10. Lingkungan dan CI/CD (usulan, alat menyesuaikan infra)

- **Local:** developer, PostgreSQL lokal atau sementara.
- **Test/staging:** di server lokal, database terpisah dengan data contoh; dipakai CI untuk uji end-to-end dan pemilik untuk validasi sebelum production.
- **Production:** database dan konfigurasi terpisah.

Tahapan pipeline yang dibutuhkan: lint dan pemeriksaan tipe → uji unit dan integrasi (dengan PostgreSQL sementara) → build artefak bertanda versi → migrasi database ke staging → uji end-to-end → **gerbang persetujuan** → deploy production. Persetujuan production oleh pemilik atau yang ia tunjuk.

Kebutuhan DEV terhadap infra: migrasi database terversi dan **maju saja** (kompatibel mundur satu rilis); **backup sebelum migrasi production**; rollback dengan men-deploy ulang artefak versi sebelumnya; pemulihan database dari backup diuji berkala (tanggung jawab tim infra, CL-049).

## 11. Trade-offs

- **Satu codebase vs pemisahan frontend/backend:** Option A lebih sederhana dioperasikan, dengan syarat disiplin memisahkan domain dari framework.
- **Server lokal vs layanan terkelola:** kontrol data dan tidak ada biaya langganan, tetapi patch, ketersediaan, dan backup menjadi tanggung jawab perusahaan; satu server berarti satu titik kegagalan.
- **Membangun Gantt dan Kanban sendiri:** kontrol penuh terhadap perilaku yang sudah diputuskan pemilik (penanda revisi, estimasi awal vs aktual), dengan biaya pemeliharaan lebih tinggi daripada pustaka siap pakai.
- **MUI vs komponen sendiri:** MUI lebih cepat dan aksesibel, tetapi menambah dependensi besar dan perlu penyetelan tema agar sesuai mockup.
- **ORM:** produktivitas dan migrasi terversi, dengan biaya abstraksi.

## 12. Consequences

### Positive
- Satu artefak dan satu bahasa; operasi sederhana untuk <20 pengguna.
- Data tetap di lingkungan perusahaan; tidak ada ketergantungan pada vendor cloud.
- Aturan bisnis terpusat dan dapat diuji.

### Negative
- Perusahaan memelihara runtime, patch keamanan, dan ketersediaan server.
- Perlu disiplin arsitektur agar monolith tetap modular.
- Autentikasi buatan sendiri membawa tanggung jawab keamanan yang harus diuji dan diaudit.

## 13. Risks

| ID | Risiko | Mitigasi |
|---|---|---|
| TR-01 | Baseline dibuat sebelum BRD/FSD final; perubahan kebutuhan mengubah pilihan | Baseline versi DRAFT; perubahan material lewat Technology Change Proposal |
| TR-02 | Otorisasi hanya ada di antarmuka sehingga data bocor lewat API | Otorisasi di server pada semua use case; uji hak akses per peran |
| TR-03 | Salah hitung tanggal karena zona waktu | Kolom DATE tanpa konversi; uji batas hari dan akhir pekan |
| TR-04 | Penyimpanan password lemah atau reset tidak aman | Kebijakan §8, hash modern, sesi aman, tinjau secure coding |
| TR-05 | Satu server menjadi titik kegagalan tunggal | Pertanyaan ketersediaan ke infra (§9.2 butir 7); backup dan uji pemulihan |
| TR-06 | Backup ada di luar kendali tim aplikasi dan tidak pernah diuji pemulihannya | Tanggung jawab infra tercatat (CL-049); uji pemulihan berkala diminta eksplisit |
| TR-07 | HTTPS tidak tersedia sehingga cookie Secure tidak dapat dipakai | Pertanyaan ke infra (§9.2 butir 2); tanpa HTTPS, sesi dan password tidak boleh dilayani |
| TR-08 | CI/CD belum siap saat server siap | Deploy manual diizinkan sementara dengan persetujuan pemilik per rilis (CL-050); prosedur manual dicatat dan diganti pipeline begitu tersedia |
| TR-09 | Patch Node, Next.js, dan PostgreSQL tertinggal | Pembaruan dependensi terjadwal lewat CI; pembagian tanggung jawab dengan infra |

## 14. Hal yang sengaja belum diputuskan

Skema database, kontrak API, struktur folder source, dan tata letak komponen. Itu menjadi bagian
Technical Design setelah BRD, FSD, dan baseline ini disetujui (developer-governance §5: Requirement
→ Impact Analysis → Architecture Decision → Implementation Plan → Coding).

## 15. Approval

```yaml
status: approved
approved_by: Pemilik (Head of Business Analyst, Human Approver)
approved_at: 2026-10-28
ref: CD-159
open_items: jawaban tim infra (§9.2) ditunda oleh pemilik
```

Agent tidak menyetujui artifact buatannya sendiri. Persetujuan diberikan oleh Human Approver (pemilik) pada 2026-10-28.
