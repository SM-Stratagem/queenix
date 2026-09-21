/**
 * Queenix Gym — BetterAuth client + shared role helpers
 * The full server config lives in apps/mobile/lib/auth-server.ts (mounted at
 * /api/auth/[...all] in the Next.js web admin).
 * This file exposes the React Native client and role utility functions.
 */

import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export type { Role } from './roles';
export {
  ROLES,
  ROLE_RANK as ROLE_HIERARCHY,
  DEPRECATED_ROLE_ALIASES,
  normalizeRole,
  normalizeRoles,
  hasRole,
  hasAnyRole,
  isStaff,
  canAccessAdmin,
  canAccessFinance,
  canManageStaff,
  MOBILE_HOME,
  WEB_LANDING,
  mobileHomeFor,
  webLandingFor,
} from './roles';
import { hasRole as _hasRole } from './roles';

export const isOwner = (userRoles: import('./roles').Role[]): boolean =>
  _hasRole(userRoles, 'finance');
export const isTrainer = (userRoles: import('./roles').Role[]): boolean =>
  _hasRole(userRoles, 'trainer');
export const isOperations = (userRoles: import('./roles').Role[]): boolean =>
  _hasRole(userRoles, 'operations');
export const isMember = (userRoles: import('./roles').Role[]): boolean =>
  _hasRole(userRoles, 'member');

export const authClient = createAuthClient({
  baseURL:
    process.env.EXPO_PUBLIC_AUTH_BASE_URL ||
    process.env.AUTH_BASE_URL ||
    'http://localhost:3000',
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
} = authClient;
