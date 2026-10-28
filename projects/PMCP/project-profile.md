# PMCP: Project Monitoring & Capacity Planning System (BA & QA)
Status: NEW, tahap BA intake, belum ada requirement terkonfirmasi (2026-10-26)
status_kind: new
Owner: Head of Business Analyst
Approver: Head of Business Analyst (Human Approver)
Reference: belum ada artifact APPROVED; sumber mentah `ba/lampiran/prompt-awal-pemilik.md`
Framework: TBD, Technology Baseline belum ditetapkan (draf v0.2 di `dev/technology-baseline.md`; arah pemilik: server lokal + PostgreSQL, CL-049, menggantikan Vercel di CL-009)
Subtitle: Sistem web untuk monitoring project, perencanaan kapasitas, dan pencatatan aktivitas harian tim BA dan QA.

## Ringkasan & Latar Belakang

Pemilik (Head of BA yang membawahi tim BA dan QA) meminta sistem terintegrasi untuk memonitor
progres dan deadline project, merencanakan beban kerja dan kapasitas anggota BA/QA, mencatat
aktivitas harian (project dan non-project), serta menghasilkan laporan manajemen. Detail
permintaan awal ada di `ba/lampiran/prompt-awal-pemilik.md` (sumber mentah, bukan requirement).

Latar belakang bisnis rinci, masalah yang diselesaikan, dan alasan membuat sistem terpisah dari
TASKMON dan TEAM-PLANNER belum dijelaskan pemilik. Jangan dikarang; dicatat sebagai
Clarification di `ba/clarification-log.md`.

## Tujuan & Ruang Lingkup

TBD. Ruang lingkup diusulkan lewat BA (BRD) dan dikonfirmasi pemilik. Prompt awal memuat
sepuluh modul (Dashboard, Project, Workflow/Stage, Gantt, Work Queue, Capacity Planning,
Daily Activity, Non-project Work, Project History, Reports) dan multi-role (Manager, BA, QA),
tetapi itu masih usulan mentah.

## Pemisahan dari Project Lain

Project baru yang terpisah dan independen (keputusan pemilik 2026-10-26, CD-118). TASKMON dan
TEAM-PLANNER tidak menjadi fakta untuk PMCP (Project Separation); keduanya hanya boleh
dijadikan pola setelah dinyatakan eksplisit oleh pemilik.

## Model Teknologi & Arsitektur

TBD, Technology Baseline ditetapkan setelah evaluasi (lihat
`.claude/rules/developer-governance.md` §2). Source code, bila ada, berada di
`source/PMCP/`, bukan di dalam `projects/`.

## Riwayat Perubahan

| Tanggal | Peristiwa |
|---|---|
| 2026-10-26 | Folder project dibuat; prompt awal disimpan sebagai sumber mentah (CD-118) |
