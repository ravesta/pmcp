'use client';

import Button from '@mui/material/Button';
import { useState } from 'react';
import type { ProjectFormOptions, StageView } from '@/modules/project';
import { StageDialog } from './stage-dialog';

/** Properti tombol aksi tahapan. */
interface StageActionsProps {
  readonly projectName: string;
  readonly stage: StageView;
  readonly options: ProjectFormOptions;
  readonly revisionThreshold: number;
  readonly isManager: boolean;
}

/**
 * Menentukan teks tombol aksi tahapan: "Lengkapi PIC/timeline" bila bagian itu masih kosong dan hanya itu yang
 * dapat dilakukan, selain itu "Perbarui tahapan".
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
 * Tombol aksi sebuah tahapan di Detail Project beserta dialog Perbarui Tahapan.
 * Masukan: nama project, tahapan, pilihan master, batas revisi, dan penanda Manager. Keluaran: tombol (dan dialog).
 * Efek samping: menyimpan buka/tutup dialog di state.
 * Rujukan: Screen [014], Screen [016], FR-01-04 (tombol hanya kenyamanan; hak dicek ulang di server).
 */
export function StageActions({ projectName, stage, options, revisionThreshold, isManager }: StageActionsProps) {
  const [open, setOpen] = useState(false);
  const label = actionLabel(stage);
  if (!label) return null;
  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>{label}</Button>
      {open ? <StageDialog projectName={projectName} stage={stage} options={options} revisionThreshold={revisionThreshold} isManager={isManager} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
