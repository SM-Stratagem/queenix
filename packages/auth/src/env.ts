/**
 * Server env access with production guard rails.
 *
 * Development keeps working with zero config (local defaults). In production
 * every secret must be explicitly set and strong — the server refuses to
 * boot otherwise (see assertProductionEnv, called from apps/web
 * instrumentation.ts) instead of silently running on a public default.
 * `next build` runs with NODE_ENV=production but without runtime secrets,
 * so the build phase is exempt.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

export const isProductionRuntime = (): boolean =>
  process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build';

/** A secret: required (and ≥ minLength chars) in production, dev fallback otherwise. */
export function secret(name: string, devFallback: string, minLength = 32): string {
  const value = process.env[name];
  if (value) {
    if (isProductionRuntime() && value.length < minLength) {
      throw new Error(`${name} must be at least ${minLength} characters in production`);
    }
    return value;
  }
  if (isProductionRuntime()) throw new Error(`${name} is required in production`);
  return devFallback;
}

/** A non-secret setting (URL etc.): required in production, dev fallback otherwise. */
export function setting(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProductionRuntime()) throw new Error(`${name} is required in production`);
  return devFallback;
}

/** Every variable the production server needs, checked once at boot. */
export const PRODUCTION_ENV: ReadonlyArray<{ name: string; secret?: boolean; hint: string }> = [
  { name: 'AUTH_SECRET', secret: true, hint: 'openssl rand -base64 48' },
  { name: 'AUTH_BASE_URL', hint: 'public https URL of the web app' },
  { name: 'AUTH_JWKS', secret: true, hint: 'node scripts/gen-secrets.mjs → RS256 key JSON' },
  { name: 'DATABASE_URL', secret: true, hint: 'postgres://… (auth database)' },
  { name: 'QUEENIX_ADMIN_TOKEN', secret: true, hint: 'openssl rand -hex 32' },
  { name: 'SCANNER_API_KEY', secret: true, hint: 'shared key the door/fingerprint devices send' },
  { name: 'CONVEX_SELF_HOSTED_URL', hint: 'internal URL of the Convex backend' },
  { name: 'NEXT_PUBLIC_CONVEX_URL', hint: 'public URL of the Convex backend' },
  { name: 'CONVEX_DEPLOY_KEY', secret: true, hint: 'Convex admin key' },
  { name: 'OCR_URL', hint: 'internal URL of the OCR service' },
  { name: 'OCR_API_KEY', secret: true, hint: 'shared key for the OCR service' },
  { name: 'EMAIL_FROM', hint: 'e.g. Queenix Gym <no-reply@yourdomain>' },
  { name: 'SMTP_URL', secret: true, hint: 'smtp(s)://user:pass@host:port from your email provider' },
];

/** Throws one error listing every missing/weak production variable. */
export function assertProductionEnv(): void {
  if (!isProductionRuntime()) return;
  const problems: string[] = [];
  for (const v of PRODUCTION_ENV) {
    const value = process.env[v.name];
    if (!value) problems.push(`  - ${v.name} is missing (${v.hint})`);
    else if (v.secret && v.name !== 'AUTH_JWKS' && value.length < 32 && !value.includes('://')) {
      problems.push(`  - ${v.name} is too short (min 32 chars)`);
    }
  }
  const sms = process.env.SMS_PROVIDER ?? 'twilio';
  if (sms === 'dev-inbox' && process.env.ALLOW_DEV_SMS_INBOX !== '1') {
    problems.push('  - SMS_PROVIDER=dev-inbox only allowed with ALLOW_DEV_SMS_INBOX=1 (local prod testing)');
  }
  if (sms === 'twilio') {
    for (const n of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM']) {
      if (!process.env[n]) problems.push(`  - ${n} is missing (SMS_PROVIDER=twilio)`);
    }
  }
  if (problems.length) {
    throw new Error(`Refusing to start: production environment is incomplete:\n${problems.join('\n')}`);
  }
}

/** Constant-time string compare for shared keys/tokens (no timing leak). */
export function safeEqual(a: string, b: string): boolean {
  // Hash first so unequal lengths don't short-circuit.
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}
