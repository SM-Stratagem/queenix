'use client';

import React, { useEffect, useMemo } from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { getConvexApiUrl } from '@/lib/convex-env';
import { authClient } from '@/lib/auth-client';

/**
 * Client-side Convex boundary for the admin panel, with auth.
 * On every session change we re-arm client.setAuth so live queries and
 * mutations carry a fresh RS256 token from /api/convex/token (which reads
 * the BetterAuth cookie). Logged-out → token fetch returns null and Convex
 * treats the client as unauthenticated.
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

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(
    () => new ConvexReactClient(getConvexApiUrl() ?? 'http://127.0.0.1:3210'),
    []
  );
  const { data: session } = authClient.useSession();

  useEffect(() => {
    client.setAuth(fetchConvexToken);
  }, [client, session]);

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
