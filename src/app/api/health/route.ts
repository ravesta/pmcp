import { loadConfig } from '@/platform/config';
import { createClockFor } from '@/platform/clock-provider';

/** Health check harus selalu dihitung ulang, tidak di-cache. */
export const dynamic = 'force-dynamic';

/**
 * Health check untuk reverse proxy dan CI/CD.
 * Masukan: permintaan GET tanpa autentikasi. Keluaran: JSON status, versi, dan tanggal bisnis server.
 * Efek samping: tidak ada. Tidak membuka detail internal. Ping database ditambahkan pada irisan 1
 * setelah klien database ada.
 * Rujukan: Technical Design §8 dan §15.
 */
export function GET(): Response {
  const config = loadConfig();
  const clock = createClockFor(config);
  return Response.json(
    { status: 'ok', service: 'pmcp', version: config.appVersion, today: clock.today() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
