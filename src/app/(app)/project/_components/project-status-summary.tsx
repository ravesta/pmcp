import Box from '@mui/material/Box';
import Link from 'next/link';
import type { ProjectStatus } from '@/modules/project';
import { PROJECT_STATUS_ORDER, PROJECT_STATUS_TEXT } from '@/ui/format/project-labels';
import { LinkButton } from '@/ui/components/link-controls';

/** Properti ringkasan status. */
interface ProjectStatusSummaryProps {
  /** Jumlah SELURUH project per status. */
  readonly counts: Readonly<Record<ProjectStatus, number>>;
  readonly activeStatus?: ProjectStatus;
  /** Membuat alamat dengan status tertentu (atau tanpa status bila `undefined`), menjaga filter lain. */
  readonly hrefFor: (status: ProjectStatus | undefined) => string;
}

/**
 * Ringkasan jumlah project per status yang dapat diklik untuk menyaring; mengklik status yang sedang aktif
 * melepas penyaringan. Jumlah menghitung seluruh project, tidak terpengaruh filter lain.
 * Masukan: jumlah per status, status aktif, dan pembuat alamat. Keluaran: deretan tombol tautan.
 * Efek samping: tidak ada (komponen murni).
 * Rujukan: FR-14-02, Screen [010] field 3, handoff UX/UI §9 (status bukan hanya warna).
 */
export function ProjectStatusSummary({ counts, activeStatus, hrefFor }: ProjectStatusSummaryProps) {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return (
    <Box component="nav" aria-label="Ringkasan status project" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <LinkButton href={hrefFor(undefined)} size="small" variant={activeStatus === undefined ? 'contained' : 'outlined'} aria-current={activeStatus === undefined ? 'true' : undefined}>
        Semua {total}
      </LinkButton>
      {PROJECT_STATUS_ORDER.map((status) => (
        <LinkButton key={status} href={hrefFor(activeStatus === status ? undefined : status)} size="small" variant={activeStatus === status ? 'contained' : 'outlined'} aria-current={activeStatus === status ? 'true' : undefined}>
          {PROJECT_STATUS_TEXT[status]} {counts[status]}
        </LinkButton>
      ))}
    </Box>
  );
}
