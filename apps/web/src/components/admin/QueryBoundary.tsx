'use client';

import React from 'react';
import Link from 'next/link';

/**
 * Catches thrown Convex query errors (e.g. role-gated queries for a user
 * without that role, or logged-out reads) and renders an honest empty
 * state instead of crashing the page. Loading (`undefined` data) is NOT
 * handled here — each widget renders its own skeleton while loading.
 *
 * An UNAUTHORIZED error specifically means there is no signed-in Convex
 * identity (expired session or failed token mint) — so the fallback
 * points at sign-in instead of blaming data access.
 */
function isUnauthorized(error: Error): boolean {
  const anyErr = error as unknown as Record<string, unknown>;
  if (anyErr?.code === 'UNAUTHORIZED') return true;
  const msg = String((error as Error)?.message ?? '');
  return msg.includes('"code":"UNAUTHORIZED"') || msg.includes('Not signed in');
}
export class QueryBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode; retry?: boolean },
  { error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch() {
    // Intentionally silent: the fallback UI reports the degraded state.
  }

  // Remounts the children, which re-subscribes their Convex queries (a
  // transient timeout shouldn't need a full page reload).
  retry = () => this.setState({ error: null });

  override render() {
    if (this.state.error) {
      if (!this.props.fallback && isUnauthorized(this.state.error)) {
        return (
          <div
            style={{
              padding: '20px',
              border: '1px dashed var(--border)',
              borderRadius: 12,
              background: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Your session has expired — sign in again to load live data.
            </span>
            <Link
              href="/login"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'white',
                background: 'var(--brand)',
                borderRadius: 8,
                padding: '8px 14px',
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </div>
        );
      }
      if (this.props.retry === false && this.props.fallback) return this.props.fallback;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {this.props.fallback ?? (
            <EmptyState message="Live data unavailable — you may not have access, or the backend is unreachable." />
          )}
          <button
            type="button"
            onClick={this.retry}
            style={{
              alignSelf: 'flex-start',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text)',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '20px',
        border: '1px dashed var(--border)',
        borderRadius: 12,
        color: 'var(--text-muted)',
        fontSize: 13,
        background: 'var(--bg-elevated)',
      }}
    >
      {message}
    </div>
  );
}

export function Skeleton({ height = 120 }: { height?: number }) {
  return (
    <div
      aria-label="Loading…"
      style={{
        height,
        borderRadius: 12,
        background:
          'linear-gradient(90deg, var(--bg-muted) 25%, var(--border) 50%, var(--bg-muted) 75%)',
        backgroundSize: '200% 100%',
        animation: 'qx-shimmer 1.2s infinite',
      }}
    />
  );
}

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 20,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function formatMoney(cents: number, currency = 'AED'): string {
  try {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency,
      // Keep fils (99.99), drop ".00" on whole amounts.
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-AE', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

