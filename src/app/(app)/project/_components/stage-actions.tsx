'use client';

import Button from '@mui/material/Button';
import { useState } from 'react';
import type { ProjectFormOptions, StageView } from '@/modules/project';
import { StageDialog } from './stage-dialog';

/** Properti tombol aksi tahapan. */
interface StageActionsProps {
  readonly projectCode: string;
  readonly projectName: string;
  readonly stage: StageView;
  readonly options: ProjectFormOptions;
  readonly revisionThreshold: number;
  readonly isManager: boolean;
  /** Membuka dialog langsung saat halaman dimuat (dari tautan bar Gantt). */
  readonly defaultOpen?: boolean;
}

/**
 * Menentukan teks tombol aksi tahapan: "Perbarui tahapan" bila pelaku dapat mengubah status atau progres, atau
 * "Lengkapi PIC/timeline" bila hanya dapat melengkapi bagian kosong.
 * Masukan: tahapan. Keluaran: teks tombol, atau null bila pelaku tidak berhak melakukan apa pun.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Screen [014] (Table 26), FR-03-01, FR-05-01, FR-06-01 (PIC BA tidak melihat tombol Perbarui pada Development).
 */
function actionLabel(stage: StageView): string | null {
  const { rights } = stage;
  if (rights.update || rights.reopen) return 'Perbarui tahapan';
  if (rights.editAssignees || rights.fillTimeline) return 'Lengkapi PIC/timeline';
  return null;
}

/**
 * Tombol aksi sebuah tahapan di Detail Project beserta dialog Perbarui Tahapan. Dialog dapat terbuka otomatis bila
 * halaman dibuka dari bar Gantt (`?ubah=BA`).
 * Masukan: kode dan nama project, tahapan, pilihan master, batas revisi, penanda Manager, dan buka otomatis.
 * Keluaran: tombol (dan dialog).
 * Efek samping: menyimpan buka/tutup dialog di state.
 * Rujukan: Screen [014], Screen [016], FR-01-04 (tombol hanya kenyamanan; hak dicek ulang di server), FR-12-01 butir 7.
 */
export function StageActions({ projectCode, projectName, stage, options, revisionThreshold, isManager, defaultOpen = false }: StageActionsProps) {
  const [open, setOpen] = useState(defaultOpen && actionLabel(stage) !== null);
  const label = actionLabel(stage);
  if (!label) return null;
  return (
    <>
      <Button fullWidth variant="outlined" onClick={() => setOpen(true)}>{label}</Button>
      {open ? <StageDialog projectCode={projectCode} projectName={projectName} stage={stage} options={options} revisionThreshold={revisionThreshold} isManager={isManager} showDetailLink={false} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
