# Business Requirement Document

| | |
|---|---|
| Application Name | TBD (nama aplikasi belum ditetapkan) |
| Project/Feature Name | PMCP: Pemantauan Tahapan Project BA, Development, QA |
| Version No | 4.1 |
| Version Date | 2026-10-28 |
| Status | **APPROVED** (v4.1 disetujui Pemilik 2026-10-28 melalui CR-003 atas keputusan langsung, CD-175; v4.0 dan v3.5 SUPERSEDED, arsip di `arsip/`) |

## 2. Document Version & Authorization

### 2.1 Document History / Version

| Date | Author | Version | Change Reference |
|---|---|---|---|
| 2026-10-26 | BA Agent | 0.1 | Draf awal dari `lampiran/prompt-awal-pemilik.md` (10 modul) dan jawaban CL-002 s.d. CL-010 |
| 2026-10-26 | BA Agent | 0.2 | Scope dikecilkan atas permintaan pemilik ("mulai pelan-pelan"): 3 tahapan per project (BA, Development, QA), monitoring Manager, jadwal kerja per PIC (CL-011, CL-012, CL-013). Modul lain dipindah ke §3.3.3 (ditunda). v0.1 belum pernah di-commit sehingga teksnya digantikan; daftar kebutuhan 10 modul tetap ada di `lampiran/prompt-awal-pemilik.md` dan jawaban klarifikasinya di `clarification-log.md` |

| 2026-10-26 | BA Agent | 0.3 | Atribut project dirinci (ID otomatis, no. referensi, business owner, department, request date) dan satu tahapan boleh punya lebih dari satu PIC (CL-014). BR-02, BR-03, BR-05, BL-06 diubah; AS-03 diganti |

| 2026-10-26 | BA Agent | 0.4 | Atribut project ditambah: Jenis Project, Deskripsi, Aplikasi Terdampak (semua opsional) dan master Aplikasi Terdampak (CL-015). BR-02 dan BR-08 diubah |

| 2026-10-26 | BA Agent | 0.5 | Menambah BR-10 Daftar Project (pencarian, filter jenis, pagination, tombol Buat project) dan pilihan Aplikasi Terdampak dapat dicari dengan mengetik (CL-016) |

| 2026-10-26 | BA Agent | 0.6 | Menambah BR-11 Detail Project, dapat dibuka dari Daftar Project (CL-017) |

| 2026-10-26 | BA Agent | 0.7 | Gantt dapat dilihat semua peran untuk semua tahapan dan membuka detail project (BR-12); informasi project dapat diubah Manager dengan jejak perubahan (BR-11, BL-07); akses detail PIC diperluas ke semua project (CL-018) |

| 2026-10-26 | BA Agent | 0.8 | PIC (BA dan QA) juga boleh mengubah informasi project (CL-019); BR-11 diubah |

| 2026-10-26 | BA Agent | 0.9 | Daftar Project menampilkan nama PIC tiap tahapan; pencarian mencakup nama PIC (CL-020). BR-10 diubah |

| 2026-10-26 | BA Agent | 1.0 (DRAFT) | Filter PIC pada Gantt menyaring project, bukan tahapan (CL-021). BR-12 diubah |

| 2026-10-26 | BA Agent | 1.1 (DRAFT) | PIC dan estimasi tanggal tahapan boleh belum tersedia saat project dibuat; filter Kelengkapan perencanaan pada Daftar Project (CL-022). BR-03, BR-10, AS-03, AS-04 diubah |

| 2026-10-26 | BA Agent | 1.2 (DRAFT) | PIC boleh melengkapi PIC dan timeline tahapan yang masih kosong (CL-022). BL-06 diubah; belum ada tenggat pelengkapan. Filter Kelengkapan perencanaan tersedia di Daftar Project, Monitoring, dan Gantt |

| 2026-10-26 | BA Agent | 1.3 (DRAFT) | Filter Nama Project (pilihan ganda, dapat dicari dengan mengetik) pada Gantt dan Monitoring (CL-023). BR-04 dan BR-12 diubah |

| 2026-10-26 | BA Agent | 1.4 (DRAFT) | Rekomendasi perilaku estimasi: estimasi awal, revisi estimasi, hold, dan tanggal aktual, terlihat di Gantt (CL-024). BR-13 baru; BL-11 s.d. BL-17 baru. **Status: rekomendasi BA, menunggu keputusan pemilik** |

| 2026-10-26 | BA Agent | 1.5 (DRAFT) | Rekomendasi estimasi diputuskan pemilik (CL-024): tanpa persetujuan, tanpa pergeseran otomatis, kategori sesuai dan menjadi master, peringatan pada revisi ke-3. BR-08, BR-13, BL-12, BL-16, BL-18 diubah/ditambah |

| 2026-10-26 | BA Agent | 1.6 (DRAFT) | PIC tahapan dapat mengubah PIC tahapannya (CL-025). BL-06 diubah |

| 2026-10-26 | BA Agent | 1.7 (DRAFT) | Tahapan selesai pada Gantt tetap menampilkan jumlah revisi, estimasi awal, dan penanda terlambat (CL-026). BL-17 diubah |

| 2026-10-26 | BA Agent | 1.8 (DRAFT) | Gantt membedakan warna bagian waktu: tambahan hasil revisi dan telat dari estimasi terkini (CL-027). BL-17 diubah |

| 2026-10-27 | BA Agent | 1.9 (DRAFT) | Status project (Backlog, Berjalan, Ditunda, Batal, Selesai), ringkasan jumlah di atas layar, dan pemisahan per status pada Gantt (CL-028). BR-14, BL-20 s.d. BL-23 baru |

| 2026-10-27 | BA Agent | 2.0 (DRAFT) | Gantt dipaging per project untuk performa saat project bertambah banyak (CL-029). BR-12 diubah; BR-15 (performa) baru |

| 2026-10-27 | BA Agent | 2.1 (DRAFT) | Bagian status berjudul pada Gantt dihapus; status ditandai pada nama project (CL-030). BR-14 dan BR-12 diubah |

| 2026-10-27 | BA Agent | 2.2 (DRAFT) | Project pada Gantt diurutkan menurut tanggal mulai (CL-031). BR-12 dan BR-14 diubah |

| 2026-10-27 | BA Agent | 2.3 (DRAFT) | Menu Kanban untuk tim: tiga papan, kartu project, log activity per step, master step tahapan (CL-032). BR-16 dan BL-24 s.d. BL-30 baru. Kanban activity (di luar project) belum dirinci dan ditunda |

| 2026-10-27 | BA Agent | 2.4 (DRAFT) | Log activity tampil di detail project (CL-033). BR-20 baru |

| 2026-10-27 | BA Agent | 2.5 (DRAFT) | Kanban menjadi alat pelacak rencana kerja: kartu = item rencana dengan rentang tanggal, penanda rencana berjalan atau tidak, jadwal ulang, kepatuhan rencana, dan Kanban activity di luar project (CL-034). BR-16, BR-17 diubah; BR-21 dan BL-31 s.d. BL-37 baru; BL-26 tidak berlaku |

| 2026-10-27 | BA Agent | 2.6 (DRAFT) | Pilihan project pada kartu Kanban: Backlog, Berjalan, dan Ditunda; dapat dicari; konfirmasi ubah status menjadi Berjalan (CL-035). BL-25 diubah; BL-38 baru |

| 2026-10-27 | BA Agent | 2.7 (DRAFT) | Perilaku bila rencana kartu di luar estimasi tahapan (CL-036). BL-31 diubah; BL-39 baru |

| 2026-10-27 | BA Agent | 2.8 (DRAFT) | Istilah "carry-over" diganti **"Jadwal ulang"** pada seluruh spesifikasi (CL-037); kartu Monitoring "Rencana di luar estimasi" ditambahkan (BL-39 diperluas) |
| 2026-10-27 | BA Agent | 2.9 (DRAFT) | Rencana kartu yang melewati estimasi tahapan kini **merevisi estimasi tahapan secara otomatis** dengan pratinjau, kategori + catatan wajib, kartu asal tercatat, penggabungan revisi harian, tanpa opsi "simpan saja" (CL-038); BL-39 ditulis ulang |
| 2026-10-27 | BA Agent | 3.0 (DRAFT) | Progres kartu dan tahapan ditetapkan (CL-039): progres kartu, hitungan tahapan dari semua PIC berbobot hari kerja, penyesuaian manual, syarat Selesai, indikator tertinggal dari laju; BL-40 baru, BL-05 dan BL-08 diperbarui |
| 2026-10-27 | BA Agent | 3.1 (DRAFT) | Daftar Project dan Gantt digabung menjadi satu tab "Project" dengan satu bar filter; PIC dapat melihat tampilan Daftar (CL-040); BL-41 baru |
| 2026-10-27 | BA Agent | 3.2 (DRAFT) | Tab PIC "Jadwal Saya" dan "Tahapan Saya" digabung menjadi satu tab "Tahapan Saya" (CL-041); BL-42 baru |
| 2026-10-27 | BA Agent | 3.3 (DRAFT) | Tab Monitoring (Manager) dan Tahapan Saya (PIC) diganti **Dashboard Head BA & QA** dan **Dashboard PIC** (CL-042); BL-43 dan BL-44 baru, BL-42 SUPERSEDED |
| 2026-10-28 | BA Agent | 3.4 (DRAFT) | Penyempurnaan Dashboard PIC dan menu setelah validasi mockup (CL-043 s.d. CL-048): Assignment baru (BL-45), pilihan periode kapasitas Minggu/Bulan dengan rincian (BL-43, BL-44), aktivitas harian menjadi ringkasan kartu project dan di luar project (BL-44), menu baru Riwayat dengan tab Tahapan selesai dan Aktivitas harian (BL-46), sub menu per master (BL-47); BR-08 diperjelas |
| 2026-10-28 | BA Agent | 3.5 (DRAFT) | Hosting berubah dari Vercel menjadi **server lokal perusahaan**, database PostgreSQL di server lokal, backup oleh tim infra, CI/CD akan disediakan, pengguna kurang dari 20 orang (CL-049). §3.5.3 Constraints dan AS-01 diubah |
| 2026-10-28 | Pemilik | 3.5 (APPROVED) | Disetujui Pemilik (Human Approver) tanpa perubahan isi dari v3.5 DRAFT (CD-158). Perubahan berikutnya hanya lewat Change Request yang disetujui |
| 2026-10-28 | BA Agent | 4.0 (APPROVED, CD-169) | **CR-001** (permintaan pemilik, CL-053, CD-166): (1) BL-29: PIC **melihat kartu semua PIC** di papan Kanban dan hanya mengelola kartu miliknya, mengikuti mockup (sebelumnya "PIC hanya melihat kartunya"); (2) BL-30: **log tidak dapat diubah**, hanya dihapus oleh pemilik (rekomendasi menjadi keputusan); (3) BR-20: detail project juga memuat bagian **Rencana kerja** (hanya baca), mengikuti mockup; Manager baca saja di Kanban dipertahankan. Perubahan perilaku fungsional (major, CD-22) |
| 2026-10-28 | Pemilik | 4.1 (APPROVED, CD-175) | **CR-003** atas keputusan langsung pemilik: §5 Information Security Assessment menetapkan klasifikasi data **Internal** dan merujuk kebijakan password dan sesi pada Technology Baseline v1.0 §8 menggantikan TBD. Perubahan klarifikasi tanpa mengubah perilaku fungsional (minor, CD-22) |

### 2.2 Document Authorization

| Versi | Status | Penyetujui | Tanggal | Rujukan |
|---|---|---|---|---|
| 3.5 | SUPERSEDED oleh 4.0 | Pemilik (Head of Business Analyst, Human Approver) | 2026-10-28 | CD-158 |
| 4.0 | SUPERSEDED oleh 4.1 | Pemilik (Head of Business Analyst, Human Approver) | 2026-10-28 | CD-169 |
| 4.1 | APPROVED (baseline berlaku, CR-003) | Pemilik (Head of Business Analyst, Human Approver) | 2026-10-28 | CD-175 |

Persetujuan hanya oleh Pemilik (Human Approver) dan dicatat di `decision-log.md`. Agent tidak
menyetujui artifact buatannya sendiri. Dengan persetujuan ini, asumsi BA yang bertanda "belum
dikonfirmasi" di BRD dan clarification-log ikut menjadi bagian BRD yang disetujui sebagaimana
tertulis; item bertanda TBD atau ON HOLD (CL-007 approval, CL-008 laporan, metrik bisnis §3.2,
batas panjang isian AS-05) tetap terbuka dan bukan bagian yang disetujui sebagai keputusan.
Perubahan sesudah ini hanya lewat Change Request yang disetujui. Persetujuan v4.0 mencakup perubahan CR-001 saja (BL-29, BL-30, BR-20) dan tidak mengubah butir TBD atau ON HOLD di atas. Persetujuan v4.1 mencakup perubahan CR-003 saja (§5: klasifikasi data dan rujukan kebijakan password dan sesi).

## 3. Business Requirement Document

### 3.1 Project Background

Pemilik (Head of BA yang juga bertindak sebagai Head QA) membutuhkan sistem untuk memantau
progres project per tahapan dan agar setiap PIC tahu kapan harus bekerja.

Masalah saat ini (CL-001): setelah suatu tahapan selesai, status dan progres harus diperbarui
lewat rekonsiliasi manual dari lembar kerja terpisah. TASKMON dan TEAM-PLANNER tidak menyediakan
fungsi update oleh masing-masing tim. **TBD:** frekuensi dan beban rekonsiliasi tidak dijelaskan.

Keputusan pemilik: PMCP terpisah dan independen (CD-118); TASKMON dan TEAM-PLANNER SUPERSEDED
(CD-119); data dimulai bersih (CL-003); mulai dengan scope kecil (CL-011).

### 3.2 Business Metrics

TBD. Target terukur belum ditetapkan pemilik.

### 3.3 Project Scope

#### 3.3.1 In-Scope (disetujui Pemilik, v3.5, CD-158)

| ID | Kebutuhan bisnis |
|---|---|
| BR-01 | **Akun dan peran.** Login username dan password. Peran: Manager (Head of BA dan Head QA, satu peran, CL-012), PIC BA, PIC QA. Akun dibuat dan di-reset oleh Manager (CL-009) |
| BR-02 | **Project dengan tiga tahapan.** Setiap project memiliki tepat tiga tahapan: BA, Development, QA, berurutan (CL-011, CL-013). Atribut project: **ID Project** (dibuat otomatis oleh sistem, tidak diisi pengguna), **Nama Project** (wajib), **No. Referensi** (opsional; nomor referensi atau kode project, mis. nomor JIRA), **Business Owner** (opsional), **Department** (opsional), **Request Date** (opsional) (CL-014), **Jenis Project** (opsional; pilihan New atau Change Request), **Deskripsi Project** (opsional), **Aplikasi Terdampak** (opsional; boleh lebih dari satu, dipilih dari master Aplikasi Terdampak) (CL-015) |
| BR-03 | **Atribut tahapan.** Tiap tahapan punya satu atau lebih PIC (BA, QA, atau Development; satu peran boleh lebih dari satu PIC), estimasi tanggal mulai dan estimasi tanggal selesai, status, dan progres. **PIC dan estimasi tanggal tiap tahapan boleh belum diisi** saat project dibuat dan dilengkapi kemudian (CL-022). Tahapan tanpa PIC atau tanpa timeline ditandai "Belum ada PIC" / "Belum ada timeline" (status tahapan "Belum dijadwalkan"), tidak dianggap terlambat, dan tidak digambar sebagai bar pada Gantt. Estimasi tanggal diisi berpasangan (mulai dan selesai), atau dikosongkan keduanya Status dan progres berlaku per tahapan, bukan per PIC |
| BR-04 | **Monitoring oleh Manager.** Manager melihat semua project dan ketiga tahapannya sekaligus (siapa PIC, kapan, status, terlambat atau tidak), dan dapat menyaring, termasuk dengan filter Kelengkapan perencanaan (BR-10) dan filter Nama Project (pilihan ganda, dapat dicari dengan mengetik; kosong = semua project) |
| BR-05 | **Update tahapan.** PIC BA dan PIC QA memperbarui status dan progres tahapannya sendiri. Manager dapat memperbarui tahapan mana pun, termasuk Development |
| BR-06 | **Development tanpa login.** PIC Development hanya dicatat sebagai nama (CL-013). Manager memperbarui tahapan Development |
| BR-07 | **Jadwal kerja PIC.** Setiap PIC BA/QA melihat tahapan miliknya urut waktu: kapan mulai, kapan tenggat, sedang berjalan, akan datang, atau terlambat |
| BR-08 | **Master.** Manager mengelola (a) daftar PIC (BA, Development, QA), (b) master **Kategori Alasan Revisi Estimasi** (tambah, ubah nama, nonaktifkan/aktifkan; nilai awal: Ditahan lalu dilanjutkan, Terlambat dari estimasi, Perubahan scope, Perubahan sumber daya, Lainnya; minimal satu kategori aktif; pengaturan batas peringatan revisi) dan (c) master **Aplikasi Terdampak**: menambah, mengubah nama, dan menonaktifkan/mengaktifkan aplikasi. Nilai awal: Precentia Life, Group Insurance, AJK, Microsite, ELSA, ERIS, ESS (CL-015). Aplikasi tidak dihapus permanen; aplikasi nonaktif tidak dapat dipilih untuk project baru tetapi tetap tampil pada project yang sudah memakainya (BL-10). Master lain: Step Tahapan (BR-19), Kategori Activity (BL-36), dan Alasan Jadwal Ulang (BL-33). Semua master ditampilkan sebagai sub menu terpisah (BL-47) |
| BR-10 | **Daftar Project.** Layar daftar project dengan pagination (jumlah baris per halaman dapat dipilih), pencarian (ID, nama, nomor referensi, aplikasi terdampak), dan filter Jenis Project. Menampilkan ID, nama, jenis, aplikasi terdampak, business owner (format "Nama / Department"; bagian yang kosong ditampilkan "-"), rentang estimasi, **nama PIC dan status tiap tahapan** (BA, Development, QA; bila lebih dari satu PIC, semua nama ditampilkan), dan status project. Pencarian mencakup nama PIC. Filter **Kelengkapan perencanaan**: Semua, Belum lengkap (PIC atau timeline), Belum ada PIC, Belum ada timeline, Sudah lengkap; "Belum ada PIC" berarti minimal satu tahapan tanpa PIC, "Belum ada timeline" berarti minimal satu tahapan tanpa estimasi tanggal (dikonfirmasi pemilik, CL-022). Monitoring menampilkan jumlah project yang perlu dilengkapi dan membuka daftar terfilter Tombol "Buat project" membuka layar project baru; setelah disimpan pengguna kembali ke daftar. Pilihan Aplikasi Terdampak pada form dapat dicari dengan mengetik (CL-016) |
| BR-11 | **Detail Project.** Dari Daftar Project pengguna dapat membuka detail project: informasi project lengkap (ID, nomor referensi, jenis, business owner, department, request date, aplikasi terdampak, deskripsi), tiga tahapan (PIC, estimasi, progres, status), jadwal, dan riwayat perubahan project. Detail dapat dibuka dari Daftar Project, Monitoring, Tahapan Saya, dan Gantt. Manager dan PIC dapat membuka detail semua project (asumsi, CL-018). Tahapan diperbarui dari layar detail oleh yang berwenang (BL-06). **Informasi project dapat diubah oleh Manager dan oleh PIC BA/QA** (cakupan PIC: semua project, asumsi, CL-019) (nama, no. referensi, jenis, business owner, department, request date, aplikasi terdampak, deskripsi; ID dibuat sistem dan estimasi keseluruhan diturunkan dari tahapan, keduanya tidak diubah langsung). Setiap perubahan dicatat: siapa (Manager atau nama PIC), waktu, field, nilai lama, dan nilai baru, dan riwayatnya tampil di detail project (BL-07) |
| BR-12 | **Gantt.** Gantt menampilkan tahapan semua project untuk semua peran, dengan periode bulan ke bulan yang dapat digeser, filter PIC, tahapan, dan status, serta zoom hari/minggu/bulan, filter Kelengkapan perencanaan (sama seperti di Daftar Project), dan filter Nama Project (pilihan ganda, dapat dicari dengan mengetik). **Gantt dipaging per project** (bukan per baris tahapan atau per tanggal): bawaan 10 project per halaman, dapat dipilih 5, 10, 20, atau 50; urutan menurut tanggal mulai project; berganti filter, periode, atau ukuran halaman kembali ke halaman 1; ringkasan jumlah per status tetap menghitung seluruh project (CL-029). Area Gantt dapat digulir vertikal dan horizontal; header tanggal dan kolom nama tahapan tetap terlihat saat menggulir. **Filter PIC menyaring project** (hanya project yang melibatkan PIC terpilih ditampilkan), tetapi seluruh tahapan pada project itu tetap tampil, termasuk tahapan PIC lain; tahapan milik PIC terpilih disorot. PIC melihat tahapan PIC lain; tahapan milik sendiri ditandai dan dapat difilter ("Hanya milik saya"). Hanya PIC tahapan itu atau Manager yang dapat memperbarui tahapan. Nama project pada Gantt membuka detail project |
| BR-13 | **Perubahan estimasi, hold, dan aktual (diputuskan pemilik, CL-024).** Estimasi tahapan dapat berubah karena tahapan ditahan lalu muncul estimasi baru, atau karena pengerjaan aktual terlambat. Sistem menyimpan estimasi awal, setiap revisi estimasi (dengan alasan), periode hold, dan tanggal aktual; semuanya tercatat (siapa, kapan, apa) dan terlihat di detail project dan Gantt (CL-024) |
| BR-14 | **Status project.** Setiap project memiliki status: **Backlog, Berjalan, Ditunda, Batal, Selesai** (CL-028). Di bagian atas Daftar Project, Monitoring, dan Gantt tampil ringkasan jumlah project per status (dan total) yang dapat diklik untuk menyaring. Pada Gantt, setiap project diberi **penanda status pada namanya** (tanpa bagian berjudul dan tanpa fitur ciut); project **diurutkan menurut tanggal mulai** (tanggal mulai estimasi paling awal di antara tahapannya, dari yang terawal; project tanpa timeline di urutan terakhir, lalu menurut ID) dan dapat disaring lewat ringkasan status. Status dipilih saat membuat project (awal: Backlog) dan dapat diubah di informasi project |
| BR-15 | **Performa dan data besar (rekomendasi, menunggu konfirmasi).** Layar yang memuat banyak baris (Gantt, Daftar Project, Monitoring) hanya memuat data yang tampil: penyaringan dan pembagian halaman dilakukan di sisi server, bukan di browser, dan jumlah per status pada ringkasan dihitung sebagai agregat terpisah. Target waktu muat ditetapkan di FSD berdasarkan jumlah project yang diperkirakan (belum diberikan pemilik) |
| BR-16 | **Kanban (tahap pertama: kartu project).** Menu Kanban untuk tim dengan tiga papan: **Planned, In Progress, Done**. Kartu dibedakan dua jenis: **Kanban project** dan **Kanban activity** (di luar project). **Kartu adalah item rencana kerja** (bukan lagi satu kartu per project dan tahapan), sehingga Kanban dipakai melacak apakah rencana berjalan (BR-21). Kanban activity (di luar project) menggunakan struktur kartu yang sama dengan kategori dari master (CL-034) |
| BR-17 | **Kartu Kanban project.** PIC memilih project yang akan diproses dan hanya dapat membuat kartu untuk project yang ia ikuti sebagai PIC. Kartu menampilkan: **ID Project, Nama Project, Status Project, Tahapan yang diproses PIC, dan Estimasi waktu pengerjaan** (estimasi terkini tahapan itu, dengan penanda revisi). Kartu dapat dipindah antar papan oleh PIC pemilik kartu (seret atau tombol panah) |
| BR-18 | **Log activity pada kartu project.** PIC mencatat aktivitas yang dikerjakan pada kartu, dengan memilih **step pada tahapan** kartu itu dan mengisi **waktu pengerjaan** (tanggal, jam mulai, jam selesai; durasi dihitung). Kartu menampilkan total waktu tercatat dan total per step |
| BR-19 | **Master Step Tahapan.** Daftar step per tahapan (BA dan QA) dikelola Manager: tambah, ubah nama, ubah urutan, nonaktifkan/aktifkan; nilai awal mengikuti template tahap BA dan QA (CL-006). Tahapan Development belum memiliki step karena PIC Development tidak login |
| BR-20 | **Log activity pada detail project.** Detail project memuat bagian **Log activity** yang mengumpulkan semua log dari kartu Kanban project itu (semua PIC dan tahapan): tanggal, waktu, durasi, PIC, tahapan, step, dan uraian; dengan ringkasan total waktu (per tahapan dan per PIC), filter tahapan dan PIC, serta pembagian halaman. Siapa pun yang dapat membuka detail project dapat melihatnya (asumsi: PIC dapat melihat log PIC lain pada project yang sama, CL-033). Detail project juga memuat bagian **Rencana kerja** (kartu rencana project itu, hanya baca; CR-001, CL-053) |
| BR-21 | **Kanban sebagai pelacak rencana kerja.** Setiap kartu berisi judul rencana, **rentang tanggal rencana** (bebas), estimasi jam (opsional), dan penanda dadakan. Sistem menandai otomatis apakah rencana berjalan (BL-32), mencatat pemindahan rencana (jadwal ulang) dengan alasan dari master (BL-33), dan menghitung **kepatuhan rencana** per PIC dan periode yang **terlihat oleh semua pengguna** (BL-34). PIC merencanakan sendiri; pekerjaan dadakan dapat ditambahkan kapan saja dan ditandai terpisah. Kartu activity di luar project memakai kategori dari master dan boleh direncanakan atau ditambahkan sebagai dadakan (CL-034) |
| BR-09 | **Jejak perubahan.** Perubahan tanggal, PIC, dan status tahapan dicatat (siapa, kapan, nilai lama dan baru) |

#### 3.3.2 Out-of-Scope (rilis ini)

Lihat §3.3.3. Selain itu: integrasi SSO, aplikasi mobile native, approval formal (ON HOLD, CL-007).

#### 3.3.3 Ditunda ke fase berikut (bukan dibuang)

Asumsi BA, menunggu konfirmasi pemilik (CL-011): perencanaan kapasitas (jam, cuti, libur nasional,
ambang 98%-102%, CL-005), Gantt penuh, work queue rinci, Daily Activity, perencanaan non-project,
riwayat individu, laporan dan ekspor (ON HOLD, CL-008), template 9 tahap BA/QA (CL-006), serta
dependensi antar work item. Jawaban klarifikasi untuk modul itu tetap tersimpan di
`clarification-log.md`.

### 3.4 High Level Flow

#### 3.4.1 Current Flow

Tahapan pekerjaan selesai, lalu status dan progresnya diperbarui lewat rekonsiliasi manual dari
lembar kerja terpisah (CL-001). Anggota tim belum punya sarana update sendiri.

#### 3.4.2 Future Flow (usulan)

```text
Manager: buat project → atur 3 tahapan (BA, Development, QA): PIC, tanggal mulai, tanggal selesai
PIC BA/QA: lihat jadwal kerja saya → kerjakan → perbarui status dan progres tahapan
Manager: pantau semua project dan tahapan → atur ulang tanggal/PIC bila perlu
         (perubahan tercatat)
```

### 3.5 Business Rules

#### 3.5.1 Business Logic (disetujui Pemilik, v3.5, CD-158; asumsi BA yang bertanda belum dikonfirmasi tercatat di clarification-log)

| ID | Aturan |
|---|---|
| BL-01 | Satu project memiliki tepat tiga tahapan: BA, Development, QA |
| BL-02 | Tahapan diurutkan BA, Development, QA, tetapi tanggal bebas diatur Manager, boleh tumpang tindih; tidak ada kunci otomatis (CL-013) |
| BL-03 | Tanggal selesai tidak boleh sebelum tanggal mulai |
| BL-04 | Tahapan terlambat bila tanggal selesai lewat dan status belum Selesai |
| BL-05 | Status tahapan (usulan, TBD): Belum Mulai, Berjalan, Selesai. Status "Selesai" mensyaratkan progres 100% dan tidak ada kartu terbuka (lihat BL-40) |
| BL-06 | PIC BA/QA yang ditugaskan pada suatu tahapan dapat memperbarui status dan progres tahapan itu (usulan: siapa pun dari PIC tahapan itu). **PIC BA/QA mana pun dapat melengkapi PIC dan/atau timeline tahapan mana pun (termasuk Development) yang masih kosong** (CL-022); bagian yang sudah terisi hanya dapat diubah Manager, **kecuali PIC tahapan itu dapat mengubah PIC tahapannya** (serah terima atau penambahan PIC; CL-025) dan merevisi estimasi lewat revisi beralasan (BL-12). PIC yang bukan PIC tahapan itu tidak dapat mengubah status dan progresnya. Tahapan Development tetap diperbarui statusnya oleh Manager (PIC Development tidak login). Revisi estimasi dan hold oleh PIC tahapan mengikuti BL-12, BL-13, dan BL-16 |
| BL-07 | Perubahan tanggal, PIC, status, dan informasi project dicatat: pelaku (dari sesi login), waktu (tanggal dan jam, diambil server, tidak diisi pengguna), field yang berubah, nilai lama, dan nilai baru. Catatan tidak dapat diubah atau dihapus pengguna. Perubahan tanpa nilai berbeda tidak dicatat |
| BL-08 | Progres tahapan: ditetapkan pada BL-40 (menggantikan usulan awal) |
| BL-09 | Tanggal ditampilkan dd/mm/yyyy dan tidak bergeser antar zona waktu; zona bisnis Asia/Jakarta (CL-010) |
| BL-10 | Project, tahapan, dan akun tidak dihapus permanen; riwayat tetap ada |
| BL-11 | **Estimasi awal.** Estimasi pertama yang diisi (mulai dan selesai) tersimpan sebagai estimasi awal dan tidak dapat diubah (rekomendasi) |
| BL-12 | **Revisi estimasi.** Setiap perubahan tanggal setelah estimasi awal adalah revisi bernomor (Revisi 1, 2, ...), tidak menimpa; wajib kategori alasan (dipilih dari master Kategori Alasan Revisi Estimasi; nama kategori disimpan pada revisi sehingga riwayat tidak berubah bila master diubah) dan catatan; mencatat estimasi sebelum dan sesudah, pelaku, dan waktu. Estimasi sama dengan yang berlaku ditolak (rekomendasi) |
| BL-13 | **Hold.** Status "Ditahan" mensyaratkan alasan; sistem mencatat tanggal mulai hold. Selama ditahan tahapan tidak dihitung terlambat. Saat dilanjutkan, sistem menyarankan (tidak mewajibkan) revisi estimasi; periode dan alasan hold tersimpan sebagai riwayat (rekomendasi) |
| BL-14 | **Terlambat.** Tahapan yang melewati estimasi terkini tanpa selesai ditandai terlambat dan dihitung hari keterlambatannya terhadap estimasi terkini dan estimasi awal. **Sistem tidak mengubah tanggal otomatis**; PIC atau Manager memilih membiarkan tercatat terlambat atau merevisi estimasi dengan kategori "Terlambat dari estimasi" (rekomendasi) |
| BL-15 | **Tanggal aktual.** Mulai aktual terisi saat tahapan pertama kali berstatus Berjalan; selesai aktual terisi saat Selesai. Selisih aktual terhadap estimasi terkini dan estimasi awal ditampilkan (rekomendasi) |
| BL-16 | **Hak.** Manager dan PIC tahapan yang bersangkutan dapat merevisi estimasi dan menahan tahapan, **tanpa persetujuan** (cukup tercatat, diputuskan pemilik); PIC lain tidak. Mengisi estimasi awal yang masih kosong mengikuti BL-06 (rekomendasi) |
| BL-18 | **Peringatan revisi berulang.** Bila suatu tahapan sudah direvisi sebanyak batas peringatan (nilai awal **3 kali**, dapat diubah Manager di master), sistem menampilkan peringatan: penanda pada kartu tahapan, detail project, dan Gantt; peringatan di dialog sebelum revisi berikutnya; dan pemberitahuan setelah revisi yang mencapai batas, dicatat di jejak perubahan. Peringatan tidak memblokir revisi |
| BL-19 | **Tidak ada pergeseran otomatis.** Perubahan estimasi satu tahapan tidak menggeser tahapan lain; hanya ditampilkan peringatan tumpang tindih (diputuskan pemilik) |
| BL-20 | **Status project** (BR-14) dipilih pengguna; berbeda dari status tahapan. Status Ditunda dan Batal mensyaratkan alasan, yang ditampilkan di daftar dan detail |
| BL-21 | Status **Selesai** hanya dapat dipilih bila semua tahapan sudah berstatus Selesai; project baru tidak dapat langsung Selesai (rekomendasi, belum dikonfirmasi) |
| BL-22 | Tahapan hanya ditandai **terlambat** bila project berstatus **Berjalan**; project Backlog, Ditunda, Batal, atau Selesai tidak memunculkan peringatan keterlambatan (rekomendasi, belum dikonfirmasi) |
| BL-23 | Perubahan status project dicatat (siapa, kapan, status lama dan baru, alasan) mengikuti BL-07 |
| BL-24 | PIC hanya dapat membuat kartu Kanban project untuk **project yang ia ikuti sebagai PIC** dan untuk tahapan yang ia kerjakan (BA atau QA); dipaksa di sisi server (BR-17) |
| BL-25 | Kartu baru dapat dibuat untuk project berstatus **Backlog, Berjalan, atau Ditunda** yang diikuti PIC sebagai PIC; project Batal dan Selesai tidak ditampilkan dan ditolak di sisi server. Daftar project dapat dicari dengan mengetik ID atau nama (CL-035) |
| BL-38 | **Konfirmasi ubah status.** Saat PIC memilih project berstatus **Backlog atau Ditunda**, sistem menanyakan apakah status project diubah menjadi **Berjalan** (jawaban wajib: "Ya, jadikan Berjalan" atau "Biarkan {status}"). Perubahan hanya diterapkan saat kartu disimpan; perubahan dicatat (siapa, kapan, status lama dan baru, sebab kartu); alasan status Ditunda dihapus bila menjadi Berjalan. Project Berjalan tidak memunculkan pertanyaan |
| BL-26 | ~~Satu PIC hanya satu kartu per project dan tahapan~~ **tidak berlaku** sejak kartu menjadi item rencana (banyak item per project dan tahapan; BR-21) |
| BL-27 | Kartu dan papan Kanban adalah **catatan kerja PIC dan tidak mengubah status tahapan maupun status project** (rekomendasi, belum dikonfirmasi) |
| BL-28 | Log activity: tanggal tidak di masa depan; step wajib dari step aktif tahapan kartu; jam selesai setelah jam mulai; uraian wajib; **tidak boleh bentrok waktu** dengan log PIC yang sama pada tanggal yang sama (lintas kartu); total waktu per hari melebihi 8 jam menampilkan **peringatan**, tidak memblokir (CL-005); nama step disimpan pada log sehingga riwayat tidak berubah bila master diubah |
| BL-29 | Hak akses (CR-001, diputuskan pemilik, CL-053): **PIC melihat kartu semua PIC pada papan Kanban (dapat difilter)**, tetapi **hanya dapat membuat, memindahkan, mengubah, menjadwal ulang, membatalkan kartu, dan mengelola log milik sendiri**; kartu PIC lain dapat dibuka hanya baca. **Manager melihat kartu semua PIC (dapat difilter) secara baca saja** (dipertahankan mengikuti mockup) |
| BL-30 | Log dapat dihapus oleh PIC pemilik kartu dengan konfirmasi; **log tidak dapat diubah** (diputuskan pemilik, CR-001, CL-053) |
| BL-31 | **Rencana.** Rencana berupa rentang tanggal bebas (mulai dan selesai), dibuat PIC sendiri untuk dirinya; estimasi jam opsional; rencana awal disimpan dan tidak berubah. Perilaku bila rencana melewati estimasi tahapan: revisi otomatis, lihat BL-39 |
| BL-32 | **Penanda rencana (otomatis):** *Belum dimulai* (masih Planned setelah tanggal mulai rencana); *Melewati rencana n hr* (belum Done setelah tanggal selesai rencana); *Sesuai rencana* (Done pada atau sebelum tanggal selesai rencana); *Terlambat n hr* (Done setelah tanggal selesai rencana); *Dadakan*; *Melebihi estimasi jam*; *Jadwal ulang n×* |
| BL-33 | **Jadwal ulang.** Memindahkan rencana ke tanggal lain wajib memilih **alasan dari master Alasan Jadwal ulang** (catatan opsional); rencana awal tetap; setiap perpindahan tercatat (siapa, kapan, dari dan ke); **peringatan saat pemindahan mencapai batas (awal 3 kali, dapat diatur Manager di master)**; peringatan tidak memblokir |
| BL-34 | **Kepatuhan rencana** = jumlah kartu selesai tepat waktu dibagi jumlah kartu rencana yang sudah jatuh tempo pada periode itu (berdasar tanggal selesai rencana); **kartu dadakan tidak masuk penyebut**; ditampilkan per PIC dengan rincian (direncanakan, tepat waktu, terlambat, lewat belum selesai, belum jatuh tempo, jadwal ulang, dadakan); terlihat semua pengguna; periode: minggu ini, minggu lalu, bulan ini, atau rentang tanggal |
| BL-35 | **Pembatalan.** PIC pemilik dapat membatalkan kartu yang belum Done dengan alasan wajib; kartu dibatalkan keluar dari papan dan dari perhitungan kepatuhan, tetap tercatat di daftar "Dibatalkan" |
| BL-36 | **Kartu activity (di luar project)** memakai kategori dari master Kategori Activity; log tanpa step; tidak terhubung ke project |
| BL-37 | Memindahkan kartu ke **Done** mengisi tanggal selesai (hari ini); memindahkan kembali mengosongkannya. Papan menampilkan kartu yang belum Done dan kartu yang rencananya atau selesainya beririsan dengan periode terpilih |
| BL-39 | **Rencana melewati estimasi tahapan: estimasi tahapan direvisi otomatis** (diputuskan pemilik, CL-036 dan CL-038; menggantikan versi awal BL-39 "simpan saja atau revisi"). Pemeriksaan dilakukan **sebelum menyimpan** pada kartu project baru (termasuk dadakan project) dan pada jadwal ulang, dengan selisih dalam **hari kerja (Senin-Jumat)**. (a) **Selesai melewati estimasi tahapan:** sistem menampilkan pratinjau ("Estimasi tahapan akan otomatis direvisi dari X menjadi Y, Revisi ke-n"), PIC **wajib** memilih kategori alasan (master) dan mengisi catatan; **tidak ada pilihan menyimpan tanpa merevisi**. Saat disimpan, kartu tersimpan dan estimasi tahapan direvisi sampai tanggal selesai rencana (hanya tanggal selesai yang diperpanjang) sebagai revisi sesuai BL-12 (tanpa persetujuan, BL-16) dengan peringatan batas revisi BL-18; riwayat revisi mencatat **kartu asal**, pelaku, waktu, kategori, dan catatan. (b) Beberapa perpanjangan oleh **PIC yang sama pada tahapan yang sama dalam satu hari digabung menjadi satu revisi** (diperbarui, tidak menambah hitungan). (c) Rencana **mulai lebih awal** dari estimasi tahapan hanya informasi (estimasi mulai tidak dimajukan). (d) Estimasi tahapan **tidak mengecil otomatis**; memperpendek dilakukan **manual** oleh PIC/Manager, sistem hanya menyarankan bila estimasi lebih panjang dari rencana kartu terakhir. (e) Tahapan berstatus **Selesai**: kartu baru untuk tahapan itu **ditolak** ("Tahapan ini sudah selesai."). (f) Tahapan lain tidak digeser otomatis (BL-19; hanya peringatan tumpang tindih). Kartu activity di luar project tidak terpengaruh. (g) Tahapan belum punya estimasi: PIC dapat menjadikan rentang rencana sebagai estimasi awal. (h) **Pergeseran estimasi tahapan dari estimasi awal (hari kerja)** ditampilkan di detail project dan Gantt/Monitoring. (i) **Monitoring** menampilkan kartu angka **"Estimasi diperpanjang lewat rencana"** (jumlah kartu project aktif yang memperpanjang estimasi tahapan; terlihat semua pengguna), klik membuka Kanban dengan filter "Hanya yang memperpanjang estimasi tahapan". Kepatuhan rencana (BL-34) tidak terpengaruh. Libur nasional belum dihitung sebagai hari non-kerja |
| BL-40 | **Progres kartu dan tahapan** (diputuskan pemilik, CL-039). (a) **Kartu:** Planned = 0%, Done = 100%; saat In Progress PIC pemilik kartu memilih 25 / 50 / 75% (atau 0%); belum diisi dianggap 0% (sistem tidak menebak dari jam log). Kartu dikembalikan dari Done ke In Progress: progres direset ke 0% dan PIC wajib memilih ulang ("Progres perlu diisi"). Setiap perubahan progres kartu dicatat (siapa, kapan, dari-ke); alasan tidak wajib. Berlaku untuk kartu project dan activity; hanya kartu project memengaruhi tahapan. (b) **Tahapan (hitungan sistem):** rata-rata progres **semua kartu aktif tahapan itu dari semua PIC**, dibobot **jumlah hari kerja rencana** tiap kartu (minimal 1); kartu dibatalkan tidak dihitung; maksimal 99% selama tahapan belum Selesai. Tahapan dengan dua PIC memakai satu angka gabungan; detail menampilkan rincian per PIC (jumlah kartu dan progres), terlihat semua pengguna. Bila salah satu PIC belum punya kartu di tahapan itu, tampil peringatan; angka tidak berubah. (c) **Penyesuaian manual:** salah satu PIC tahapan atau Manager boleh menimpa progres tahapan (0-99%) dengan **catatan wajib**; tanda "disesuaikan manual oleh ..." dan hitungan sistem tetap terlihat; dicatat di jejak perubahan (nilai terakhir berlaku); dapat dikembalikan ke hitungan sistem. Tahapan tanpa kartu rencana diisi manual langsung (tanpa catatan wajib). (d) **Selesai:** salah satu PIC tahapan boleh menandai Selesai (progres otomatis 100%) hanya bila **tidak ada kartu terbuka milik siapa pun** di tahapan itu; bila ada, ditolak dengan menyebut pemilik kartu terbuka. **Manager** boleh melewati syarat ini dengan catatan wajib (dicatat). (e) **Tertinggal dari laju:** progres diharapkan = hari kerja yang sudah lewat ÷ total hari kerja estimasi tahapan; tahapan Berjalan pada project Berjalan dengan progres lebih rendah dari progres diharapkan lebih dari **20 poin persen** diberi penanda "Tertinggal" (Gantt, kartu tahapan, detail project; detail menyebut PIC dengan progres terendah) dan dihitung pada kartu Monitoring "Tertinggal dari laju" (klik memfilter daftar). Dihitung di level tahapan, bukan per PIC |
| BL-41 | **Tab Project (Daftar dan Gantt digabung)** (diputuskan pemilik, CL-040). Daftar Project dan Gantt menjadi **satu tab "Project"** dengan pilihan tampilan **Daftar \| Gantt**; tampilan awal **Gantt**; tampilan terakhir diingat selama sesi. **Satu bar filter dipakai bersama** (cari, nama project, status project, PIC, tahapan, status tahapan, jenis project, kelengkapan perencanaan, "hanya milik saya" untuk PIC) dan tidak hilang saat berpindah tampilan; pengaturan periode dan skala waktu hanya pada tampilan Gantt. Project tampil bila memenuhi semua filter dan minimal satu tahapannya memenuhi filter tahapan. **PIC juga dapat membuka tampilan Daftar** (hanya melihat dan membuka detail); tombol "Buat project" hanya untuk Manager. Isi BR-10 (Daftar Project) dan BR-12 (Gantt) tetap berlaku sebagai dua tampilan pada tab yang sama |
| BL-42 | **[SUPERSEDED oleh BL-44, CL-042] Tab Tahapan Saya (PIC)** (diputuskan pemilik, CL-041; menggabungkan "Jadwal Saya" dan "Tahapan Saya"). Satu tab menampilkan tahapan milik PIC yang login: bagian **Aktif** (belum Selesai), urut tanggal mulai, dengan kolom Project, Tahapan, Mulai, Tenggat, Keterangan (mis. "Mulai 3 hari lagi", "Lewat tenggat 2 hari"), Progres, penanda "Tertinggal", dan tombol **Perbarui**; bagian **Riwayat tahapan selesai** yang dapat dilipat (tanpa tombol Perbarui). Menu PIC: Tahapan Saya (tampilan awal), Project, Kanban. Hak ubah tidak berubah (BL-06, BL-40). Kebutuhan jadwal kerja PIC (BR-07) dipenuhi tab ini dan tampilan Gantt pada tab Project |
| BL-43 | **Dashboard Head BA & QA** (diputuskan pemilik, CL-042; menggantikan tab Monitoring, BR-04). Tab pertama Manager. Baris ringkasan (klik membuka Gantt/Daftar/Kanban terfilter): tahapan terlambat, tertinggal dari laju, jatuh tempo 7 hari, PIC kelebihan beban, tahapan ditahan, estimasi diperpanjang lewat rencana, perlu dilengkapi. Lima bagian yang menjawab lima pertanyaan Head: **(1)** project terlambat atau berisiko (terlambat, tertinggal, ditahan, revisi mencapai batas peringatan), diurut dari keterlambatan terlama; **(2)** tahapan berjalan yang jatuh tempo dalam 7 hari; **(3)** beban dan kapasitas per PIC pada periode terpilih (Minggu atau Bulan dengan tombol sebelumnya/berikutnya, bawaan minggu berjalan; kartu ringkasan di atas tetap minggu berjalan, CL-044): tersedia (hari kerja x 8 jam), terencana (estimasi jam kartu, dibagi rata per hari kerja rencana), aktual (jam log), utilisasi, sisa kapasitas, dengan status Masih tersedia (di bawah 98%), Mendekati kapasitas (98%-102%), Kelebihan beban (di atas 102%) sesuai CL-005a; **(4)** jumlah tahapan dan kartu yang ditangani BA dan QA; **(5)** pencatatan aktivitas: jam tercatat terhadap jam kerja berjalan (Baik 80% atau lebih, Kurang 50%-79%, Rendah di bawah 50%), kartu berjalan tanpa log 3 hari atau lebih, dan kepatuhan rencana (BL-34). Cuti dan libur nasional belum dihitung pada mockup. Stage list dan filter yang sebelumnya ada di Monitoring tersedia di tab Project |
| BL-44 | **Dashboard PIC** (diputuskan pemilik, CL-042; menggantikan tab Tahapan Saya, BL-42). Tab pertama PIC, satu struktur untuk BA dan QA yang menyesuaikan diri lewat peran dan data penugasan (tahapan dan step mengikuti workflow project, bukan daftar tetap). Ringkasan pribadi: assignment baru, pekerjaan aktif, terlambat, jatuh tempo 7 hari, aktivitas hari ini. Bagian: **Assignment baru** (BL-45; tampil bila ada), **Antrean pekerjaan** (tahapan aktif menurut prioritas: paling terlambat, tertinggal dari laju, lalu tenggat terdekat; kolom keterangan, progres, step fokus dari kartu yang belum selesai, dan dependency: tahapan sebelumnya belum selesai, hanya informasi dan tidak memblokir; tombol Perbarui); **Timeline proyek saya** (Gantt kecil penugasan pribadi, dengan daftar benturan jadwal antar tahapan sendiri); **Kapasitas saya** (CL-044: pilihan periode Minggu atau Bulan dengan tombol sebelumnya/berikutnya; ringkasan tersedia, terencana, aktual, sisa, utilisasi, status; rincian per hari kerja pada mode Minggu dan per minggu kerja pada mode Bulan; jam terencana harian adalah perkiraan karena estimasi jam kartu dibagi rata per hari kerja rencana); **Aktivitas harian** (CL-045: tombol Buat kartu dan Dadakan, serta **ringkasan hitungan tanpa daftar**, dipisah antara kartu project dan kartu activity di luar project, masing-masing jumlah Planned, In Progress, dan Terlambat dari semua kartu Kanban PIC yang belum Done; Terlambat = tanggal selesai rencana sudah lewat dan termasuk dalam Planned atau In Progress; plus jumlah kartu selesai hari ini; klik angka membuka Kanban pada jenis itu); **Riwayat proyek saya** (hanya satu baris ringkas: jumlah tahapan selesai dan yang terakhir, dengan tautan ke menu Riwayat, BL-46) |
| BL-45 | **Assignment baru** (CL-043). Tahapan yang baru ditugaskan kepada PIC (project dibuat dengan PIC tersebut, atau PIC ditambahkan oleh orang lain) ditandai **baru** sampai PIC membuka detail project itu dari layar mana pun; tidak ada tombol terima karena approval ditunda (CL-007). Dashboard PIC menampilkan kartu angka **Assignment baru** dan seksi daftar kartu (project, tahapan, estimasi, penugas, tanggal, tombol Buka detail); baris di Antrean pekerjaan diberi chip Baru. Setelah detail dibuka, tahapan itu dihitung di **Pekerjaan aktif** (kedua angka saling lepas). PIC yang menambahkan dirinya sendiri dan PIC Development tidak menghasilkan penanda baru; PIC yang dilepas dari tahapan kehilangan penandanya. Perubahan estimasi setelah dilihat tidak memunculkan penanda baru lagi (asumsi BA). Mockup menyimpan penanda dalam sesi; penyimpanan per PIC di basis data ditentukan di FSD |
| BL-46 | **Menu Riwayat** (CL-046, CL-047; PIC dan Manager). Dua tab. **(a) Tahapan selesai:** tahapan project yang sudah Selesai (selain project Batal) dengan project, tahapan, estimasi, tanggal selesai aktual, output (judul kartu selesai), dan jam terencana terhadap aktual; pencarian nama/ID project, filter tahapan dan periode selesai, pagination. **(b) Aktivitas harian:** apa yang dikerjakan per hari dari log kartu Kanban, mode Hari atau Minggu dengan tombol sebelumnya/berikutnya dan isian tanggal; ringkasan total jam, jumlah log, jam kartu project, dan jam kartu activity; tiap hari memuat total jam terhadap 8 jam dengan penilaian Baik/Kurang/Rendah (ambang BL-43 bagian 5) dan daftar log berurut jam (jam mulai-selesai, durasi, jenis kartu, judul, project dan tahapan atau kategori activity, step, keterangan, tautan ke kartu). Akhir pekan tampil hanya bila ada log. Hanya baca; log diubah lewat kartu Kanban (BL-30). **Hak lihat:** PIC hanya melihat milik sendiri (diputuskan pemilik, CL-046); Manager melihat semua PIC dengan memilih PIC (asumsi BA) |
| BL-47 | **Sub menu Master** (CL-048). Menu Master dibagi sub menu per master, satu master tampil dalam satu waktu: Aplikasi Terdampak, Kategori Alasan Revisi, Step Tahapan, Kategori Activity, Alasan Jadwal Ulang, PIC, dan Jejak Perubahan (ditaruh di sini oleh BA, bukan master; mohon konfirmasi). Perilaku masing-masing master tidak berubah (BR-08, BR-19, BL-33, BL-36) |
| BL-17 | **Gantt.** Bar menunjukkan estimasi terkini; estimasi awal (garis putus-putus) tampil bila berbeda; aktual (garis di bawah bar, dengan jeda saat hold); hold (pola garis miring dan ikon jeda); jumlah revisi (R n). Lapisan estimasi awal dan aktual dapat disembunyikan. **Bagian waktu dibedakan warna:** bagian estimasi terkini yang melewati estimasi awal (tambahan waktu hasil revisi) berwarna kuning bergaris di dalam bar, dan bagian aktual yang melewati estimasi terkini (telat murni) berwarna merah bergaris setelah ujung bar dengan jumlah hari ("+n hr"). Warna dasar bar tetap menurut tahapan (BA, Development, QA). **Tahapan yang sudah selesai (100%) tetap menampilkan** tanggal selesai aktual, jumlah revisi (atau "Tanpa revisi"), estimasi awal, dan penanda keterlambatan: "Telat +n hari" (selesai setelah estimasi terkini, bar diberi garis tepi merah) atau "Lewat estimasi awal +n hari" (tepat waktu terhadap estimasi terkini tetapi melewati estimasi awal) (CL-026). Detail project memuat riwayat estimasi dan penahanan (rekomendasi) |

#### 3.5.2 Assumptions

| ID | Asumsi | Status |
|---|---|---|
| AS-01 | Pengguna kecil (tim BA dan QA di bawah Head of BA) | Kurang dari 20 orang (dijawab pemilik, CL-049) |
| AS-02 | Satu pengguna satu peran | Belum dikonfirmasi |
| AS-03 | Satu tahapan boleh memiliki satu atau lebih PIC, atau belum ada PIC | Dikonfirmasi pemilik (CL-014, CL-022) |
| AS-06 | Nama aplikasi unik (tanpa membedakan huruf besar kecil) dan maksimum 50 karakter; deskripsi maksimum 1000 karakter | Usulan BA, belum dikonfirmasi |
| AS-04 | Estimasi tanggal tahapan boleh dikosongkan saat project dibuat | Dikonfirmasi pemilik (CL-022); aturan berpasangan (mulai dan selesai) adalah usulan BA |
| AS-05 | Panjang maksimum isian teks (nama, referensi, owner, department) | TBD, mockup memakai 100/50/100/100 sebagai contoh |

#### 3.5.3 Constraints

Arah dari pemilik (CL-009, hosting diubah oleh CL-049 pada 2026-10-28): deployment di server lokal
perusahaan yang dapat diakses tim pemilik (tanpa Vercel), database PostgreSQL di server lokal, backup oleh tim infra
perusahaan, CI/CD akan disediakan, login username dan password. Ini bukan Technology Baseline; baseline formal disusun DEV dan disetujui
pemilik. Antarmuka berbahasa Indonesia, tanggal dd/mm/yyyy (CL-010). Source code, bila ada, di
`source/PMCP/`.

## 4. Risk Analysis

| ID | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| RK-01 | Penundaan modul lain belum dikonfirmasi (asumsi BA) | Salah scope | Konfirmasi CL-011 |
| RK-02 | Status dan rumus progres belum final | Angka monitoring tidak sepakat | Tetapkan di FSD setelah konfirmasi pemilik |
| RK-03 | Tahapan Development tanpa login membuat Manager menjadi satu-satunya pengubah | Data Development bisa terlambat diperbarui | Dicatat; tinjau setelah pemakaian awal |
| RK-04 | Multi-user dengan data kerja | Perubahan data oleh pihak tidak berwenang | Hak akses di sisi server dan jejak perubahan |

## 5. Information Security Assessment

Login username dan password per PIC; akun dibuat dan di-reset Manager. **Klasifikasi data: Internal**
(diputuskan pemilik, CR-003, CD-175): data yang tersimpan adalah nama PIC, username, hash password, dan
data kerja (project, tahapan, kartu, log, jejak perubahan); tidak ada data pribadi sensitif, finansial,
atau data nasabah. Perlakuan: akses hanya pengguna ber-akun dari jaringan kantor, transport HTTPS, backup
oleh tim infra, tanpa data sensitif pada log. **Kebijakan password dan sesi:** mengikuti Technology Baseline
v1.0 §8 yang disetujui pemilik (CL-050).

## 6. Attachment

`lampiran/prompt-awal-pemilik.md` (sumber mentah awal, 10 modul)

## 7. References

`clarification-log.md` (CL-001 s.d. CL-013), `decision-log.md` (CD-118, CD-119, CD-120)
