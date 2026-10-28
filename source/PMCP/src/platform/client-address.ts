/**
 * Menentukan alamat sumber permintaan untuk throttle login (Technical Design §10, Security Design §4.3).
 *
 * Alamat HANYA dipercaya dari header `X-Forwarded-For` yang ditambahkan reverse proxy tepercaya sebanyak
 * `TRUSTED_PROXY_COUNT`; klien dapat memalsukan bagian kiri header, jadi dipakai entri ke-N dari kanan.
 */

/**
 * Mengambil alamat klien dari header X-Forwarded-For.
 * Masukan: nilai header (atau null) dan jumlah proxy tepercaya di depan aplikasi. Keluaran: alamat klien,
 * atau `tidak-diketahui` bila tidak ada proxy tepercaya atau header kosong atau tidak cukup panjang.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: FR-01-01 butir 3, Technical Design §10.
 */
export function clientAddressFrom(forwardedFor: string | null, trustedProxyCount: number): string {
  if (trustedProxyCount <= 0 || !forwardedFor) return 'tidak-diketahui';
  const parts = forwardedFor
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const picked = parts[parts.length - trustedProxyCount];
  return picked && picked.length <= 100 ? picked : 'tidak-diketahui';
}
