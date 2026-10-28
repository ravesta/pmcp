# Documentation Plan: PMCP Technical Design

Dibuat DEV Agent berdasarkan `.claude/skills/developer/documentation-decision/SKILL.md`.
Tanggal 2026-10-28.

## Task

`PMCP-TD-001`: Technical Design aplikasi baru PMCP dari FSD v1.0 APPROVED (CD-172), BRD v4.0
APPROVED (CD-169), dan Technology Baseline v1.0 APPROVED (CD-159).

## Change Classification

- New Application
- Database Change (skema awal)
- Security Change (autentikasi dan sesi buatan sendiri)
- Deployment Change (server lokal, CI/CD)

## Impact

```yaml
new_application: true
architecture_change: false   # style sudah diputuskan di Technology Baseline (modular monolith)
technology_change: false     # mengikuti Technology Baseline v1.0
api_change: true             # kontrak use case internal (tanpa API publik)
database_change: true
external_integration: false
security_boundary_change: true
deployment_change: true
operational_change: true
ui_ux_material_change: false # UI mengikuti mockup dan handoff UX/UI terpisah
data_model_change: true
breaking_change: false
```

## Risk

```yaml
level: medium
rationale: >
  Aplikasi baru dengan data kerja multi-pengguna (<20), aturan hitung banyak (progres, kapasitas,
  kepatuhan), autentikasi buatan sendiri, dan lingkungan infra yang belum diketahui. Blast radius
  terbatas pada tim BA dan QA internal; tidak ada integrasi eksternal.
```

## Documentation Decisions

| Document | Status | Reason | Existing Artifact |
|---|---|---|---|
| Technical Design | REQUIRED | Aplikasi baru; menjembatani FSD ke kode, modul, use case, dan rencana implementasi | `dev/technical-design.md` (baru) |
| Architecture Decision | NOT_REQUIRED | Style (modular monolith) dan alternatif sudah tercatat; batas modul dan arah dependensi ditulis di Technical Design §5 dan §6 | `dev/technology-baseline.md` §4 sampai §6 |
| Technology Decision | NOT_REQUIRED | Sudah ada dan APPROVED | `dev/technology-baseline.md` v1.0 |
| API Specification | NOT_REQUIRED | Tidak ada API publik atau konsumen eksternal. Kontrak use case internal dan permukaan Server Action tercantum di Technical Design §8 | `dev/technical-design.md` §8 |
| Database Design | REQUIRED | Skema awal, constraint integritas (BL-28, BL-10), jejak audit, indeks, migrasi | `dev/database-design.md` (baru) |
| Integration Specification | NOT_REQUIRED | Tidak ada integrasi eksternal (FSD §4) | FSD §4 |
| Security Design | REQUIRED | Autentikasi, sesi, otorisasi, rate limit, jejak audit, dan kontrol teknis di server (RK-04) | `dev/security-design.md` (baru) |
| Deployment Documentation | REQUIRED (tertunda) | Server lokal dan CI/CD; bergantung pada jawaban tim infra yang ditunda pemilik. Kerangka ada di Technical Design §15; dokumen terpisah ditulis setelah jawaban infra | `dev/pertanyaan-tim-infra.md`, Technical Design §15 |
| Operational Documentation | RECOMMENDED | Prosedur bootstrap Manager, reset darurat, backup dan pemulihan | Ditulis bersama Deployment Documentation |
| Test Strategy | RECOMMENDED | Dimiliki QA; pendekatan uji DEV ada di Technical Design §14 | Technical Design §14 |

Volume dokumentasi bukan ukuran mutu; dokumen di atas dibatasi pada yang dibutuhkan untuk
correctness, keamanan, dan handover.
