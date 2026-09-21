/**
 * Queenix Gym — BetterAuth server (production-ready)
 * Uses BetterAuth's built-in Kysely adapter over better-sqlite3 so the
 * schema lives in a single, migratable SQLite file. No cloud DB required.
 */

import { betterAuth } from 'better-auth';
import Database from 'better-sqlite3';
import { Kysely, SqliteDialect } from 'kysely';

const dbPath = process.env.AUTH_DB_PATH || '.data/queenix-auth.db';
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

const kysely = new Kysely({ dialect: new SqliteDialect({ database: sqlite }) });

export const auth = betterAuth({
  appName: 'Queenix Gym',
  baseURL: process.env.AUTH_BASE_URL || 'http://localhost:3000',
  secret: process.env.AUTH_SECRET || 'dev-secret-replace-in-production-min-32-chars',

  database: { db: kysely, type: 'sqlite' },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  emailOTP: {
    enabled: true,
    otpLength: 6,
    expiresIn: 600,
    sendVerificationOnSignUp: false,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
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
        after: async (user) => {
          if (process.env.CONVEX_SITE_URL && process.env.CONVEX_DEPLOY_KEY) {
            await fetch(`${process.env.CONVEX_SITE_URL}/api/mutation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Convex ${process.env.CONVEX_DEPLOY_KEY}`,
              },
              body: JSON.stringify({
                path: 'mutations/users:syncFromBetterAuth',
                args: {
                  betterAuthUserId: user.id,
                  email: user.email,
                  fullName: (user as any).fullName ?? user.name ?? 'Member',
                  roles: (user as any).roles ?? ['member'],
                },
              }),
            }).catch((e) => console.error('Convex sync failed', e))
          }
        },
      },
    },
  },

  advanced: {
    cookiePrefix: 'queenix',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },

  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3300',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:19000',
    'exp://localhost:8081',
    // Compose service name: the one-shot seed container calls the API as
    // http://web:3000. Without this, seed dies with INVALID_ORIGIN and the
    // Convex user mapping is never repaired.
    'http://web:3000',
    process.env.AUTH_BASE_URL || '',
  ].filter(Boolean),
})

export type Auth = typeof auth
