/**
 * Queenix Gym — BetterAuth client + shared role helpers
 * The full server config lives in apps/mobile/lib/auth-server.ts (mounted at
 * /api/auth/[...all] in the Next.js web admin).
 * This file exposes the React Native client and role utility functions.
 */

import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo';
import * as SecureStore from 'expo-secure-store';

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
  useUser,
} = authClient;
