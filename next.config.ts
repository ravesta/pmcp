import type { NextConfig } from 'next';

/**
 * Konfigurasi Next.js PMCP.
 * Tujuan: menghasilkan artefak `standalone` (satu proses Node di server lokal, Technical Design §15)
 * dan tidak membocorkan header `X-Powered-By`.
 * Efek samping: tidak ada (hanya objek konfigurasi).
 * Rujukan: Technology Baseline §6, Technical Design §15, Security Design §8.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
