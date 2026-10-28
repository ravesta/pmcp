# Pertanyaan untuk Tim Infra: Aplikasi PMCP

| | |
|---|---|
| Project | PMCP (Project Monitoring & Capacity Planning System, tim BA dan QA) |
| Tanggal | 2026-10-28 |
| Disusun oleh | DEV Agent, atas permintaan pemilik (Head of BA) |
| Status | Daftar pertanyaan, belum ada jawaban. Bukan keputusan teknis. |
| Rujukan | `dev/technology-baseline.md` v0.3 §9.2 |

## Ringkasan aplikasi

PMCP adalah aplikasi web internal untuk memantau project, jadwal tahapan (BA, Development, QA),
Kanban rencana kerja, dan kapasitas tim BA dan QA. Penggunanya **kurang dari 20 orang**, diakses
**hanya dari jaringan kantor** (tanpa VPN, tanpa akses internet publik). Login memakai username
dan password yang dikelola aplikasi (tanpa SSO).

Keputusan pemilik: aplikasi dan database PostgreSQL berjalan di **server lokal perusahaan**;
backup oleh tim infra; akan ada CI/CD. Draf teknologi yang diusulkan: aplikasi Node.js
(Next.js dan TypeScript) dan PostgreSQL. Baseline ini belum disetujui, jadi jawaban Anda juga
menjadi masukan untuk memutuskannya.

## Target pemulihan (disetujui pemilik)

- Data boleh hilang paling lama **24 jam** (backup minimal harian).
- Layanan boleh mati paling lama **satu hari kerja**.

## Pertanyaan

Kolom "Jawaban" diisi tim infra. Tulis "belum diputuskan" bila memang belum ada.

### A. Server dan runtime

| No | Pertanyaan | Mengapa dibutuhkan | Jawaban |
|---|---|---|---|
| A1 | Sistem operasi server (Linux distribusi dan versi, atau Windows Server)? | Menentukan cara menjalankan aplikasi dan skrip rilis | |
| A2 | Apakah runtime container (mis. Docker) tersedia dan boleh dipakai? Bila tidak, bagaimana proses Node.js dijalankan sebagai service otomatis? | Aplikasi harus hidup kembali sendiri setelah server restart | |
| A3 | Apakah Node.js (versi LTS) boleh dipasang, dan siapa yang memperbarui patch-nya? | Patch keamanan runtime | |
| A4 | Apakah aplikasi dan PostgreSQL di server yang sama atau terpisah? | Menentukan alamat dan keamanan koneksi database | |

### B. Jaringan, alamat, dan HTTPS

| No | Pertanyaan | Mengapa dibutuhkan | Jawaban |
|---|---|---|---|
| B1 | Reverse proxy apa yang dipakai (mis. Nginx, IIS, lainnya)? Apakah disediakan infra? | Aplikasi berjalan di belakang reverse proxy | |
| B2 | Nama domain internal untuk aplikasi (mis. pmcp.namaperusahaan.local)? | Alamat akses dan sertifikat | |
| B3 | **Sertifikat HTTPS** apakah tersedia (CA internal atau lainnya) dan siapa yang memperbarui? | Login dan cookie sesi aman **mewajibkan HTTPS**; tanpa HTTPS aplikasi tidak boleh melayani login | |
| B4 | Port yang boleh dibuka dan pembatasan akses (hanya segmen jaringan tertentu)? | Memastikan hanya jaringan kantor yang dapat mengakses | |

### C. Database PostgreSQL

| No | Pertanyaan | Mengapa dibutuhkan | Jawaban |
|---|---|---|---|
| C1 | Versi PostgreSQL yang akan disediakan? | Kompatibilitas fitur dan siklus dukungan | |
| C2 | Siapa pemilik akun administrasi database, dan apakah aplikasi boleh memakai akun terbatas (bukan superuser) untuk pemakaian normal? | Prinsip hak akses minimal | |
| C3 | Apakah aplikasi boleh membuat dan mengubah skema lewat migrasi, atau perubahan skema harus lewat infra? | Menentukan alur rilis dengan perubahan database | |
| C4 | Apakah ekstensi PostgreSQL **btree_gist** boleh dipasang (atau diizinkan dibuat oleh pemilik database), dan dapatkah disediakan **dua peran database** (satu untuk migrasi, satu terbatas untuk aplikasi tanpa hak mengubah atau menghapus tabel jejak audit)? | Aturan "log aktivitas tidak boleh tumpang tindih" ditegakkan di database lewat ekstensi ini; peran terbatas melindungi jejak audit agar tidak dapat diubah (Technical Design TDR-01, database-design §9) | **Dijawab pemilik 2026-10-28: tidak boleh** (CD-175). Desain disesuaikan tanpa ekstensi dan dengan satu peran aplikasi; tim infra tidak perlu menjawab butir ini. |

### D. CI/CD dan lingkungan

| No | Pertanyaan | Mengapa dibutuhkan | Jawaban |
|---|---|---|---|
| D1 | Alat CI/CD yang akan dipakai dan kapan siap? | Menentukan format pipeline. Sampai siap, deploy manual diizinkan pemilik dengan persetujuan per rilis | |
| D2 | Apakah runner CI bisa menyediakan PostgreSQL sementara untuk pengujian otomatis? | Uji integrasi memakai PostgreSQL sungguhan | |
| D3 | Apakah dapat disediakan tiga lingkungan: staging (database terpisah) dan production, selain mesin developer? | Pemilik memvalidasi di staging sebelum production | |
| D4 | Bagaimana mekanisme gerbang persetujuan sebelum deploy ke production (di alat CI/CD atau di luar alat)? | Production hanya dengan persetujuan pemilik | |

### E. Backup dan pemulihan

| No | Pertanyaan | Mengapa dibutuhkan | Jawaban |
|---|---|---|---|
| E1 | Jadwal backup database, lokasi penyimpanan, dan lama retensi? | Harus memenuhi target 24 jam di atas | |
| E2 | Apakah backup disimpan di lokasi yang berbeda dari server utama? | Server rusak tidak boleh membawa backup | |
| E3 | Apakah **uji pemulihan** dilakukan berkala (mis. per kuartal) dan siapa yang menjalankan serta melaporkan hasilnya? | Backup yang tidak pernah diuji belum terbukti dapat dipulihkan | |
| E4 | Apakah dapat dibuat backup tambahan **sebelum setiap migrasi production**? | Pengaman bila migrasi bermasalah | |

### F. Rahasia, log, dan ketersediaan

| No | Pertanyaan | Mengapa dibutuhkan | Jawaban |
|---|---|---|---|
| F1 | Bagaimana rahasia (password database, kunci aplikasi) disimpan dan diberikan ke aplikasi: variabel lingkungan atau secret store? | Rahasia tidak boleh ada di repository | |
| F2 | Apakah log aplikasi dikumpulkan oleh infra, dan berapa lama disimpan? | Penelusuran masalah; log aplikasi tidak memuat password | |
| F3 | Apakah satu server tanpa cadangan siaga dapat diterima untuk sistem ini? Bila ada kebijakan ketersediaan perusahaan, mohon dilampirkan. | Server tunggal berarti satu titik kegagalan | |
| F4 | Apakah waktu server disinkronkan (NTP) dan apa zona waktu server? | Tanggal dan jejak audit harus konsisten (aplikasi memakai zona Asia/Jakarta) | |

## Yang akan DEV serahkan setelah ada jawaban

- Spesifikasi kebutuhan sumber daya yang konkret (CPU, memori, disk) pada tahap Technical Design.
- Prosedur deploy dan rollback, serta daftar variabel konfigurasi yang dibutuhkan.
- Permintaan backup dan uji pemulihan dalam bentuk yang bisa langsung dijalankan infra.

Dokumen ini tidak memuat kredensial dan tidak boleh dilengkapi dengan kredensial.
