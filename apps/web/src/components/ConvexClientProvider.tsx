'use client';

import React, { useCallback, useMemo } from 'react';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';
import { getConvexApiUrl } from '@/lib/convex-env';
import { authClient } from '@/lib/auth-client';

/**
 * Client-side Convex boundary for the admin panel, with auth.
 * Live queries carry an RS256 token minted by /api/convex/token (which
 * reads the BetterAuth cookie). ConvexProviderWithAuth owns setAuth and
 * exposes `useConvexAuth()` — AdminFrame waits for it before mounting a
 * page, so no query ever runs on a not-yet-authenticated socket (the
 * login → router.replace race otherwise surfaced as UNAUTHORIZED).
 * Auth is re-armed only when the signed-in user changes: re-arming on
 * every session refetch killed the socket with "Base version N passed up
 * doesn't match the current version 0".
 */
async function fetchConvexToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/convex/token', { credentials: 'same-origin' });
    if (!res.ok) return null;
    const data = (await res.json()) as { token?: unknown };
    return typeof data.token === 'string' ? data.token : null;
  } catch {
    return null;
  }
}

function useBetterAuthForConvex() {
  const { data, isPending } = authClient.useSession();
  const userId = data?.user?.id ?? null;
  // New identity per user → provider re-arms on login/logout/switch only.
  const fetchAccessToken = useCallback(async () => (userId ? fetchConvexToken() : null), [userId]);
  return useMemo(
    () => ({ isLoading: isPending, isAuthenticated: userId !== null, fetchAccessToken }),
    [isPending, userId, fetchAccessToken]
  );
}

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => new ConvexReactClient(getConvexApiUrl() ?? 'http://127.0.0.1:3210'), []);
  return (
    <ConvexProviderWithAuth client={client} useAuth={useBetterAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}
