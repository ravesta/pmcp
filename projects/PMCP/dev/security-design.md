# Security Design: PMCP

| | |
|---|---|
| Project | PMCP |
| Versi | 1.0 |
| Tanggal | 2026-10-28 |
| Status | **APPROVED** (disetujui Pemilik 2026-10-28, CD-176) |
| Disusun oleh | DEV Agent |
| Dasar | `ba/fsd.md` v1.1 (FR-01-xx, NFR-01, NFR-02, NFR-04, NFR-13, NFR-15), `dev/technology-baseline.md` v1.0 §8, `.claude/rules/developer-governance.md` (Secure Coding), `.claude/skills/developer/secure-coding/SKILL.md` |

## 1. Lingkup dan aset

Aplikasi internal, kurang dari 20 pengguna, hanya dari jaringan kantor (CL-050), akun dikelola aplikasi
sendiri (tanpa SSO), server dan database lokal.

| Aset | Kepentingan | Catatan |
|---|---|---|
| Kredensial (hash password, token sesi) | tinggi | akses ke semua data dan aksi pengguna |
| Data kerja (project, tahapan, kartu, log) | sedang | rencana dan aktivitas tim; log PIC bersifat pribadi per hari |
| Jejak audit | sedang | bukti perubahan; harus tidak dapat diubah (BL-07) |
| Konfigurasi master dan akun | sedang | memengaruhi seluruh pengguna |

**Klasifikasi data: *Internal*** (disetujui pemilik, BRD v4.1 §5, CR-003, CD-175). Tidak ada data pribadi sensitif,
finansial, atau data nasabah; yang tersimpan adalah nama PIC, username, hash password, dan data kerja.
Perlakuan: akses hanya pengguna ber-akun, transport HTTPS, backup oleh infra,
tanpa data sensitif pada log.

## 2. Alur keamanan bawaan (Secure Coding)

```text
Input klien (tidak tepercaya)
 -> HTTPS (reverse proxy)
 -> sesi valid (requireSession)            [autentikasi]
 -> kebijakan hak akses + kepemilikan      [otorisasi, di server]
 -> validasi skema (allowlist, panjang)    [validasi]
 -> aturan bisnis di domain                [penegakan aturan di server]
 -> transaksi + audit                      [pemrosesan terkendali]
 -> view model allowlist                   [respons]
 -> log dengan redaksi                     [pencatatan aman]
```

Bidang yang ditentukan klien tidak pernah menjadi otoritas untuk peran, kepemilikan, status, atau
waktu: peran dan `picId` berasal dari sesi di server; "pemilik kartu" dibaca dari database; waktu dari
`Clock` server.

## 3. Model ancaman ringkas

| Ancaman | Contoh | Kontrol |
|---|---|---|
| **Spoofing** | menebak atau memaksa password; mencuri token sesi | password 12 sampai 128 + daftar password umum; argon2id; throttle per username dan per sumber; cookie `HttpOnly`/`Secure`/`SameSite`; token acak 256 bit disimpan sebagai hash; HTTPS wajib |
| **Tampering** | mengubah kartu atau log milik PIC lain (IDOR); mengirim `role` atau `ownerId` palsu; mengubah jejak audit | otorisasi objek (kepemilikan dibaca dari DB) pada setiap use case; allowlist input; peran dari sesi; `audit_event` append-only (hak dan trigger) |
| **Repudiation** | menyangkal perubahan | audit dalam transaksi yang sama: pelaku, waktu server, nilai lama dan baru; login dan akses ditolak tercatat |
| **Information disclosure** | pesan galat membocorkan username atau SQL; data berlebih di respons; password di log | pesan login generik dan sama untuk username tak dikenal; view model allowlist; redaksi log; tidak ada stack ke pengguna |
| **Denial of service** | mengunci akun orang lain lewat salah password berulang; kueri berat | throttle per username **dan** per sumber (penundaan sementara, bukan penguncian permanen); paging di server; batas ukuran input |
| **Elevation of privilege** | PIC memakai aksi Manager; melewati hak lewat permintaan langsung; mengandalkan middleware | kebijakan terpusat dicek di setiap use case, **bukan** di middleware atau UI; uji kontrak per peran |
| **Rantai pasok** | dependensi rentan | kunci versi (lockfile), audit dependensi di CI, pembaruan terjadwal |

## 4. Autentikasi

### 4.1 Kebijakan password (disetujui pemilik, Technology Baseline §8, FR-01-02)

12 sampai 128 karakter; tanpa aturan kompleksitas; ditolak bila sama dengan username, sama dengan
password saat ini, atau termasuk daftar password umum (daftar dibundel, sumber dan pembaruan ditetapkan
saat implementasi irisan 1). Tidak ada penggantian berkala paksa.

### 4.2 Penyimpanan

argon2id; parameter awal pada atau di atas minimum rekomendasi OWASP (mis. memori 19 MiB, 2 iterasi,
paralelisme 1) lalu disetel pada server sasaran hingga satu verifikasi memakan waktu yang wajar (puluhan
sampai sekitar ratusan milidetik); parameter disimpan di dalam string hash sehingga dapat dinaikkan
kemudian (rehash saat login berhasil). Pustaka dipilih dengan biner prabangun untuk OS server (TDR-06);
bcrypt dengan biaya memadai adalah cadangan yang diizinkan baseline.

### 4.3 Alur login (FR-01-01)

```text
login(username, password)
 1. normalisasi username (huruf kecil, trim)
 2. throttleDecision(USER=username, IP=sumber)  -> bila terkunci: tolak dengan pesan penundaan yang sama
                                                    untuk username dikenal maupun tidak dikenal
 3. ambil akun; bila tidak ada atau nonaktif: tetap lakukan satu verifikasi hash terhadap hash tiruan
    (waktu seragam) lalu hitung kegagalan; pesan generik "Username atau password salah."
 4. verifikasi password; gagal -> tambah penghitung USER dan IP; ke-5 berturut-turut -> locked_until = +15 menit
 5. sukses -> reset penghitung USER; buat sesi baru (token baru, sesi lama tidak dipakai ulang);
    bila must_change_password -> arahkan ke Ubah Password; catat audit (SECURITY)
```

Kegagalan dan keberhasilan dicatat di audit tanpa password; untuk username tidak dikenal, **nilai yang
diketik tidak dicatat** (hanya waktu dan sumber) karena pengguna dapat salah mengetik password di kolom
username (CL-056d). Ambang per sumber (usulan awal 20 kegagalan per 15 menit) dapat diatur lewat
konfigurasi; alamat sumber hanya dipercaya dari header proxy yang dikonfigurasi (`TRUSTED_PROXY_COUNT`).

### 4.4 Password sementara dan reset (FR-01-05, FR-08-01)

- Dibuat acak dengan CSPRNG (minimal 16 karakter, memenuhi kebijakan), **ditampilkan sekali** pada respons aksi dengan `Cache-Control: no-store`, tidak pernah ditaruh di URL, log, atau audit; yang tersimpan hanya hash dan penanda `must_change_password`.
- Reset mengakhiri semua sesi akun itu (`revoked_at`) dan menghapus penundaan login.
- Manager tidak dapat melihat password yang sedang dipakai.
- Ganti password sendiri: verifikasi password saat ini (kegagalan memakai penghitung login yang sama), kebijakan 4.1, mengakhiri sesi lain akun itu, sesi sekarang berlanjut.

### 4.5 Akun Manager awal dan pemulihan (FR-01-06)

`scripts/bootstrap-manager` dijalankan operator di server: membuat satu akun Manager dengan password
sementara (wajib ganti saat login pertama); menolak bila akun Manager aktif sudah ada kecuali mode
`--reset` (pemulihan darurat atas permintaan tertulis pemilik). Skrip menulis peristiwa audit kategori
Keamanan dengan identitas operator sistem operasi, tidak menerima password dari argumen baris perintah
(dibaca interaktif atau dihasilkan), dan tidak menulis password ke log.

## 5. Sesi

| Aspek | Keputusan |
|---|---|
| Token | 32 byte acak (CSPRNG), dikodekan base64url; hanya hash SHA-256 yang disimpan di tabel `session` |
| Cookie | nama `__Host-pmcp_session` (mensyaratkan `Secure`, `Path=/`, tanpa `Domain`), `HttpOnly`, `Secure`, `SameSite=Lax`, tanpa `Max-Age` bila memungkinkan |
| Masa berlaku | idle 2 jam (`last_seen_at`), maksimum 12 jam sejak login (`expires_at`); konfigurasi `SESSION_IDLE_MINUTES`, `SESSION_ABSOLUTE_MINUTES` |
| Pencabutan | keluar, ganti password, reset, nonaktif akun mencabut sesi terkait; sesi yang dicabut atau kedaluwarsa menolak permintaan berikutnya (FR-01-01 butir 5) |
| Validasi | dilakukan di server pada setiap permintaan data lewat `requireSession`; middleware hanya mengarahkan permintaan tanpa cookie ke login dan **tidak menjadi kontrol otorisasi** |
| Pembersihan | sesi kedaluwarsa dihapus berkala (skrip dan saat login) |

## 6. Otorisasi (FR-01-04, NFR-13)

Satu modul kebijakan (`auth/domain/policy`) berisi fungsi murni per aksi. Setiap use case memanggilnya
sebelum membaca atau menulis data. Kepemilikan dibaca dari database (bukan dari input).

| Aksi | Manager | PIC | Aturan kebijakan |
|---|---|---|---|
| Lihat Dashboard, Project, Gantt, Detail, Kanban | ya | ya | sesi valid; Dashboard sesuai peran |
| Buat project | ya | tidak | `role = MANAGER` |
| Ubah informasi project | ya | ya | `role IN (MANAGER, PIC)` |
| Lengkapi PIC/timeline tahapan kosong | ya | ya | bagian kosong saja untuk PIC bukan pemilik tahapan |
| Ubah PIC, estimasi, revisi, status, hold, progres tahapan | ya | hanya PIC tahapan itu | `MANAGER` atau `picId ∈ penugasan tahapan`; tahapan DEV hanya Manager |
| Buka kembali tahapan Selesai | ya (catatan wajib) | tidak | `MANAGER` |
| Kelola Master, lihat Jejak Perubahan | ya | tidak | `MANAGER` |
| Reset password, nonaktifkan PIC | ya | tidak | `MANAGER` |
| Buat, pindah, jadwal ulang, batalkan kartu; catat dan hapus log | tidak | hanya pemilik | `PIC` dan `card.owner_pic_id = actor.picId`, kartu tidak dibatalkan |
| Lihat kartu semua PIC, log di detail project | ya | ya | baca saja untuk bukan pemilik (CR-001) |
| Riwayat (tahapan selesai, aktivitas harian) | semua PIC, pilih PIC | hanya milik sendiri | filter `picId` dipaksa di server untuk PIC (NFR-15) |
| Ganti password sendiri, keluar | ya | ya | sesi valid |

Penolakan menghasilkan `FORBIDDEN` dengan pesan FSD dan dicatat sebagai peristiwa Keamanan (FR-01-04
butir 4). Uji kontrak otorisasi dibuat data-driven dari tabel ini untuk setiap Server Action.

## 7. Validasi dan allowlist

- Setiap use case mendefinisikan skema input (zod) dengan **hanya** field yang diizinkan, batas panjang dan format dari FSD (mis. nama project 100, catatan 300, username `^[a-z0-9._-]{4,30}$`); field tak dikenal ditolak atau dibuang, sehingga tidak ada mass assignment.
- Input teks bebas dianggap data, tidak pernah dirakit menjadi SQL (Prisma terparameter; SQL mentah hanya dengan parameter terikat) atau HTML.
- Respons memakai view model eksplisit; tidak ada entitas basis data atau `password_hash` yang keluar dari lapisan application (NFR-01).
- Catatan wajib berisi spasi saja dianggap kosong (EC-13-01.06).

## 8. Perlindungan sisi klien dan header

- **XSS:** React meng-escape keluaran secara bawaan; dilarang `dangerouslySetInnerHTML` untuk teks pengguna; teks bebas ditampilkan sebagai teks.
- **CSRF:** Server Action memeriksa `Origin` terhadap `Host` (dan `APP_ORIGIN` terkonfigurasi di belakang proxy) ditambah `SameSite=Lax`; tidak ada mutasi lewat GET.
- **Header** (diatur aplikasi dan/atau proxy): `Content-Security-Policy` ketat (default `'self'`, nonce untuk skrip, `frame-ancestors 'none'`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `Permissions-Policy` minimal, dan `Cache-Control: no-store` pada halaman dan respons ber-sesi. Detail CSP dengan MUI/Emotion diuji pada irisan 0.
- **Transport:** hanya HTTPS; aplikasi menolak melayani login tanpa HTTPS di produksi (Technology Baseline TR-07); sertifikat dari infra.

## 9. Rahasia dan konfigurasi

Rahasia (kata sandi database, kunci apa pun) hanya lewat variabel lingkungan atau secret store infra,
tidak pernah di repository, log, atau artefak build. Satu peran database aplikasi
(`pmcp_app`; dua peran tidak tersedia, CD-175; database-design §9). Perlindungan jejak audit: trigger penolak
`UPDATE`/`DELETE`, kode aplikasi tidak pernah menerbitkannya (diuji), dan pemeriksaan integritas skema saat
proses mulai. `CLOCK_OVERRIDE` ditolak bila `NODE_ENV=production`.

## 10. Logging dan audit

- **Log aplikasi** (JSON ke stdout): ID korelasi, rute, status, durasi; redaksi bidang `password`, `token`, `authorization`, `cookie`, dan nilai isian bebas; payload permintaan tidak dicatat mentah (NFR-01).
- **Jejak audit bisnis** (`audit_event`): lihat database-design §7; tidak memuat password atau token; tidak dapat diubah atau dihapus pengguna maupun peran aplikasi.
- Kejadian Keamanan yang dicatat: login berhasil dan gagal, penundaan, akses ditolak, ganti dan reset password, nonaktif dan aktif akun, reset darurat Manager.

## 11. Rantai pasok dan dependensi

Versi dikunci lewat lockfile; `npm audit` (atau setara) dan pembaruan keamanan terjadwal di CI; dependensi
ditambah hanya bila perlu (Technology Baseline §7: Gantt dan Kanban dibangun sendiri); lisensi diperiksa saat
dipasang (khususnya paket MUI). Runtime Node, Next.js, dan PostgreSQL dijaga pada versi yang masih
mendapat patch keamanan; tanggung jawab patch sistem dibagi dengan infra (TR-09).

## 12. Pengujian keamanan

| Kontrol | Pengujian |
|---|---|
| Throttle | 5 gagal berturut-turut menunda 15 menit; pesan sama untuk username tak dikenal; reset hitungan saat berhasil; per sumber |
| Sesi | idle 2 jam dan maksimum 12 jam menolak; ganti dan reset password mencabut sesi lain; cookie flag benar |
| Otorisasi | tabel §6 per Server Action untuk Manager, PIC pemilik, PIC lain, tanpa sesi; percobaan mengubah `id` kartu orang lain ditolak |
| Allowlist | field ekstra pada permintaan tidak berpengaruh; tidak ada `password_hash` pada respons |
| Audit | UPDATE atau DELETE pada `audit_event` ditolak trigger; kode aplikasi tidak memuat UPDATE/DELETE pada tabel itu (uji statis); proses menolak start bila trigger audit hilang; setiap mutasi menghasilkan satu peristiwa |
| Enumerasi | waktu dan pesan login tak dikenal vs password salah tidak dapat dibedakan secara berarti |
| CSRF dan header | permintaan Server Action lintas origin ditolak; header keamanan ada |
| Password | 11 dan 129 karakter ditolak; password umum, username, dan password lama ditolak |

Tinjauan keamanan kode dilakukan sebelum irisan 2 dimulai (Technical Design Lampiran A, irisan 1).

## 13. Risiko tersisa dan keputusan terbuka

| ID | Risiko atau keputusan | Perlakuan |
|---|---|---|
| SR-01 | Akun Manager tunggal; kehilangan akses perlu prosedur darurat dan intervensi operator | Skrip terkontrol (4.5); diterima pemilik (CL-055) |
| SR-02 | Klasifikasi data | **Ditutup**: *Internal*, disetujui pemilik (CR-003, CD-175) |
| SR-03 | HTTPS dan proxy belum diketahui (infra) | Wajib sebelum login dilayani; pertanyaan B3 |
| SR-04 | Pustaka hash native pada OS server belum diketahui | Pilih biner prabangun atau bcrypt (TDR-06) |
| SR-05 | Sumber daftar password umum belum dipilih | Dipilih di irisan 1 |
| SR-06 | Satu peran database: pemilik skema dapat menonaktifkan trigger audit lewat DDL | Diterima; aplikasi tidak menjalankan DDL di luar migrasi rilis, pemeriksaan skema saat start, kredensial terbatas pada infra dan aplikasi; `REVOKE` ditambahkan bila dua peran tersedia |

## 14. Status

```yaml
status: approved
version: 1.0
approved_by: Pemilik (Head of Business Analyst, Human Approver)
approved_at: 2026-10-28
ref: CD-176
```
