/**
 * Konfigurasi aplikasi PMCP dari variabel lingkungan.
 *
 * Seluruh konfigurasi dibaca dan divalidasi di satu tempat. Rahasia hanya datang dari lingkungan
 * (tidak pernah dari repository, Technology Baseline §3). `CLOCK_OVERRIDE` ditolak di produksi agar
 * jam uji tidak pernah aktif di sistem nyata (Security Design §9).
 *
 * Lingkungan aplikasi (`APP_ENV`) dibedakan dari `NODE_ENV`: server hasil build Next.js selalu
 * berjalan dengan `NODE_ENV=production`, termasuk di staging, sehingga `NODE_ENV` tidak cukup untuk
 * membedakan staging dari produksi. Bila `APP_ENV` tidak diisi, nilainya diturunkan dari `NODE_ENV`
 * (build produksi tanpa `APP_ENV` dianggap produksi, sisi yang aman).
 */
import { z } from 'zod';
import { isIsoDate, type IsoDate } from '@/shared/iso-date';

/** Skema variabel lingkungan yang dikenali PMCP. */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['development', 'test', 'staging', 'production']).optional(),
  DATABASE_URL: z.string().min(1).optional(),
  APP_ORIGIN: z.string().url().optional(),
  TRUSTED_PROXY_COUNT: z.coerce.number().int().min(0).max(10).default(1),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(1).default(120),
  SESSION_ABSOLUTE_MINUTES: z.coerce.number().int().min(1).default(720),
  CLOCK_OVERRIDE: z.string().optional(),
  APP_VERSION: z.string().default('dev'),
});

/** Konfigurasi yang sudah tervalidasi dan bertipe. */
export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  /** Lingkungan penerapan aplikasi; hanya `production` melarang jam uji. */
  readonly appEnv: 'development' | 'test' | 'staging' | 'production';
  readonly databaseUrl: string | undefined;
  readonly appOrigin: string | undefined;
  readonly trustedProxyCount: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly sessionIdleMinutes: number;
  readonly sessionAbsoluteMinutes: number;
  /** Tanggal "hari ini" tetap untuk uji; selalu undefined di produksi. */
  readonly clockOverride: IsoDate | undefined;
  readonly appVersion: string;
}

/**
 * Membaca dan memvalidasi konfigurasi dari variabel lingkungan.
 * Masukan: objek lingkungan (bawaan `process.env`). Keluaran: `AppConfig` bertipe.
 * Efek samping: melempar `Error` dengan pesan jelas bila konfigurasi tidak valid, atau bila
 * `CLOCK_OVERRIDE` dipasang pada lingkungan produksi (`APP_ENV=production`, atau `NODE_ENV=production`
 * tanpa `APP_ENV`); proses tidak boleh mulai.
 * Rujukan: Technical Design §15, Security Design §9, NFR-16 butir 1.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Konfigurasi tidak valid: ${detail}`);
  }
  const values = parsed.data;
  const appEnv = values.APP_ENV ?? values.NODE_ENV;

  let clockOverride: IsoDate | undefined;
  if (values.CLOCK_OVERRIDE !== undefined && values.CLOCK_OVERRIDE !== '') {
    if (appEnv === 'production') {
      throw new Error('CLOCK_OVERRIDE tidak boleh dipakai pada lingkungan production.');
    }
    if (!isIsoDate(values.CLOCK_OVERRIDE)) {
      throw new Error('CLOCK_OVERRIDE harus berformat YYYY-MM-DD yang valid.');
    }
    clockOverride = values.CLOCK_OVERRIDE;
  }

  return {
    nodeEnv: values.NODE_ENV,
    appEnv,
    databaseUrl: values.DATABASE_URL,
    appOrigin: values.APP_ORIGIN,
    trustedProxyCount: values.TRUSTED_PROXY_COUNT,
    logLevel: values.LOG_LEVEL,
    sessionIdleMinutes: values.SESSION_IDLE_MINUTES,
    sessionAbsoluteMinutes: values.SESSION_ABSOLUTE_MINUTES,
    clockOverride,
    appVersion: values.APP_VERSION,
  };
}
