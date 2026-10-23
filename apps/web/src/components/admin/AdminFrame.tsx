'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useConvexAuth } from 'convex/react';
import { ShieldAlert } from 'lucide-react';
import { canOpen, isPublicPath, landingFor, routeCapability, useSessionRoles } from '@/lib/access';
import { useCapabilityGrants } from '@/lib/use-capability-grants';
import { RequireAuth } from '../RequireAuth';
import { AdminShell } from './AdminShell';
import { QueryBoundary } from './QueryBoundary';

/**
 * Wraps every console page (root layout) so auth + role gating happen once,
 * BEFORE a page mounts — pages call Convex hooks at their top level, so a
 * page that isn't allowed must never render. /login renders bare.
 */
export function AdminFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  if (pathname === '/login' || isPublicPath(pathname)) return <>{children}</>;
  return (
    <RequireAuth>
      <AdminShell>
        <RouteGate pathname={pathname}>{children}</RouteGate>
      </AdminShell>
    </RequireAuth>
  );
}

function RouteGate({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const roles = useSessionRoles();
  const convex = useConvexAuth();
  // Roles don't open it but a capability grant might (e.g. content.manage → /website).
  const byGrant = !canOpen(roles, pathname) && !!routeCapability(pathname);
  const grants = useCapabilityGrants(byGrant && convex.isAuthenticated);
  if (byGrant && (convex.isLoading || (convex.isAuthenticated && grants === undefined))) {
    return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Connecting…</div>;
  }
  if (!canOpen(roles, pathname, grants)) {
    const home = landingFor(roles);
    return (
      <div
        role="alert"
        style={{
          margin: 24,
          padding: 24,
          maxWidth: 560,
          border: '1px solid var(--border)',
          borderRadius: 12,
          background: 'var(--bg-elevated)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={22} color="var(--brand)" />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Staff only</h1>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
          This page isn&apos;t part of your role ({roles.filter((r) => r !== 'member').join(', ') || 'none'}). Ask a
          superadmin if you need access.
        </p>
        <Link
          href={home}
          style={{
            alignSelf: 'flex-start',
            fontSize: 13,
            fontWeight: 700,
            color: 'white',
            background: 'var(--brand)',
            borderRadius: 8,
            padding: '8px 14px',
            textDecoration: 'none',
          }}
        >
          Go to my home
        </Link>
      </div>
    );
  }
  // Pages subscribe on mount — wait until the backend has accepted the token.
  if (convex.isLoading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Connecting…</div>;
  if (!convex.isAuthenticated) {
    return (
      <div role="alert" style={{ padding: 24, color: 'var(--text-muted)' }}>
        Live data couldn&apos;t be authorized — <Link href="/login">sign in again</Link>.
      </div>
    );
  }
  // Keyed so a caught error on one page doesn't stick after navigating away.
  return <QueryBoundary key={pathname}>{children}</QueryBoundary>;
}
