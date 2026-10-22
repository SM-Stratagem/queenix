/**
 * Runs once when the Next.js server boots (not during `next build`).
 * Production refuses to start with missing/weak secrets — one clear list
 * instead of a half-working deploy.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertProductionEnv } = await import('@queenix/auth/env');
    assertProductionEnv();
    // Auth schema up to date before the first request (idempotent).
    const { migrateAuthDb } = await import('@queenix/auth/server');
    await migrateAuthDb();
  }
}
