'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Building2 } from 'lucide-react';
import { QueryBoundary, EmptyState } from './QueryBoundary';

const STORAGE_KEY = 'qx-branch-scope';
const ALL = 'all';
const MAIN = 'main';

const BranchContext = createContext<{ scope: string; setScope: (s: string) => void }>({
  scope: ALL,
  setScope: () => {},
});

export function useBranch() {
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

type Option = { id: string; label: string };

/**
 * Multi-branch switcher.
 *
 * BACKEND GAP (no schema change made): there is no branch/location table in
 * convex/schema/*, so the only org data to scope over is the staff
 * directory (staffProfiles.department via queries/org:staffDirectory).
 * Options are therefore "All branches" + "Main Branch" + one scope entry
 * per live department. Department scopes only label the dashboard scope
 * chip — widgets are NOT filtered by department because no backend table
 * carries a branch/department key for revenue, access, or classes.
 */
function SwitcherInner() {
  const { scope, setScope } = useBranch();
  const directory = useQuery(api.queries.org.staffDirectory, { limit: 200 });

  const options: Option[] = React.useMemo(() => {
    const base: Option[] = [
      { id: ALL, label: 'All branches' },
      { id: MAIN, label: 'Main Branch — Queenix Gym' },
    ];
    if (!directory) return base;
    const depts = new Map<string, number>();
    for (const row of directory) {
      const d = (row as { profile?: { department?: string } | null }).profile?.department;
      if (d) depts.set(d, (depts.get(d) ?? 0) + 1);
    }
    for (const [d, n] of [...depts.entries()].sort()) {
      base.push({ id: `dept:${d}`, label: `${d} · ${n} staff` });
    }
    return base;
  }, [directory]);

  const valid = options.some((o) => o.id === scope) ? scope : ALL;

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <Building2 size={16} color="var(--text-muted)" />
      <span className="admin-branch-label" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
        Branch
      </span>
      {directory === undefined ? (
        <span style={{ color: 'var(--text-muted)' }}>Loading…</span>
      ) : (
        <select
          value={valid}
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
  return (
    <QueryBoundary
      fallback={
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
          <Building2 size={16} />
          Main Branch — Queenix Gym
        </label>
      }
    >
      <SwitcherInner />
    </QueryBoundary>
  );
}

export function ScopeNote() {
  const { scope } = useBranch();
  if (scope === ALL || scope === MAIN) return null;
  return <EmptyState message={`Scope "${scope.replace(/^dept:/, '')}" labels this view only — single-site data, not filtered by department (no branch table in backend).`} />;
}
