/**
 * Header keamanan respons PMCP (Security Design §8): CSP, HSTS, nosniff, referrer, permissions, dan no-store.
 *
 * Disusun di satu tempat agar dapat diuji dan dipakai `next.config.ts`. Fungsi di sini murni.
 */

/** Pasangan nama dan nilai header. */
export interface HeaderEntry {
  readonly key: string;
  readonly value: string;
}

/** Pilihan penyusunan header. */
export interface SecurityHeaderOptions {
  /** True pada pengembangan: Next.js dev memerlukan `eval` untuk hot reload. */
  readonly development: boolean;
  /** True hanya bila diterapkan di belakang HTTPS (staging dan produksi): mengaktifkan HSTS. */
  readonly secureTransport: boolean;
}

/**
 * Menyusun Content-Security-Policy.
 * Masukan: apakah mode pengembangan. Keluaran: nilai header CSP satu baris.
 * Aturan: semua sumber hanya dari asal sendiri; skrip dan gaya inline diizinkan karena Next.js dan MUI (Emotion)
 * menyisipkannya; tidak boleh di-frame, tidak ada `object`, form hanya ke asal sendiri.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §8 (CSP; versi bernonce dicatat sebagai pekerjaan lanjutan di implementation-log).
 */
export function buildContentSecurityPolicy(development: boolean): string {
  const scriptSources = development ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

/**
 * Menyusun seluruh header keamanan untuk halaman dan respons ber-sesi.
 * Masukan: `SecurityHeaderOptions`. Keluaran: daftar header; HSTS hanya bila `secureTransport`.
 * Efek samping: tidak ada (fungsi murni).
 * Rujukan: Security Design §8, Technology Baseline TR-07.
 */
export function buildSecurityHeaders(options: SecurityHeaderOptions): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(options.development) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'same-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    { key: 'Cache-Control', value: 'no-store' },
  ];
  if (options.secureTransport) headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
  return headers;
}
