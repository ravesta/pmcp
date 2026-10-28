# Technical Design: PMCP

| | |
|---|---|
| Project | PMCP (Project Monitoring & Capacity Planning System, BA & QA) |
| Versi | 1.0 |
| Tanggal | 2026-10-28 |
| Status | **APPROVED** (disetujui Pemilik 2026-10-28, CD-176; baseline teknis) |
| Disusun oleh | DEV Agent |
| Dasar | `ba/fsd.md` v1.1 APPROVED, `ba/brd.md` v4.1 APPROVED, `dev/technology-baseline.md` v1.0 APPROVED, `dev/documentation-plan.md` |
| Dokumen pendamping | `dev/database-design.md`, `dev/security-design.md` |
| Perubahan dari v0.2 | Hanya status: disetujui Pemilik tanpa perubahan isi menjadi v1.0 (CD-176). Ditambah TD-16 (basis data lebih dulu) saat irisan 0 dimulai |
| Perubahan dari v0.1 | Keputusan pemilik 2026-10-28 (CD-175): ekstensi PostgreSQL `btree_gist` **tidak diizinkan** dan dua peran database tidak tersedia, sehingga constraint tumpang tindih log diganti trigger penjaga (TD-15) dan jejak audit dilindungi trigger dengan satu peran aplikasi; klasifikasi data **Internal** disetujui (CR-003, BRD v4.1); data acuan uji performa disetujui (CL-057) |
| Alur kerja | Requirement → Impact Analysis (documentation-plan) → Architecture Decision (Technology Baseline §4 sampai §6, diperinci di §5 dan §6 di bawah) → **Technical Design (dokumen ini)** → Implementation Plan (Lampiran A) → Coding |

Aturan penulisan kode (CD-160, NFR-09): mudah dibaca dan dipelihara, dan **setiap fungsi diberi
komentar** (tujuan, masukan dan keluaran utama, efek samping, ID FR/BL). Konvensi komentar ada di
Lampiran B.

## 1. Context

PMCP adalah aplikasi web internal untuk memantau project dan tiga tahapannya (BA, Development, QA),
mengelola rencana kerja lewat Kanban, mencatat log aktivitas, dan menampilkan dashboard Head dan PIC
beserta kapasitas dan riwayat. Pengguna kurang dari 20 orang, hanya dari jaringan kantor, dijalankan
di server lokal dengan PostgreSQL (CL-049, CL-050). FSD mendefinisikan 64 FR, 16 NFR, 158 edge case,
dan 25 layar.

## 2. Scope

**Termasuk:** seluruh FR dan NFR FSD v1.1; struktur kode `source/PMCP/`; skema database; use case;
kontrol keamanan di server; pendekatan uji dan rilis.

**Tidak termasuk:** desain visual akhir dan layar Login, Ubah Password, Tambah PIC (handoff UX/UI);
detail infrastruktur dan CI/CD (menunggu tim infra, ditunda pemilik); cuti dan libur nasional pada
kapasitas, laporan dan ekspor, approval formal (ditunda ke fase berikut, BRD §3.3.3).

## 3. Requirement Traceability

Satu use case atau query dimiliki satu modul (nama modul: §6). Nama use case memakai kata kerja
bahasa Inggris pada kode; ID FR dicantumkan pada komentar fungsi (Lampiran B).

| FR | Modul | Use case / query / komponen domain | Tabel utama |
|---|---|---|---|
| FR-01-01 | auth | `login`, `LoginThrottle` | app_user, session, login_throttle |
| FR-01-02 | auth | `changeOwnPassword`, `validatePassword` | app_user, session |
| FR-01-03 | auth | `logout` | session |
| FR-01-04 | auth | `requireSession`, `policy` (otorisasi) | app_user, session |
| FR-01-05 | auth | `issueTemporaryPassword` (dipanggil `createPic`, `resetPicPassword`) | app_user, session |
| FR-01-06 | auth | skrip `bootstrap-manager` (CLI, bukan layar) | app_user |
| FR-02-01 | project | `createProject` | project, project_stage, project_application |
| FR-02-02 | project | bagian `createProject` (PIC dan estimasi awal) | project_stage, stage_assignment |
| FR-03-01 | project | `updateStagePlanning` | project_stage, stage_assignment, stage_revision |
| FR-04-01 | dashboard | `getHeadDashboard` (kartu ringkasan) | project_stage, card |
| FR-04-02 | dashboard | `getHeadDashboard` (risiko) | project_stage, stage_revision |
| FR-04-03 | dashboard | `getHeadDashboard` (jatuh tempo) | project_stage |
| FR-04-04 | dashboard | `getHeadDashboard` + `computeCapacity` | card, work_log |
| FR-04-05 | dashboard | `getHeadDashboard` (per peran) | project_stage, card |
| FR-04-06 | dashboard | `getHeadDashboard` (pencatatan) + `computeCompliance` | work_log, card |
| FR-05-01 | project | `updateStageStatus`, `reopenStage` | project_stage, stage_hold_history |
| FR-05-02 | project | `stageProgress` (domain), `setManualProgress` | project_stage, card |
| FR-06-01 | project | `policy` (hak ubah Development hanya Manager) | project_stage |
| FR-07-01 | dashboard | `getPicDashboard` (kartu ringkasan) | semua pembaca |
| FR-07-02 | project | `listNewAssignments`, `markAssignmentsSeen` (dipicu `getProjectDetail`) | stage_assignment |
| FR-07-03 | dashboard | `getPicDashboard` (antrean) | project_stage, card |
| FR-07-04 | dashboard | `getPicDashboard` (timeline, `detectClashes`) | project_stage |
| FR-07-05 | dashboard | `computeCapacity` (domain), `getPicDashboard` | card, work_log |
| FR-07-06 | dashboard | `getPicDashboard` (ringkasan aktivitas) | card |
| FR-07-07 | dashboard | `getPicDashboard` (ringkasan riwayat) | project_stage, card |
| FR-07-08 | history | `listCompletedStages` | project_stage, card, work_log |
| FR-07-09 | history | `getDailyActivity` | work_log, card |
| FR-08-01 | master | `createPic`, `renamePic`, `setPicActive`, `resetPicPassword` | pic, app_user, stage_assignment |
| FR-08-02 | master | `masterList` generik: aplikasi | affected_application |
| FR-08-03 | master | master kategori alasan revisi dan `setRevisionWarnThreshold` | revision_category, app_setting |
| FR-08-04 | master | master kategori activity | activity_category |
| FR-08-05 | master | master alasan jadwal ulang dan `setRescheduleWarnThreshold` | reschedule_reason, app_setting |
| FR-08-06 | (UI) | navigasi sub menu Master | - |
| FR-09-01 | audit | `listAuditEvents`; penulisan oleh `recordAudit` dari semua use case | audit_event |
| FR-10-01 | project | `listProjects` | project, project_stage |
| FR-10-02 | project | model filter URL bersama (`ProjectFilter`) | - |
| FR-11-01 | project | `getProjectDetail` | project, project_stage, stage_revision, stage_hold_history, audit_event |
| FR-11-02 | project | `updateProjectInfo` | project, project_application |
| FR-12-01 | project | `getGantt` | project, project_stage |
| FR-12-02 | project | `ganttBarModel` (domain presentasi) | project_stage, stage_revision, stage_hold_history |
| FR-12-03 | project | bagian `getGantt` (filter PIC menyaring project) | project_stage, stage_assignment |
| FR-13-01 | project | `reviseStageEstimate` | stage_revision, project_stage |
| FR-13-02 | project | bagian `updateStageStatus` (hold) | stage_hold_history |
| FR-13-03 | project | `stageLateness` (domain) | project_stage |
| FR-13-04 | project | `revisionWarning` (domain) | stage_revision, app_setting |
| FR-13-05 | project | `autoReviseFromCard` (dipanggil modul kanban lewat port) | stage_revision, project_stage |
| FR-14-01 | project | bagian `updateProjectInfo` (status project) | project |
| FR-14-02 | project | `countProjectsByStatus` | project |
| FR-15-01 | project, audit | kontrak paging dan agregat di repository (§13) | semua tabel berdaftar |
| FR-16-01 | kanban | `getBoard` | card |
| FR-16-02 | kanban | `moveCard` | card, card_progress_event |
| FR-16-03 | kanban | `setCardProgress` | card, card_progress_event |
| FR-17-01 | kanban | `createProjectCard` | card |
| FR-17-02 | kanban | bagian `createProjectCard` (konfirmasi status project, memanggil port project) | project |
| FR-17-03 | kanban | `cardViewModel` | card |
| FR-18-01 | kanban | `addWorkLog`, `deleteWorkLog` | work_log |
| FR-19-01 | master | master step tahapan | stage_step |
| FR-20-01 | kanban | `listProjectWorkLogs` | work_log |
| FR-20-02 | kanban | `listProjectPlans` | card |
| FR-21-01 | kanban | `createActivityCard` | card |
| FR-21-02 | kanban | `cardPlanFlags` (domain) | card, card_reschedule |
| FR-21-03 | kanban | `rescheduleCard` | card, card_reschedule |
| FR-21-04 | kanban | `cancelCard` | card |
| FR-21-05 | kanban | `computeCompliance` (domain), `getCompliance` | card |

NFR dipetakan pada §4, §11, §13, §14. Seluruh 64 FR memiliki baris pada tabel ini.

## 4. Technical Objective

1. Mengimplementasikan FSD v1.1 tanpa mengubah aturan bisnis; aturan hitung berada di lapisan domain murni sehingga dapat diuji dan ditemukan lewat ID FR/BL (NFR-09, NFR-12, NFR-16).
2. Menegakkan keamanan di server pada setiap permintaan (NFR-01, NFR-13, NFR-15): otorisasi, validasi, allowlist respons, jejak audit tidak dapat diubah.
3. **Waktu muat setiap layar maksimal 3 detik** di front end (NFR-08, CR-002, CD-173), diverifikasi pada data acuan (§13).
4. Integritas data lewat constraint database untuk invarian kritis (tumpang tindih log, pasangan tanggal, konsistensi jenis kartu) dan versi optimistis untuk konkurensi (NFR-10).
5. Mudah dipelihara untuk kasus lanjutan: modul berbatas jelas, dependensi satu arah, tanpa abstraksi spekulatif.

## 5. Architecture Impact

**Style:** modular monolith (Technology Baseline §4). Satu proses Node (Next.js, standalone), satu
database PostgreSQL, tanpa antrean pesan, tanpa cache terdistribusi, tanpa layanan terpisah.

### 5.1 Lapisan di dalam setiap modul

```text
UI (src/app: halaman, server component, client component, Server Action)   <- transport
  -> application (use case: sesi, otorisasi, validasi, transaksi, audit)
       -> domain (aturan bisnis murni: tanpa Prisma, tanpa Next.js, tanpa jam sistem langsung)
       -> infrastructure (repository Prisma/SQL, adapter)  <- implementasi port
```

Aturan dependensi (ditegakkan oleh aturan lint impor, lihat TD-06):

1. `domain` hanya mengimpor `domain` lain dan `shared`; tidak pernah mengimpor application, infrastructure, Prisma, atau Next.js.
2. `application` mengimpor `domain` modulnya sendiri, **port** (interface), dan `shared`/`platform`.
3. `infrastructure` mengimpor Prisma dan mengimplementasikan port; hanya `platform/container` yang membuat instansinya.
4. `src/app` hanya memanggil use case dan query dari `index.ts` publik modul; tidak pernah menyentuh repository atau Prisma.
5. Antar modul: hanya lewat `index.ts` publik atau port; tidak ada impor ke folder dalam modul lain.

### 5.2 Menghindari dependensi melingkar antar modul

Dua arah kebutuhan nyata ada: tahapan butuh data kartu (syarat Selesai, bobot progres), dan kartu butuh
tahapan (revisi estimasi otomatis, konfirmasi status project). Penyelesaian dengan inversi dependensi:

```text
kanban  ->  project           (kanban memanggil StageRevisionPort dan ProjectStatusPort milik project)
project ->  (port)  CardSourcePort   (didefinisikan di project/application/ports, diimplementasikan
                                      oleh adapter kanban dan dihubungkan di platform/container)
```

Arah impor kode tetap satu arah (kanban -> project). Project tidak mengimpor kanban; ia hanya
mengenal `CardSourcePort` yang menyediakan: daftar kartu terbuka per tahapan, ringkasan progres
kartu per tahapan, dan jumlah kartu. `dashboard` dan `history` adalah modul baca yang boleh mengimpor
`project`, `kanban`, dan `master` (tidak diimpor balik).

### 5.3 Peta modul

```text
auth      master      project      kanban      audit      dashboard (baca)   history (baca)
  ^          |            ^           |            ^            |                 |
  |          +--> auth     |           +--> project |            +--> project,kanban,master
  +-- dipakai semua (sesi, kebijakan) ---------------+-- audit dipakai semua use case mutasi
```

## 6. Components / Modules

Struktur repository (`source/PMCP/`, repository git tersendiri, CD-46; kini dipindah menjadi repository `ravesta/pmcp_app` dengan isi `source/PMCP/` sebagai akar, 2026-10-28):

```text
source/PMCP/
  prisma/                       schema.prisma, migrations/ (SQL migrasi terversi)
  src/
    app/                        halaman Next.js (App Router), layout, Server Action, route handler health
    modules/
      auth/        {domain, application, infrastructure, index.ts}
      master/      {domain, application, infrastructure, index.ts}
      project/     {domain, application, infrastructure, index.ts}
      kanban/      {domain, application, infrastructure, index.ts}
      audit/       {application, infrastructure, index.ts}
      dashboard/   {application, index.ts}     baca saja
      history/     {application, index.ts}     baca saja
    shared/                     kalender dan hari kerja, pembulatan, tipe tanggal, hasil/galat, jam (Clock)
    platform/                   config, klien database, logging, container (komposisi), pesan galat
    ui/                         tema MUI, komponen bersama, komponen Gantt/Kanban/kapasitas
  scripts/                      bootstrap-manager, pembersihan sesi kedaluwarsa, data acuan uji
  tests/                        unit, integration, e2e (mirror struktur modul)
```

| Modul | Tanggung jawab | Isi domain (fungsi murni utama) |
|---|---|---|
| auth | akun login, sesi, kebijakan password, throttle login, kebijakan otorisasi | `validatePassword`, `normalizeUsername`, `throttleDecision`, `policy.*` |
| master | PIC dan akun PIC (memakai port auth), aplikasi terdampak, kategori, alasan, step, pengaturan batas | aturan umum master (nama unik, minimal satu aktif, kategori bawaan terkunci) |
| project | project, tahapan, penugasan PIC, estimasi dan revisi, hold, status, progres, Gantt, Daftar | `stageProgress`, `expectedProgress`, `isLagging`, `displayStatus`, `stageLateness`, `planAutoRevision`, `mergeRevision`, `revisionWarning`, `ganttBarModel` |
| kanban | kartu, papan, log aktivitas, jadwal ulang, pembatalan, kepatuhan | `cardPlanFlags`, `cardTransition`, `computeCompliance`, `checkWorkLog`, `dayTotals` |
| audit | pencatatan dan pembacaan jejak perubahan | bentuk `AuditEvent`, jenis, ringkasan |
| dashboard | pembaca gabungan Head dan PIC | `computeCapacity`, `capacityStatus`, `detectClashes`, `loggingQuality`, antrean prioritas |
| history | tahapan selesai dan aktivitas harian | pengelompokan log per hari |
| shared | kalender | `isWorkday`, `workdaysInclusive`, `calendarDaysBetween`, `weekRange`, `monthRange`, `roundHalfUp`, `addDays` |

`Clock` (di `shared`) adalah satu-satunya sumber "hari ini" dan jam; produksi memakai jam server zona
Asia/Jakarta, lingkungan uji dan staging dapat memasang jam tetap (NFR-16 butir 1, §14). Fungsi domain
menerima tanggal acuan sebagai argumen sehingga dapat dites tanpa jam global.

### 6.1 Bentuk use case

Setiap use case adalah satu fungsi `async (ctx, input) => Result<Output>` pada
`modules/<m>/application/<namaUseCase>.ts` dengan urutan tetap dan terlihat:

```text
1. requireSession(ctx)          -> Actor {userId, role, picId}
2. authorize(actor, aksi, sumber)   (kebijakan di auth/domain/policy)
3. parse input dengan skema (zod)   (allowlist field, batas panjang)
4. transaksi database:
     muat data, cek konkurensi (versi), terapkan aturan domain, tulis, recordAudit(...)
5. kembalikan Result {ok, data} atau {ok:false, error}
```

Efek samping (tulis database, audit) hanya di langkah 4 dan didokumentasikan pada komentar fungsi.

## 7. Data Flow

### 7.1 Baca (halaman)

```text
Browser -> reverse proxy (HTTPS) -> Next.js server component
  -> requireSession -> query modul (application) -> repository (SQL, terfilter dan berhalaman di server)
  -> domain (hitung penanda, progres, kapasitas) -> view model -> render HTML (streaming) -> browser
```

Filter, periode, zoom, halaman, dan tampilan Daftar atau Gantt berada di parameter URL, sehingga
dirender server dan tahan tombol kembali (TD-03).

### 7.2 Tulis (aksi)

```text
Browser (form atau klien) -> Server Action -> use case (urutan 6.1) -> transaksi -> audit -> hasil
  -> revalidate halaman terkait -> UI menampilkan pesan (Result)
```

### 7.3 Contoh alur dengan efek silang: membuat kartu project (FR-17-01, FR-17-02, FR-13-05)

```text
createProjectCard(kanban)
  -> policy: peran PIC; PIC mengikuti project dan tahapan (cek di server, BL-24)
  -> ProjectStatusPort.getForCard(projectId)          (project menolak Batal/Selesai/tahapan Selesai)
  -> planAutoRevision(domain project, rencana kartu, estimasi tahapan)   -> butuh revisi?
  -> transaksi tunggal:
       SELECT ... FOR UPDATE pada project_stage          (serialisasi, NFR-10)
       insert card (kode KB-nnnnn dari sequence)
       bila revisi: StageRevisionPort.apply(...)         (revisi bernomor atau penggabungan satu hari)
       bila "Ya, jadikan Berjalan": ProjectStatusPort.changeStatus(...)
       recordAudit(kartu, revisi, status)               (satu transaksi, semua atau tidak sama sekali)
```

## 8. API Impact

**Tidak ada API publik atau konsumen eksternal** (Integration Specification dan API Specification
NOT_REQUIRED; documentation-plan). Kontrak internal:

- **Mutasi:** Server Action Next.js. Dipilih karena tipe dari server sampai klien, perlindungan CSRF bawaan (pemeriksaan Origin terhadap Host) ditambah cookie `SameSite`, dan tanpa permukaan REST yang perlu dirawat (TD-02).
- **Baca:** server component memanggil query modul; tidak ada endpoint JSON untuk layar.
- **Satu route handler:** `GET /api/health` (tanpa autentikasi, hanya status dan ping database tanpa detail internal) untuk reverse proxy dan CI/CD.
- **Bentuk hasil aksi:** `Result<T> = { ok: true, data: T } | { ok: false, error: { code, message, fields? } }`. `code` stabil (mis. `VALIDATION`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE:<kode>`, `THROTTLED`); `message` Indonesia dari katalog tunggal `platform/messages.ts` (teks mengikuti FSD, mis. "Minimal satu pilihan harus aktif."); `fields` memetakan galat per isian.
- **Allowlist:** input dan output memakai skema eksplisit per use case (zod). Entitas Prisma tidak pernah dikembalikan ke klien; view model berisi field yang dibutuhkan layar saja (NFR-01).
- **Kompatibilitas:** tidak ada konsumen yang perlu dijaga; perubahan kontrak internal cukup lewat tipe dan uji.

## 9. Database Impact

Skema awal baru; rincian tabel, tipe, constraint, indeks, urutan, dan migrasi ada di
`dev/database-design.md`. Ringkasan keputusan:

- Tanggal bisnis `DATE`, jam log `TIME`, peristiwa `TIMESTAMPTZ`; tidak ada konversi zona pada tanggal bisnis (BL-09).
- Invarian kritis di database: log tidak boleh tumpang tindih per PIC (trigger penjaga dengan advisory lock per PIC, TD-15; tanpa ekstensi), pasangan tanggal, konsistensi jenis kartu, panjang field (CHECK).
- Kode project (`PRJ-nnn`) dan kartu (`KB-nnnnn`) dari sequence database; celah nomor diterima (NFR-10).
- Jejak audit append-only: tanpa `UPDATE`/`DELETE` oleh peran aplikasi, dijaga trigger.
- Versi baris (`version`) pada tabel yang dapat diubah bersamaan untuk penguncian optimistis.

## 10. Integration Impact

Tidak ada integrasi eksternal. Satu titik kontak dengan infrastruktur: **reverse proxy** meneruskan
`Host`, `X-Forwarded-Proto`, dan `X-Forwarded-For`; aplikasi hanya mempercayai header itu dari proxy
yang dikonfigurasi (`TRUSTED_PROXY_COUNT`), untuk alamat sumber pada throttle login dan pemeriksaan
Origin. Konfigurasi proxy menunggu jawaban tim infra (`dev/pertanyaan-tim-infra.md`).

## 11. Security Considerations

Rincian di `dev/security-design.md`. Ringkasan: sesi buram di cookie `HttpOnly`, `Secure`, `SameSite=Lax`
dengan token acak yang disimpan sebagai hash; idle 2 jam dan maksimum 12 jam; hash password argon2id;
otorisasi terpusat dan dicek di server pada setiap use case, **bukan di middleware** (middleware hanya
pengarah ke login); throttle login per username dan per sumber alamat; jejak audit tidak dapat diubah;
header keamanan dan CSP; log tanpa data sensitif (NFR-01, NFR-02, NFR-04, NFR-13, NFR-15).

## 12. Error Handling

| Kelas galat | Sumber | Penanganan |
|---|---|---|
| `ValidationError` | skema input, aturan format | `Result` galat dengan `fields`; tanpa efek samping |
| `AuthenticationError` | tidak ada sesi atau kedaluwarsa | arahkan ke login (EC-01-01.04, EC-01-01.05) |
| `ForbiddenError` | kebijakan menolak | pesan "Anda tidak memiliki akses ..." dan catat jenis Keamanan (FR-01-04) |
| `NotFoundError` | sumber tidak ada | pesan "... tidak ditemukan." |
| `ConflictError` | versi baris tidak cocok, nama ganda serentak | pesan data telah berubah dan minta muat ulang (NFR-10) |
| `BusinessRuleError(kode)` | aturan domain (mis. kartu terbuka saat Selesai) | pesan dari katalog, tanpa efek samping, transaksi dibatalkan |
| `InfrastructureError` | database tidak tersedia, batas waktu | pesan umum "Terjadi kesalahan, coba lagi." dengan ID korelasi; detail hanya di log |

Semua galat tak terduga dicatat dengan ID korelasi (tanpa payload mentah, NFR-01) dan tidak
mengungkap stack atau SQL ke pengguna. Transaksi membuat perubahan beserta audit-nya atomik.
Layar muat gagal menampilkan pesan dan tombol coba lagi tanpa data sebagian yang menyesatkan (EC-15-01.01).

## 13. Performance Considerations

**Anggaran:** setiap layar tampil dan dapat dipakai **maksimal 3 detik** di jaringan kantor dengan
cache dingin (NFR-08, CR-002). Agar anggaran dapat ditegakkan, DEV membaginya:

| Komponen | Anggaran | Cara menjaga |
|---|---|---|
| Pemrosesan server (render + query) | maksimal 1,0 detik pada data acuan | query berhalaman di SQL, agregat terpisah, paralel (`Promise.all`), indeks, tanpa N+1, tanpa `findMany` tanpa batas |
| Transfer HTML dan aset di LAN kantor | di bawah 0,5 detik | HTML streaming (Suspense per bagian dashboard), aset hash dengan cache panjang di reverse proxy, kompresi |
| Eksekusi JavaScript klien sampai interaktif | sisa anggaran | komponen server secara bawaan, `"use client"` hanya untuk bagian interaktif (Gantt, Kanban seret-lepas, filter), pemisahan kode per rute, hindari pustaka besar |
| Cadangan variasi (beban, cold start) | sekitar 1,0 detik | pemantauan p95 per rute pada uji dan staging |

Prinsip:

1. **Server-side:** filter, urutan, paging, dan agregat dihitung di server (BR-15, FR-15-01). Gantt halaman 10 project (tiga baris tahapan masing-masing), Daftar 5 baris, Riwayat dan Jejak berhalaman; ringkasan jumlah per status dari satu agregat `GROUP BY` terpisah.
2. **Dashboard:** bagian-bagian dihitung dengan beberapa query ringkas yang berjalan paralel, bukan memuat seluruh kartu. Hitungan domain (terlambat, laju, kapasitas) memakai baris hasil filter SQL: tahapan belum Selesai, kartu terbuka dan kartu pada periode, log pada periode.
3. **Indeks** untuk jalur yang dipakai (lihat database-design §indeks): tahapan menurut project dan status, kartu menurut (pemilik, kolom), (project, tahapan), tanggal rencana selesai; log menurut (PIC, tanggal); audit menurut waktu dan project.
4. **Tanpa cache lintas pengguna** pada data hak-tergantung (halaman dinamis); tidak ada cache aplikasi pada rilis ini karena skala (<20 pengguna) dan karena akurasi lebih penting.
5. **Bundel klien:** target awal di bawah sekitar 300 KB terkompresi per rute pertama; Gantt dan Kanban dibangun sendiri tanpa pustaka besar (Technology Baseline §7); MUI memakai impor per komponen dan integrasi App Router resmi untuk gaya sisi server.
6. **Koneksi database:** satu pool kecil per proses (Technology Baseline §6); transaksi pendek; tidak ada kerja panjang di dalam transaksi.

**Verifikasi:** diuji pada **data acuan yang disetujui pemilik** (CL-057, CD-175):
300 project (900 tahapan), 15 PIC, 6.000 kartu, 60.000 log, 100.000 peristiwa audit, 20 sesi
bersamaan; skrip pembuat data acuan di `scripts/`. Pengukuran: waktu hingga konten utama tampil dan
dapat dipakai (Largest Contentful Paint dan interaktif) pada cache dingin; metode final milik QA
(strategi uji). Bila uji menunjukkan layar melebihi 3 detik, urutan perbaikan: indeks dan bentuk query,
pengurangan data per layar, pemisahan streaming, baru kemudian cache terarah.

## 14. Testing Approach

| Tingkat | Cakupan | Alat usulan |
|---|---|---|
| Unit (domain) | seluruh fungsi hitung dan aturan: kalender, progres, laju, status tampilan, keterlambatan, revisi otomatis, penanda rencana, kepatuhan, kapasitas, kualitas pencatatan, validasi password dan username. Tabel kasus dari AC FSD dan contoh NFR-16 (hari ini = Rabu 28/10/2026) | Vitest |
| Integrasi | use case dengan PostgreSQL sungguhan: transaksi, constraint (tumpang tindih log, pasangan tanggal), konkurensi (versi), audit, hak akses per peran dan kepemilikan (tabel uji dari matriks FSD) | Vitest + PostgreSQL sementara di CI |
| Kontrak otorisasi | setiap Server Action diuji terhadap peran Manager, PIC pemilik, PIC lain, tanpa sesi | Vitest, data-driven |
| E2E | alur utama: login, buat project, perbarui tahapan, buat kartu dan revisi otomatis, log, dashboard, riwayat | Playwright |
| Performa | anggaran 3 detik per layar utama pada data acuan | skrip ukur di CI atau staging |
| Keamanan | throttle, sesi (idle, maksimum), reset mengakhiri sesi, CSRF, header, jejak tidak dapat diubah | Vitest + uji manual terarah |

Aturan: jam sistem uji dapat dipasang (`Clock`); nama uji memuat ID FR/AC/EC agar traceability ke FSD
terlihat; `AC:` pada FSD menjadi minimal satu kasus uji. NFR non-fungsi (NFR-05, NFR-07, NFR-09)
diverifikasi lewat tinjauan dan uji pemulihan (strategi uji QA). Bukti uji dilaporkan pada handover
(`tests_added`, `tests_run`, `validation_result`).

## 15. Deployment / Migration Considerations

Kerangka; rincian tertunda sampai tim infra menjawab (pertanyaan `dev/pertanyaan-tim-infra.md`).

- **Artefak:** `next build` mode `standalone`, dikemas sebagai satu paket versi (atau image kontainer bila tersedia). Versi aplikasi tampil di `/api/health`.
- **Konfigurasi (variabel lingkungan):** `DATABASE_URL`, `APP_ORIGIN` (untuk pemeriksaan Origin), `TRUSTED_PROXY_COUNT`, `TZ=Asia/Jakarta`, `LOG_LEVEL`, `SESSION_IDLE_MINUTES` (120), `SESSION_ABSOLUTE_MINUTES` (720), `CLOCK_OVERRIDE` (hanya non-produksi; ditolak saat `NODE_ENV=production`). Rahasia tidak ada di repository (Technology Baseline §3).
- **Migrasi database:** `prisma migrate deploy` (SQL terversi, termasuk SQL mentah untuk trigger penjaga log, trigger audit, dan sequence) dijalankan sebagai langkah rilis sebelum proses baru; **maju saja** dan kompatibel mundur satu rilis (Technology Baseline §10); backup oleh infra **sebelum migrasi production**.
- **Ekstensi database:** tidak ada yang dibutuhkan; `btree_gist` tidak diizinkan (CD-175).
- **Peran database:** satu peran aplikasi `pmcp_app` (pemilik skema) karena dua peran tidak tersedia (CD-175). Jejak audit dilindungi trigger penolak `UPDATE`/`DELETE` dan disiplin kode (aplikasi tidak pernah menerbitkan keduanya, diuji); **pemeriksaan integritas skema saat proses mulai** memastikan trigger audit dan trigger log ada, dan proses menolak melayani bila tidak. Bila dua peran tersedia kelak, `REVOKE` pada `audit_event` ditambahkan sebagai pengerasan.
- **Bootstrap:** `scripts/bootstrap-manager` membuat satu akun Manager awal dengan password sementara dan wajib ganti (FR-01-06); prosedur reset darurat memakai skrip yang sama dengan mode reset dan dicatat di audit.
- **Rollback:** deploy ulang artefak sebelumnya; migrasi tidak dibalik otomatis (kompatibel mundur satu rilis; perbaikan maju).
- **Proses:** dijalankan sebagai service otomatis hidup kembali (systemd, Windows Service, atau kontainer, tergantung jawaban infra), di belakang reverse proxy HTTPS.
- **Pembersihan:** sesi kedaluwarsa dibersihkan secara malas saat login dan oleh skrip terjadwal infra (`scripts/purge-expired-sessions`).

## 16. Risks

| ID | Risiko | Mitigasi |
|---|---|---|
| TDR-01 | Jawaban infra bertentangan dengan asumsi (OS, HTTPS) | Technology Change Proposal |
| TDR-02 | Anggaran 3 detik terlampaui pada data nyata (volume belum diketahui, CL-057) | Data acuan, pengukuran di CI/staging sejak irisan awal, urutan perbaikan §13 |
| TDR-03 | Aturan hitung tersebar ke UI sehingga angka tidak konsisten antar layar | Domain murni tunggal, lint impor, uji tabel dari AC, NFR-12 |
| TDR-04 | Autentikasi buatan sendiri cacat | Security Design, uji keamanan, tinjauan kode sebelum rilis |
| TDR-05 | MUI + server component menimbulkan masalah gaya atau ukuran bundel | Integrasi App Router resmi MUI, uji awal pada irisan 1, impor per komponen |
| TDR-06 | Pustaka hash native tidak dapat dibangun di OS server | Pilih pustaka dengan biner prabangun atau bcrypt (baseline mengizinkan); putuskan setelah OS diketahui |
| TDR-07 | Satu proses dan satu server: titik kegagalan tunggal | Diterima pemilik (RTO satu hari kerja, CD-157); health check dan restart otomatis |
| TDR-08 | Konkurensi pada revisi otomatis dua kartu serentak | Kunci baris tahapan (`FOR UPDATE`) dalam satu transaksi, uji integrasi |
| TDR-09 | Satu peran database: pemilik skema dapat menonaktifkan trigger audit lewat DDL | Aplikasi tidak pernah menjalankan DDL kecuali migrasi saat rilis; pemeriksaan integritas skema saat start; kredensial database hanya diketahui infra dan aplikasi; risiko diterima (SR-06) |

## 17. Open Issues

| ID | Isu | Kebutuhan |
|---|---|---|
| OI-01 | Jawaban tim infra (OS, runtime kontainer, proxy, HTTPS, versi PostgreSQL, CI/CD, backup, secret, log) | Ditunda pemilik; dibutuhkan sebelum deploy pertama dan memengaruhi pilihan pustaka hash serta bentuk rilis |
| OI-02 | Izin ekstensi `btree_gist` dan dua peran database | **Ditutup** (CD-175): tidak diizinkan dan tidak tersedia; desain disesuaikan (TD-15, TDR-09) |
| OI-03 | **Klasifikasi data**: *Internal* (nama PIC, username, hash password, data kerja, jejak; tanpa data pribadi sensitif, finansial, atau nasabah) | **Ditutup**: disetujui pemilik, BRD v4.1 (CR-003, CD-175) |
| OI-04 | Data acuan uji performa (CL-057) | **Ditutup**: usulan §13 disetujui pemilik (CD-175) |
| OI-05 | Versi Node.js, Next.js, Prisma, MUI yang dikunci | Dikunci saat scaffold berdasarkan versi stabil yang didukung dan jawaban infra tentang OS |
| OI-06 | Desain layar Login, Ubah Password, Tambah PIC dan penyesuaian mockup | Handoff UX/UI |

## 18. Technical Decisions

| ID | Keputusan | Alasan | Alternatif ditolak |
|---|---|---|---|
| TD-01 | Modular monolith berlapis (UI, application, domain, infrastructure) dengan inversi dependensi untuk arah balik antar modul (§5.2) | Aturan bisnis terpusat dan teruji; tanpa siklus | Layanan terpisah (tidak dibenarkan skala), logika di route handler |
| TD-02 | Mutasi lewat Server Action, baca lewat server component, tanpa REST untuk layar | Tipe ujung ke ujung, CSRF bawaan, permukaan lebih kecil | REST/JSON per layar (kontrak ganda tanpa konsumen) |
| TD-03 | Filter, periode, halaman di parameter URL; dirender server | Paging dan agregat di server (FR-15-01), tombol kembali, dapat dibagikan | Filter di state klien dan memuat semua data |
| TD-04 | Tanggal bisnis sebagai string `YYYY-MM-DD` bermerek di TypeScript dan `DATE` di database; aritmetika kalender di `shared` murni UTC | Menghindari pergeseran zona (BL-09) | Objek `Date` lokal |
| TD-05 | Satu `Clock` injectable; "hari ini" diambil sekali per permintaan | Testabilitas (NFR-16) dan konsistensi satu permintaan | `new Date()` tersebar |
| TD-06 | Aturan impor ditegakkan lint (mis. batas folder) dan diuji di CI | Dependensi satu arah terjaga otomatis | Disiplin manual |
| TD-07 | Konkurensi: kolom `version` + `UPDATE ... WHERE version=` untuk pengeditan biasa; `SELECT ... FOR UPDATE` untuk alur multi-baris (revisi otomatis) | NFR-10, sederhana, cocok skala | Kunci pesimistis panjang, `SERIALIZABLE` global |
| TD-08 | Invarian kritis juga di database (trigger penjaga tumpang tindih log, CHECK) | Defense in depth; BL-28 | Hanya cek aplikasi |
| TD-09 | Audit append-only: trigger penolak `UPDATE`/`DELETE`, tidak ada `UPDATE`/`DELETE` dari kode aplikasi (diuji), pemeriksaan skema saat start, ditulis dalam transaksi yang sama dengan perubahan; `REVOKE` bila dua peran tersedia | NFR-04, BL-07; dua peran tidak tersedia | Tabel audit biasa, log berkas |
| TD-10 | Sesi buram berbasis database (hash token) dengan idle dan maksimum; middleware hanya pengarah | Reset mengakhiri sesi tepat (FR-01-05), tanpa kebergantungan otorisasi pada middleware | JWT tanpa status |
| TD-11 | Kode project dan kartu dari sequence database; celah nomor diterima | Unik dan naik di bawah konkurensi tanpa kunci aplikasi | Hitung MAX+1 |
| TD-12 | Kategori revisi bawaan sistem dirujuk lewat `system_key`, bukan nama | Nama dapat dipilih otomatis tanpa rapuh terhadap perubahan (FR-08-03) | Cocokkan nama |
| TD-13 | Pustaka validasi skema (zod) untuk allowlist input dan output | Kontrak eksplisit, pesan galat per field | Validasi ad hoc |
| TD-14 | Pencatatan: log aplikasi terstruktur JSON ke stdout dengan redaksi; jejak bisnis di tabel `audit_event` | Pemisahan operasional dan bisnis (NFR-04) | Satu tempat untuk keduanya |
| TD-16 | **Basis data lebih dulu:** SQL migrasi terversi di `prisma/migrations/` adalah sumber kebenaran skema; model Prisma dihasilkan dengan `prisma db pull` saat irisan 1 memerlukan klien | Trigger, sequence, dan CHECK tidak dapat dimodelkan di skema Prisma; mencegah skema dan database berbeda | Skema Prisma sebagai sumber (kehilangan trigger dan constraint kustom) |
| TD-15 | Tumpang tindih log dijaga trigger `BEFORE INSERT OR UPDATE` dengan `pg_advisory_xact_lock` per PIC dan pemeriksaan rentang; aplikasi memeriksa lebih dulu agar pesan menyebut log yang bentrok | Ekstensi `btree_gist` tidak diizinkan (CD-175); kunci per PIC membuat dua sesi serentak berurutan | Exclusion constraint (butuh ekstensi), cek aplikasi saja (celah balapan) |

## 19. Deviations

Tidak ada penyimpangan dari FSD v1.1, BRD v4.0, atau Technology Baseline v1.0. Perbedaan yang
diketahui antara **mockup v0.2** dan FSD (mockup bukan baseline) dicatat di handover BA ke DEV dan QA
(`ba/handover-ba-dev-qa-fsd-v1.0.md`) dan ditangani lewat handoff UX/UI.

## 20. Status

```yaml
status: approved
version: 1.0
approved_by: Pemilik (Head of Business Analyst, Human Approver)
approved_at: 2026-10-28
ref: CD-176
```

Agent tidak menyetujui artifact buatannya sendiri. Persetujuan diberikan oleh Human Approver (pemilik) pada 2026-10-28.

---

## Lampiran A. Implementation Plan

Irisan vertikal; setiap irisan mengirim perilaku utuh yang dapat diuji dan didemokan. Kriteria selesai
umum: kode sesuai Lampiran B, uji unit domain dan integrasi irisan lulus, anggaran 3 detik pada
layar irisan terukur, audit tercatat untuk setiap mutasi, tidak ada TODO tanpa rujukan.

| Irisan | Isi | FR utama | Gerbang |
|---|---|---|---|
| 0. Fondasi | scaffold `source/PMCP/` (git tersendiri), TypeScript strict, lint impor, konfigurasi, `Clock`, kalender, hasil/galat, klien database, logging, container, `/api/health`, skema dan migrasi dasar, skrip bootstrap, pipeline lokal untuk uji | NFR-01, NFR-09, NFR-16 | uji kalender lulus dengan contoh NFR-16; migrasi dapat dijalankan dan diulang |
| 1. Akun dan master | auth (login, sesi, throttle, ganti password, reset), kebijakan otorisasi, audit, master PIC, aplikasi, kategori, alasan, step, pengaturan batas, layar Master dan Jejak Perubahan | FR-01-01 s.d. 06, FR-08-01 s.d. 06, FR-19-01, FR-09-01 | uji kontrak otorisasi dan keamanan lulus; tinjauan keamanan sebelum irisan berikutnya |
| 2. Project dan tahapan | project, tahapan, penugasan, estimasi dan revisi, hold, status, progres tahapan, Daftar, Gantt, Detail, informasi project, Assignment baru | FR-02, FR-03, FR-05, FR-06, FR-10 s.d. FR-15 (kecuali FR-13-05), FR-07-02 | uji domain progres, laju, revisi lulus; Gantt dan Daftar dalam 3 detik pada data acuan |
| 3. Kanban | kartu project dan activity, papan, progres kartu, jadwal ulang, pembatalan, log, revisi otomatis, kepatuhan, log dan rencana di detail project | FR-16, FR-17, FR-18, FR-20, FR-21, FR-13-05 | uji konkurensi revisi otomatis, constraint log, kepatuhan lulus |
| 4. Dashboard dan Riwayat | Dashboard Head dan PIC, kapasitas, ringkasan aktivitas, Riwayat | FR-04, FR-07 | angka kartu sama dengan layar tujuan (NFR-14); dashboard dalam 3 detik pada data acuan |
| 5. Pengerasan dan rilis | uji E2E penuh, uji keamanan, uji performa data acuan, dokumen deployment dan operasi (setelah jawaban infra), data awal master, handover ke QA | semua | G3 (Build Ready) menurut operating model |

Handoff UX/UI berjalan paralel dan harus selesai untuk layar irisan 1 (Login, Ubah Password, Tambah PIC)
sebelum irisan itu dibangun; irisan 0 dapat dimulai segera setelah Technical Design disetujui.

## Lampiran B. Konvensi kode dan komentar fungsi (CD-160, NFR-09)

1. **Setiap fungsi** (termasuk fungsi domain, use case, repository, komponen) diberi komentar dokumentasi sebelum deklarasi dengan butir: **Tujuan** (satu kalimat), **Masukan/Keluaran** (hal yang tidak jelas dari tipe), **Efek samping** (tulis database, audit, pembatalan sesi; "tidak ada" untuk fungsi murni), **Rujukan** (ID FR, BL, EC yang diimplementasikan). Komentar menjelaskan *apa dan mengapa*, bukan mengulang sintaksis, dan diperbarui bersama kode (komentar kedaluwarsa dihapus atau diperbaiki).
2. Nama berarti dan spesifik; tidak ada `processData` untuk logika penting; satu tanggung jawab per fungsi dan per file.
3. Aturan bisnis hanya di `domain`; ID aturan dapat dicari dengan pencarian teks (mis. `FR-05-02`).
4. TypeScript `strict`; tanpa `any` kecuali dengan alasan tertulis; tipe eksplisit pada batas publik modul.
5. Tidak ada efek samping tersembunyi: fungsi domain murni, use case menyatakan transaksi dan audit pada komentarnya.
6. Struktur file dapat ditebak: `modules/<m>/<lapisan>/<nama>.ts`, satu use case per file.
7. Tinjauan kode memeriksa komentar fungsi, rujukan FR/BL, dan lint impor sebelum penggabungan.

Contoh bentuk komentar:

```ts
/**
 * Menghitung progres tahapan dari kartu aktif semua PIC, dibobot hari kerja rencana kartu.
 * Masukan: kartu aktif tahapan (tidak dibatalkan), nilai progres tiap kartu.
 * Keluaran: bilangan bulat 0..99 (dibulatkan setengah naik); null bila tidak ada kartu.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-05-02 butir 1, NFR-16 butir 5, BL-40(b).
 */
export function stageSystemProgress(cards: ReadonlyArray<ProgressCard>): number | null { ... }
```
