'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Browser BetterAuth client for the web admin.
 * Same-origin cookies carry the session; no expo plugin here
 * (that one is React Native only — see @queenix/auth).
 */
export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.AUTH_BASE_URL || 'http://localhost:3000',
});

export const { signIn, signUp, signOut, useSession } = authClient;
