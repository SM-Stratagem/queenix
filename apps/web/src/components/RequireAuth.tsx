'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

/**
 * Wrap pages that need a signed-in user + live Convex data.
 * Logged out → bounce to /login?next=<page>.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !data?.user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
    }
  }, [data, isPending, router, pathname]);

  if (isPending) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!data?.user) return <main style={{ padding: 24 }}>Redirecting to login…</main>;
  return <>{children}</>;
}
