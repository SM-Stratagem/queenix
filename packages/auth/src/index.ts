/**
 * Queenix Gym — BetterAuth configuration
 * Email + password + OTP, role-aware sessions.
 */

import { betterAuth } from 'better-auth';
import { Pool } from 'pg';

export const auth = betterAuth({
  appName: 'Queenix Gym',
  baseURL: process.env.AUTH_BASE_URL || 'http://localhost:3000',
  secret: process.env.AUTH_SECRET || 'dev-secret-change-in-production-min-32-chars-required',

  // Email + password
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // OTP-based, can be enabled per jurisdiction
    minPasswordLength: 8,
  },

  // Email OTP (passwordless)
  emailOTP: {
    enabled: true,
    otpLength: 6,
    expiresIn: 600, // 10 minutes
    sendVerificationOnSignUp: true,
  },

  // Phone OTP (passwordless, primary for member onboarding per PRD)
  // Note: requires Twilio/MessageBird credentials in production
  // phoneNumber: { enabled: true, sendOTPOnSignUp: true },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  // User metadata
  user: {
    additionalFields: {
      activeRole: {
        type: 'string',
        required: true,
        defaultValue: 'member',
        input: false, // server-controlled
      },
      roles: {
        type: 'string[]',
        required: true,
        defaultValue: ['member'],
        input: false, // server-controlled
      },
      fullName: {
        type: 'string',
        required: true,
      },
    },
  },

  // Advanced configuration
  advanced: {
    cookiePrefix: 'queenix',
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: {
      enabled: false,
    },
  },

  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:8081',
    'http://localhost:19006',
    process.env.AUTH_BASE_URL || '',
  ].filter(Boolean),
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// ============================================================
// Authorization helpers (server-side, role-based)
// ============================================================

export type Role = 'member' | 'trainer' | 'owner' | 'operations';

export const ROLE_HIERARCHY: Record<Role, number> = {
  member: 1,
  operations: 2,
  trainer: 3,
  owner: 4,
};

export const hasRole = (userRoles: Role[], required: Role): boolean => {
  return userRoles.includes(required);
};

export const hasAnyRole = (userRoles: Role[], required: Role[]): boolean => {
  return required.some((r) => userRoles.includes(r));
};

export const isOwner = (userRoles: Role[]): boolean => hasRole(userRoles, 'owner');
export const isTrainer = (userRoles: Role[]): boolean => hasRole(userRoles, 'trainer');
export const isOperations = (userRoles: Role[]): boolean => hasRole(userRoles, 'operations');
export const isMember = (userRoles: Role[]): boolean => hasRole(userRoles, 'member');

export const canAccessAdmin = (userRoles: Role[]): boolean =>
  hasAnyRole(userRoles, ['owner', 'operations']);

// ============================================================
// Client-side hooks
// ============================================================

import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_AUTH_BASE_URL || 'http://localhost:3000',
  plugins: [
    expoClient({
      scheme: 'queenix',
      storagePrefix: 'queenix',
      storage: SecureStore,
    }),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  useUser,
} = authClient;
