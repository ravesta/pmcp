# Implementation Log: PMCP

Catatan perkembangan implementasi di repository kode `ravesta/pmcp_app` (git tersendiri, CD-46) dan penyimpangan
atau penyempurnaan terhadap Technical Design. Bukan sumber kebenaran requirement; hanya riwayat DEV.

## Irisan 0: Fondasi (2026-10-28)

**Status: selesai dan lulus gerbang.** Belum di-commit (menunggu permintaan pemilik).

| Gerbang (Technical Design Lampiran A) | Hasil |
|---|---|
| Uji kalender lulus dengan contoh NFR-16 (hari ini = Rabu 28/10/2026) | **Lulus**: uji unit `shared` dan `platform` (hari kerja, selisih hari kalender, minggu, bulan, pembulatan, jam tetap, konfigurasi) memakai contoh NFR-16 dan angka AC FSD |
| Migrasi dapat dijalankan dan diulang | **Lulus pada PGlite**: lima migrasi diterapkan dari database kosong; 28 uji integrasi memverifikasi 22 tabel, data awal master, dan invarian kritis |
| `/api/health` | **Lulus**: respons `{status, service, version, today}` dengan `Cache-Control: no-store`; diperiksa pada server standalone |
| TypeScript strict, build produksi | **Lulus**: `tsc --noEmit` tanpa galat; `next build` menghasilkan artefak standalone |
| Konvensi kode (CD-160) dan arsitektur (TD-05, TD-06) otomatis | **Lulus**: uji `code-conventions` dan `architecture` berjalan di `npm test` |

Total: **87 uji** (59 unit termasuk uji arsitektur dan konvensi kode, 28 integrasi), semuanya lulus.

### Isi irisan 0

- Scaffold repository kode `pmcp_app` (Next.js 16, React 19, TypeScript 5.9 strict, Vitest 5, Zod 4, PGlite untuk uji skema).
- `src/shared`: `iso-date`, `calendar` (hari kerja, minggu, bulan), `rounding`, `clock` (jam sistem Asia/Jakarta dan jam tetap), `result` (hasil dan galat).
- `src/platform`: `config` (validasi lingkungan), `clock-provider`.
- `src/app`: layout, halaman awal sementara, `/api/health`.
- `prisma/migrations`: lima migrasi SQL (tipe dan sequence; akun dan master dengan data awal; project dan tahapan; kartu dan log dengan trigger tumpang tindih; jejak audit append-only).
- Uji: unit `shared` dan `platform`, arsitektur, konvensi komentar fungsi, integrasi skema.

### Verifikasi pada PostgreSQL sungguhan (2026-10-28, setelah pgAdmin lokal pemilik menyala)

- Server lokal: **PostgreSQL 16.2**, zona waktu server Asia/Bangkok (UTC+7, sama dengan Asia/Jakarta; tidak berpengaruh karena tanggal bisnis bertipe `DATE`, TD-04). User pengembangan adalah superuser.
- **28 uji skema lulus di PostgreSQL 16.2** pada database sementara yang dibuat dan dihapus otomatis (`tests/integration/_support/database.ts`); tidak ada database uji tersisa. PGlite hanya cadangan bila server tidak terjangkau.
- Database pengembangan **`pmcp_dev`** diisi lewat `npm run db:migrate` (`scripts/migrate.mjs`, idempoten, satu transaksi per migrasi, mencatat `schema_migration`): 22 tabel aplikasi, data awal master (aplikasi 7, kategori revisi 6, kategori activity 8, alasan jadwal ulang 6, step 18), tiga trigger penjaga. Dijalankan ulang: semua dilewati.
- Catatan: `DATABASE_URL` di `.env` menyebut database `pmcp`, sedangkan yang ada di server adalah `pmcp_dev`; pengecekan memakai `pmcp_dev` lewat override dan `.env` tidak diubah.

### Batasan yang diketahui

1. **Versi PostgreSQL server produksi belum diketahui** (jawaban infra ditunda, OI-01); CI wajib menjalankan uji yang sama pada versi yang dipakai infra.
2. **Klien database belum ada**: `prisma db pull` dan klien Prisma ditambahkan pada irisan 1 sesuai TD-16; ping database pada `/api/health` menyusul.
3. Prisma belum dipasang; migrasi berformat folder Prisma sehingga `prisma migrate deploy` dapat dipakai kelak.

### Penyelarasan layar dengan mockup v0.2 (2026-10-28)

Seluruh layar Project (Daftar, Gantt, Detail, Buat project, dialog Perbarui tahapan, dialog Ubah informasi) mengikuti
`ux-ui/mockup/mockup-eksplorasi-v0.2.html`: token warna dan font dari mockup, komponen reusable di `src/ui/components`
(Card, Section, ToneChip, FilterBar, PaginationBar, StatusStrip, dll.), dialog tahapan satu formulir dengan satu tombol
Simpan lewat use case atomik `updateStage` (planning, revisi, progres, status dalam satu transaksi). Catatan Kanban pada
Detail (Rencana kerja, Log activity) menunggu irisan 3. Uji: 306 uji hijau; alur e2e manual (Playwright) lulus tanpa
galat konsol.

### Tinjauan keamanan irisan 1 (2026-10-28)

Ditinjau: login, throttle, sesi, ganti dan reset password, cookie, aksi master, header. Sudah benar: hash argon2id
dengan verifikasi tiruan (waktu seragam), token 32 byte CSPRNG yang disimpan sebagai hash, cookie HttpOnly/SameSite/
`__Host-`, validasi sesi di server pada setiap permintaan, sesi dicabut saat ganti atau reset password, pesan login
generik, audit tanpa password.

| Temuan | Tindakan |
|---|---|
| Header keamanan (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy, no-store) belum ada | Diperbaiki: `platform/security-headers.ts` dipasang di `next.config.ts`, diuji |
| Server Action di belakang proxy tidak dibatasi asal | Diperbaiki: `serverActions.allowedOrigins` dari `APP_ORIGIN` |
| Sumber alamat tak diketahui berbagi satu penghitung IP, 20 salah login mengunci semua pengguna | Diperbaiki: tanpa alamat, hanya throttle per username |
| CSP memakai `'unsafe-inline'` untuk skrip dan gaya (Next.js dan Emotion), belum bernonce | Terbuka (risiko rendah): versi bernonce lewat `proxy.ts` dan cache Emotion bernonce, dijadwalkan sebelum rilis |
| Penghitung throttle dibaca lalu ditulis tanpa kunci, percobaan paralel dapat melewati batas sedikit | Terbuka (risiko rendah): ganti dengan upsert atomik `failures = failures + 1` sebelum rilis |

## Pemindahan repository kode (2026-10-28)

Kode dipisahkan dari repository dokumen ke `ravesta/pmcp_app` dengan riwayat commit utuh (`git subtree split` dari
`source/PMCP/`); akar repository baru sama dengan isi `source/PMCP/`. Folder `source/` dihapus dari repository dokumen.
Dokumen persetujuan (BRD, handover, arsip) tidak diubah dan masih menyebut `source/PMCP/` sebagai jalur lama.
Pekerjaan irisan 4 (Dashboard dan Riwayat) berjalan di cabang `irisan-4-wip` repository kode.

## Irisan 3: Kanban (2026-10-28)

Modul `kanban` (domain, application, infrastructure, `client.ts`) dan layar Kanban selesai: papan tiga kolom dengan
seret-lepas dan tombol panah, filter di URL, kepatuhan rencana, dialog Buat kartu (project dan activity) dengan pratinjau
revisi otomatis dan konfirmasi status project, dialog rincian kartu (progres, jadwal ulang, pembatalan, log), serta
bagian Rencana kerja dan Log activity pada Detail Project. Revisi estimasi otomatis (FR-13-05) berjalan satu transaksi
dengan kartu lewat `applyCardRevision` milik project; perpanjangan sehari oleh PIC yang sama digabung.

Temuan selama uji: INSERT kartu mengambil kunci bersama pada baris project (foreign key); dua pembuatan kartu serentak
pada tahapan yang sama saling menunggu kunci eksklusif dan terjadi deadlock. Diperbaiki dengan mengunci project dan
tahapan SEBELUM menyisipkan kartu (urutan TD §7.3), diuji dengan dua permintaan serentak.

| Hal | Tertulis | Implementasi | Alasan |
|---|---|---|---|
| Adapter sumber kartu bagi project | Adapter kanban (TD §5.2) | `createPrismaCardSource` dipindah ke `modules/kanban/infrastructure` | Menutup penyimpangan sementara irisan 2 |
| Tombol "+ Dadakan" pada papan | Satu tombol terpisah (mockup) | Tombol "+ Kartu activity" dan kotak centang "Pekerjaan dadakan" di dialog | Dadakan dapat berlaku untuk kartu project maupun activity (FR-21-01 butir 3) |
| Log pada kartu dibatalkan | Tidak diatur eksplisit untuk penghapusan | Penghapusan log pada kartu dibatalkan ditolak | Menjaga jam tercatat tetap utuh (FR-18-01 butir 8) |

Belum: kartu "Estimasi diperpanjang lewat rencana" dan pengarahan dari Dashboard (irisan 4).

## Irisan 4: Dashboard dan Riwayat (2026-10-28)

Modul baca `dashboard` (domain kapasitas, kualitas pencatatan, benturan jadwal; use case Head, PIC, Riwayat) dan layar
Dashboard Head, Dashboard PIC, serta menu Riwayat (Tahapan selesai dan Aktivitas harian) selesai di repository
`pmcp_app`, cabang `irisan-4-wip`. Angka kartu Head memakai tampilan project yang sama dengan Daftar dan Gantt dan
diuji sama dengan jumlah pada layar tujuan (NFR-14). Uji: 393 uji hijau; alur browser Manager dan PIC tanpa galat konsol.

| Hal | Tertulis | Implementasi | Alasan |
|---|---|---|---|
| Timeline proyek saya | Bar yang sama dengan Gantt | Garis waktu ringkas (batang proporsional dan penanda hari ini) | Cukup untuk membaca jadwal dan benturan; bar penuh ada di tab Project |
| Rincian jam kapasitas tabel Head | Rincian per hari atau minggu | Hanya ringkasan per PIC pada tabel Head; rincian pada Dashboard PIC | Sesuai FR-04-04 (tabel) dan FR-07-05 (rincian pribadi) |

### Penyempurnaan terhadap Technical Design (tidak mengubah keputusan)

| Hal | Tertulis di Technical Design | Implementasi | Alasan |
|---|---|---|---|
| Pembeda lingkungan | `CLOCK_OVERRIDE` ditolak bila `NODE_ENV=production` (§15) | Ditambah **`APP_ENV`** (`development`, `test`, `staging`, `production`); jam tetap ditolak hanya bila `APP_ENV=production`, atau `NODE_ENV=production` tanpa `APP_ENV` | Server build Next.js selalu `NODE_ENV=production`, sehingga staging tidak dapat memakai jam tetap. Diketahui saat pemeriksaan health di server standalone. Build produksi tanpa `APP_ENV` tetap dianggap produksi (sisi aman). Teruji pada `config.test.ts` |
| Perlindungan TRUNCATE jejak audit | REVOKE TRUNCATE bila dua peran tersedia (database-design §7) | Ditambah **trigger pernyataan `BEFORE TRUNCATE`** pada `audit_event` | Dua peran tidak tersedia (CD-175); TRUNCATE tidak lewat trigger baris. Teruji pada `migrations.test.ts` |

Penyempurnaan ini searah dengan Technical Design; `technical-design.md` dan `database-design.md` akan
diselaraskan lewat revisi minor berikutnya bila pemilik menghendaki.

## Irisan 2: Project dan tahapan (2026-10-28, sedang berjalan)

**Status: sebagian.** Lapisan domain dan sisi tulis selesai dan teruji; sisi baca (Daftar, Gantt, Detail) dan layar
belum. Belum di-commit (menunggu permintaan pemilik).

| Bagian | Status | Bukti |
|---|---|---|
| Domain project (progres tahapan, laju dan Tertinggal, keterlambatan, status tampilan, revisi estimasi, penggabungan revisi harian, peringatan revisi, hak tahapan, perpindahan status, validasi project, model bar Gantt) | Selesai | 75 uji unit baru memakai angka AC FSD (hari ini = Rabu 28/10/2026) |
| Use case tulis: `createProject`, `updateStagePlanning`, `updateStageStatus`, `setManualProgress`, `reviseStageEstimate`, `updateProjectInfo` | Selesai | 25 uji integrasi pada PostgreSQL 16 sungguhan (hak, validasi, konkurensi versi, audit, Assignment baru, riwayat hold) |
| Repository Prisma project, rujukan master, sumber kartu sementara | Selesai | Dipakai uji integrasi di atas |
| Query baca: `listProjects`, `getGantt`, `getProjectDetail`, `countProjectsByStatus`, Assignment baru | Belum | - |
| Layar: tab Project (Daftar dan Gantt), Buat project, Detail project, dialog Perbarui tahapan | Belum | Acuan desain: `ux-ui/mockup/` |
| `autoReviseFromCard` (FR-13-05, dipanggil kanban) | Menunggu irisan 3 | Aturan domainnya (`planAutoRevision`, `shouldMergeRevision`, `mergeRevisionNotes`) sudah ada dan teruji |

### Penyempurnaan terhadap Technical Design (tidak mengubah keputusan)

| Hal | Tertulis di Technical Design | Implementasi | Alasan |
|---|---|---|---|
| Pelaku yang memulai hold | `stage_hold_history.held_by` wajib terisi, tetapi `project_stage` tidak menyimpan pelaku hold berjalan | Migrasi 6 menambah kolom `project_stage.hold_by` dengan CHECK `(status = 'HELD') = (hold_by IS NOT NULL)` | Tanpa kolom ini, riwayat hold tidak dapat mencatat pelaku penahanan dengan benar (FR-13-02 butir 3). Uji skema hold diperbarui |
| Sumber kartu bagi project | `CardSourcePort` diimplementasikan adapter kanban (TD §5.2) | Sementara `createPrismaCardSource` di modul project membaca tabel `card` langsung | Modul kanban baru dibuat pada irisan 3; adapter diganti saat itu, port tidak berubah |

## Rencana berikutnya

Irisan 1 (akun dan master): klien database (Prisma `db pull`), auth (login, sesi, throttle, ganti dan reset
password), kebijakan otorisasi, audit, master, layar Master dan Jejak Perubahan. Prasyarat: handoff UX/UI untuk
layar Login, Ubah Password, dan Tambah PIC; keputusan versi pustaka hash setelah OS server diketahui (TDR-06).
Tinjauan keamanan kode sebelum irisan 2.
