'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { isPureMember as pureMember, sessionRoles } from '@/lib/access';

/**
 * Wrap pages that need a signed-in STAFF user + live Convex data.
 * Logged out → bounce to /login?next=<page>.
 * Pure members (mobile-app only) → signed out and bounced to
 * /login?error=members-mobile-only. Web is staff only.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isPureMember = pureMember(sessionRoles(data?.user));

  useEffect(() => {
    if (!isPending && !data?.user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || '/')}`);
    }
  }, [data, isPending, router, pathname]);

  useEffect(() => {
    if (!isPending && data?.user && isPureMember) {
      void authClient.signOut().finally(() => {
        router.replace('/login?error=members-mobile-only');
      });
    }
  }, [data, isPending, isPureMember, router]);

  if (isPending) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!data?.user) return <main style={{ padding: 24 }}>Redirecting to login…</main>;
  if (isPureMember)
    return (
      <main style={{ padding: 24 }}>
        Member accounts work in the mobile app, not the web admin. Redirecting to
        login…
      </main>
    );
  return <>{children}</>;
}
