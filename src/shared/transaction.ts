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
