'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { AdminNav } from './AdminNav';
import { BranchProvider, BranchSwitcher } from './BranchSwitcher';
import { ThemeToggle } from './ThemeToggle';

/** Admin chrome: sidebar nav + header (branch scope, signed-in user) + main. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  // Below 760px the sidebar is a top bar and the nav a toggled drawer (globals.css).
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setNavOpen(false), [pathname]);
  return (
    <BranchProvider>
      <div className="admin-shell">
        <aside className="admin-sidebar" data-open={navOpen ? 'true' : 'false'}>
          <div className="admin-sidebar-brand">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'var(--brand)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              Q
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: -0.02 }}>Queenix</div>
              <div style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.4 }}>Admin</div>
            </div>
            <button
              type="button"
              className="admin-nav-toggle"
              aria-label={navOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={navOpen}
              aria-controls="admin-nav"
              onClick={() => setNavOpen((o) => !o)}
            >
              {navOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
          <AdminNav />
        </aside>

        <header className="admin-header">
          <BranchSwitcher />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ThemeToggle />
            <UserChip />
          </div>
        </header>

        <main className="admin-main">{children}</main>
      </div>
    </BranchProvider>
  );
}

function UserChip() {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const name = session?.user?.name ?? session?.user?.email ?? 'Admin';
  const initials = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  async function onSignOut() {
    try {
      await authClient.signOut();
    } finally {
      router.replace('/login');
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--brand)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {initials || 'A'}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
      <button
        onClick={onSignOut}
        title="Sign out"
        aria-label="Sign out"
        style={{
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 6,
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
        }}
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
