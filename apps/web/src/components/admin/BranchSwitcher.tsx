'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Building2 } from 'lucide-react';
import { QueryBoundary, EmptyState } from './QueryBoundary';
import { canOpen, useSessionRoles } from '@/lib/access';

// v2: earlier builds stored department scopes ('dept:…'), not branch ids.
const STORAGE_KEY = 'qx-branch-scope-v2';
const ALL = 'all';

const BranchContext = createContext<{ scope: string; setScope: (s: string) => void }>({
  scope: ALL,
  setScope: () => {},
});

function useBranch() {
  return useContext(BranchContext);
}

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState(ALL);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setScope(saved);
    } catch {
      // Private-mode storage failure: stay on the default scope.
    }
  }, []);
  const change = (s: string) => {
    setScope(s);
    try {
      window.localStorage.setItem(STORAGE_KEY, s);
    } catch {
      // Non-fatal; selection still applies for this session.
    }
  };
  return <BranchContext.Provider value={{ scope, setScope: change }}>{children}</BranchContext.Provider>;
}

/** Selected branch id (branches table), or null for "All branches". */
export function useBranchScope(): string | null {
  const { scope } = useBranch();
  return scope === ALL ? null : scope;
}

/**
 * Branch switcher over the real `branches` table (queries/branches:branchesList).
 * Only data carrying a branchId (events) is filtered by it — see ScopeNote.
 */
function SwitcherInner() {
  const { scope, setScope } = useBranch();
  const branches = useQuery(api.queries.branches.branchesList, { includeInactive: false });
  const options = (branches ?? []).map(({ branch }) => ({ id: String(branch._id), label: branch.name }));
  // A saved scope for a since-deactivated branch falls back to All.
  useEffect(() => {
    if (branches && scope !== ALL && !options.some((o) => o.id === scope)) setScope(ALL);
  }, [branches, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <Building2 size={16} color="var(--text-muted)" />
      <span className="admin-branch-label" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
        Branch
      </span>
      {branches === undefined ? (
        <span style={{ color: 'var(--text-muted)' }}>Loading…</span>
      ) : (
        <select
          value={options.some((o) => o.id === scope) ? scope : ALL}
          onChange={(e) => setScope(e.target.value)}
          aria-label="Branch scope"
          style={{
            background: 'var(--bg-muted)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 13,
            fontWeight: 600,
            maxWidth: 240,
          }}
        >
          <option value={ALL}>All branches</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </label>
  );
}

export function BranchSwitcher() {
  const fixed = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
      <Building2 size={16} />
      Queenix Gym
    </label>
  );
  // Branch scope only matters to the managers who see branch-keyed pages.
  const roles = useSessionRoles();
  const { isAuthenticated } = useConvexAuth();
  if (!isAuthenticated || !canOpen(roles, '/branches')) return fixed;
  return (
    <QueryBoundary fallback={fixed} retry={false}>
      <SwitcherInner />
    </QueryBoundary>
  );
}

/** Says what the branch scope does on pages it can't filter. */
export function ScopeNote() {
  const scope = useBranchScope();
  if (!scope) return null;
  return (
    <EmptyState message="Branch scope filters Events. Dashboard figures are gym-wide: memberships, payments and check-ins aren't recorded per branch yet." />
  );
}
