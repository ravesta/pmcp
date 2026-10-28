'use client';

import { useEffect, useState } from 'react';
import { previewCardPlanAction } from '../actions';

/** Hasil pratinjau rencana kartu yang dikembalikan server. */
export type PlanPreview = NonNullable<Awaited<ReturnType<typeof previewCardPlanAction>>>;

/**
 * Mengambil pratinjau rencana kartu project dari server setiap kali project atau tanggal rencana berubah: apakah
 * rencana melewati estimasi tahapan (revisi otomatis) dan apakah status project perlu dikonfirmasi.
 * Masukan: id project (null bila belum dipilih) dan rencana mulai dan selesai (`YYYY-MM-DD` atau teks mentah).
 * Keluaran: pratinjau, atau null bila belum dapat dihitung.
 * Efek samping: memanggil Server Action baca; hasil lama dibuang bila masukan berubah lagi sebelum selesai.
 * Rujukan: FR-13-05 butir 2, FR-17-02.
 */
export function usePlanPreview(projectId: number | null, planStart: string, planEnd: string): PlanPreview | null {
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (projectId === null) {
      setPreview(null);
      return;
    }
    previewCardPlanAction(projectId, planStart, planEnd).then((result) => {
      if (!cancelled) setPreview(result);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, planStart, planEnd]);
  return preview;
}
