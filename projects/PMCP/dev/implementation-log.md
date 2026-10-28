# Implementation Log: PMCP

Catatan perkembangan implementasi di `source/PMCP/` (repository git tersendiri, CD-46) dan penyimpangan
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

- Scaffold `source/PMCP/` (Next.js 16, React 19, TypeScript 5.9 strict, Vitest 5, Zod 4, PGlite untuk uji skema).
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

### Penyempurnaan terhadap Technical Design (tidak mengubah keputusan)

| Hal | Tertulis di Technical Design | Implementasi | Alasan |
|---|---|---|---|
| Pembeda lingkungan | `CLOCK_OVERRIDE` ditolak bila `NODE_ENV=production` (§15) | Ditambah **`APP_ENV`** (`development`, `test`, `staging`, `production`); jam tetap ditolak hanya bila `APP_ENV=production`, atau `NODE_ENV=production` tanpa `APP_ENV` | Server build Next.js selalu `NODE_ENV=production`, sehingga staging tidak dapat memakai jam tetap. Diketahui saat pemeriksaan health di server standalone. Build produksi tanpa `APP_ENV` tetap dianggap produksi (sisi aman). Teruji pada `config.test.ts` |
| Perlindungan TRUNCATE jejak audit | REVOKE TRUNCATE bila dua peran tersedia (database-design §7) | Ditambah **trigger pernyataan `BEFORE TRUNCATE`** pada `audit_event` | Dua peran tidak tersedia (CD-175); TRUNCATE tidak lewat trigger baris. Teruji pada `migrations.test.ts` |

Penyempurnaan ini searah dengan Technical Design; `technical-design.md` dan `database-design.md` akan
diselaraskan lewat revisi minor berikutnya bila pemilik menghendaki.

## Rencana berikutnya

Irisan 1 (akun dan master): klien database (Prisma `db pull`), auth (login, sesi, throttle, ganti dan reset
password), kebijakan otorisasi, audit, master, layar Master dan Jejak Perubahan. Prasyarat: handoff UX/UI untuk
layar Login, Ubah Password, dan Tambah PIC; keputusan versi pustaka hash setelah OS server diketahui (TDR-06).
Tinjauan keamanan kode sebelum irisan 2.
