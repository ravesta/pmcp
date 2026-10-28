/**
 * Batas transaksi database yang tidak bergantung pada pustaka akses data.
 *
 * Lapisan application hanya mengenal `Transactor` dan `TxContext` yang buram; hanya lapisan
 * infrastructure yang tahu `TxContext` sebenarnya adalah transaksi Prisma. Dengan begitu aturan
 * "application tidak mengimpor infrastructure" tetap terjaga (Technical Design §5.1) dan satu
 * use case mutasi = satu transaksi (database-design §9).
 */

/** Konteks transaksi yang buram bagi application; diisi dan dibaca oleh infrastructure saja. */
export interface TxContext {
  readonly __transaction: true;
}

/** Menjalankan sekumpulan pekerjaan dalam satu transaksi database (semua atau tidak sama sekali). */
export interface Transactor {
  /** Menjalankan `work`; bila melempar galat, seluruh perubahan dibatalkan. */
  run<T>(work: (tx: TxContext) => Promise<T>): Promise<T>;
}

/**
 * Membuat `Transactor` yang bergabung ke transaksi yang sudah berjalan: `run` langsung menjalankan pekerjaan pada
 * transaksi itu tanpa membuka transaksi baru. Dipakai use case gabungan agar beberapa use case yang masing-masing
 * memanggil `transactor.run` tetap berada dalam SATU transaksi (semua atau tidak sama sekali).
 * Masukan: transaksi yang sedang berjalan. Keluaran: `Transactor` yang bergabung.
 * Efek samping: tidak ada pada pembuatan; pekerjaan yang dijalankan ikut commit atau rollback bersama transaksi induk.
 * Rujukan: database-design §9 (satu use case mutasi = satu transaksi), Technical Design §6.1.
 */
export function joinTransaction(tx: TxContext): Transactor {
  return { run: (work) => work(tx) };
}
