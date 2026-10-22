/**
 * Queenix Gym — BetterAuth server.
 * Postgres whenever DATABASE_URL is set (docker compose + every deployment);
 * a local SQLite file only for bare host-side `npm run dev` without Docker.
 * Schema migrations run at boot (migrateAuthDb, from instrumentation.ts).
 */

import { betterAuth } from 'better-auth';
import { emailOTP, phoneNumber } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { getMigrations } from 'better-auth/db/migration';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { Kysely, PostgresDialect, SqliteDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { convexAdmin } from './convex-admin';
import { authIpConfig, isProductionRuntime, secret, setting } from './env';
import { codeMessage, sendEmail, sendSms } from './notify';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl && isProductionRuntime()) throw new Error('DATABASE_URL is required in production');

// Opened lazily (first query), never at import: `next build` loads every
// route module and must not touch — or fail on — a database.
function sqliteDb(): Kysely<any> {
  return new Kysely({
    dialect: new SqliteDialect({
      database: async () => {
        const file = process.env.AUTH_DB_PATH || '.data/queenix-auth.db';
        fs.mkdirSync(path.dirname(file), { recursive: true });
        const sqlite = new Database(file);
        sqlite.pragma('journal_mode = WAL');
        return sqlite;
      },
    }),
  });
}

/** The auth database (Kysely) — shared with the admin role route. */
export const authDb: Kysely<any> = databaseUrl
  ? new Kysely({ dialect: new PostgresDialect({ pool: new Pool({ connectionString: databaseUrl, max: 10 }) }) })
  : sqliteDb();
const dbType = databaseUrl ? 'postgres' : 'sqlite';

export const auth = betterAuth({
  appName: 'Queenix Gym',
  baseURL: setting('AUTH_BASE_URL', 'http://localhost:3000'),
  secret: secret('AUTH_SECRET', 'dev-secret-replace-in-production-min-32-chars'),

  database: { db: authDb, type: dbType },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    // A reset (email or SMS code) signs out every other session — e.g. an attacker's.
    revokeSessionsOnPasswordReset: true,
  },


  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
    // Signed-cookie cache: get-session skips the DB for up to 60s, so a sign-out,
    // ban or role change takes up to a minute to reach it. /api/convex/token and
    // other privileged server routes bypass it (disableCookieCache) and hit the DB.
    cookieCache: { enabled: true, maxAge: 60 },
  },

  user: {
    additionalFields: {
      activeRole: {
        type: 'string',
        required: true,
        defaultValue: 'member',
        input: false,
      },
      roles: {
        type: 'string[]',
        required: true,
        defaultValue: ['member'],
        input: false,
      },
      fullName: {
        type: 'string',
        required: true,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // Mirror every new login into Convex. If this fails (Convex briefly
        // down), /api/convex/token re-runs the same idempotent sync on the
        // user's next sign-in, so no account is left without app data.
        after: async (user) => {
          await syncUserToConvex(user).catch((e) => console.error('[auth] Convex user sync failed', e));
        },
      },
    },
  },

  plugins: [
    // Native app: turns the Expo client's `expo-origin` header into Origin so
    // cookie-bearing POSTs (sign-out, verify, change-password) pass the origin check.
    expo(),
    // Email codes: sign-in, email verification, password reset, email change.
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      storeOTP: 'hashed',
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        const m = codeMessage(otp, type);
        await sendEmail({ to: email, subject: m.subject, text: m.text, html: m.html });
      },
    }),
    // SMS codes: phone verification, phone sign-in, password reset by phone.
    phoneNumber({
      otpLength: 6,
      expiresIn: 600,
      allowedAttempts: 5,
      async sendOTP({ phoneNumber: to, code }) {
        await sendSms({ to, body: codeMessage(code, 'phone-verification').text });
      },
      async sendPasswordResetOTP({ phoneNumber: to, code }) {
        await sendSms({ to, body: codeMessage(code, 'phone-password-reset').text });
      },
    }),
  ],

  advanced: {
    cookiePrefix: 'queenix',
    // Secure (https-only) cookies whenever the public URL is https — i.e. every real deployment.
    useSecureCookies: (process.env.AUTH_BASE_URL ?? '').startsWith('https://'),
    // Client IP for per-IP rate limits: only AUTH_IP_HEADER (a header the edge
    // overwrites, e.g. x-real-ip on Railway) or x-forwarded-for walked through
    // AUTH_TRUSTED_PROXIES. Never a raw client header — see authIpConfig / DEPLOY.md.
    ipAddress: authIpConfig(),
  },

  // Staff often share one office IP: allow a shift-change burst, still brute-force hostile.
  rateLimit: { customRules: { '/sign-in/*': { window: 60, max: 10 } } },

  // Production trusts its own public URL + the native app scheme (app.json
  // `scheme`; browsers can't send it). The localhost / Expo Go / compose origins
  // below exist for local development and are never trusted in prod.
  trustedOrigins: [
    process.env.AUTH_BASE_URL || '',
    'queenix://',
    ...(isProductionRuntime()
      ? []
      : [
          'exp://',
          'http://localhost:3000',
          'http://localhost:3300',
          'http://localhost:8081',
          'http://localhost:19006',
          'http://localhost:19000',
          // Compose service name: the one-shot seed container calls the API as http://web:3000.
          'http://web:3000',
          // Expo web preview served by Metro on the same LAN host (:3000 → :8081).
          /:3000$/.test(process.env.AUTH_BASE_URL ?? '') ? process.env.AUTH_BASE_URL!.replace(/:3000$/, ':8081') : '',
        ]),
  ].filter(Boolean),
})

export type Auth = typeof auth

/** Create/upgrade the auth tables. Idempotent — safe on every boot. */
export async function migrateAuthDb(): Promise<void> {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
}

/** Idempotent upsert of the Convex user for a BetterAuth user (internal fn via admin key). */
export async function syncUserToConvex(
  user: { id: string; email: string; name?: string | null } & Record<string, unknown>,
  opts: { createOnly?: boolean } = {},
) {
  await convexAdmin('mutation', 'mutations/users:syncFromBetterAuth', {
    betterAuthUserId: user.id,
    email: user.email,
    fullName: (user.fullName as string | undefined) ?? user.name ?? 'Member',
    roles: (user.roles as string[] | undefined) ?? ['member'],
    activeRole: user.activeRole as string | undefined,
    emailVerified: Boolean(user.emailVerified),
    ...opts,
  });
}

/** Cheap auth-DB reachability check (health endpoint). */
export async function pingAuthDb(): Promise<void> {
  await sql`select 1`.execute(authDb);
}
