'use client';

import { useEffect } from 'react';
import type { ActionState } from '../action-state';

/**
 * Menjalankan callback sekali setiap ada hasil BERHASIL baru dari sebuah Server Action (mis. menutup dialog).
 * Masukan: state aksi dan callback. Keluaran: tidak ada.
 * Efek samping: memanggil callback saat `state.ok` dan penanda hasil (`stamp`) berubah; hasil lama tidak memicu ulang.
 * Rujukan: handoff UX/UI §6 (keadaan berhasil), FR-08-01.
 */
export function useOnSuccess(state: ActionState, callback: (state: ActionState) => void): void {
  useEffect(() => {
    if (state.ok) callback(state);
    // callback sengaja tidak menjadi dependensi: hanya hasil baru (stamp) yang memicu
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stamp]);
}
