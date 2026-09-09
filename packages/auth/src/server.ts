/**
 * Queenix Gym — BetterAuth server (replaces placeholder logic)
 * Mounted at /api/auth/[...all] in the Next.js web admin.
 * Handles sign up, sign in, OTP, session management, and Convex user sync.
 */

import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

export const auth = betterAuth({
  appName: 'Queenix Gym',
  baseURL: process.env.AUTH_BASE_URL || 'http://localhost:3000',
  secret: process.env.AUTH_SECRET || 'dev-secret-replace-in-production-min-32-chars-required-xxx',

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
          // Sync to Convex
          if (process.env.CONVEX_SITE_URL && process.env.CONVEX_DEPLOY_KEY) {
            await fetch(`${process.env.CONVEX_SITE_URL}/api/mutation`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Convex ${process.env.CONVEX_DEPLOY_KEY}`,
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
            }).catch((e) => console.error('Convex sync failed', e));
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
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:19000',
    'exp://localhost:8081',
    process.env.AUTH_BASE_URL || '',
  ].filter(Boolean),
});

export type Auth = typeof auth;
