import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, buildSecurityHeaders } from '@/platform/security-headers';

describe('header keamanan', () => {
  it('CSP melarang frame, object, dan sumber luar; eval hanya di pengembangan', () => {
    const production = buildContentSecurityPolicy(false);
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("object-src 'none'");
    expect(production).toContain("default-src 'self'");
    expect(production).not.toContain('unsafe-eval');
    expect(buildContentSecurityPolicy(true)).toContain('unsafe-eval');
  });

  it('HSTS hanya bila transport aman; header dasar selalu ada', () => {
    const names = (secure: boolean) => buildSecurityHeaders({ development: false, secureTransport: secure }).map((h) => h.key);
    expect(names(true)).toContain('Strict-Transport-Security');
    expect(names(false)).not.toContain('Strict-Transport-Security');
    for (const key of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cache-Control']) {
      expect(names(false)).toContain(key);
    }
  });
});
