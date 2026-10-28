/**
 * Pembulatan angka PMCP.
 *
 * Semua persen (progres tahapan, utilisasi, rasio pencatatan, kepatuhan) dibulatkan ke bilangan
 * bulat terdekat dengan 0,5 naik SEBELUM dibandingkan dengan ambang dan sebelum ditampilkan
 * (NFR-16 butir 5), supaya angka tampil dan status selalu konsisten.
 */

/**
 * Membulatkan ke bilangan bulat terdekat, nilai tengah (x,5) dibulatkan naik.
 * Masukan: bilangan tidak negatif (persen atau jam). Keluaran: bilangan bulat.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 5, FR-05-02 butir 1, FR-07-05 butir 5, FR-04-06 butir 2, FR-21-05 butir 2.
 */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * Menghitung persentase `part / whole` yang dibulatkan; mengembalikan 0 bila penyebut nol.
 * Masukan: pembilang dan penyebut. Keluaran: persen bulat (bukan dibatasi 0 sampai 100).
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: NFR-16 butir 5.
 */
export function percentRounded(part: number, whole: number): number {
  if (whole === 0) return 0;
  return roundHalfUp((part / whole) * 100);
}
