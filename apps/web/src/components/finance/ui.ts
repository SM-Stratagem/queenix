import type { CSSProperties } from 'react';

/** Shared inline styles for the finance console's native form controls. */
export const field: CSSProperties = {
  padding: 6,
  borderRadius: 8,
  border: '1px solid var(--border)',
};

const base: CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  fontWeight: 600,
  cursor: 'pointer',
};

export const btn = {
  primary: { ...base, border: 'none', background: '#0081cc', color: 'white' },
  success: { ...base, border: 'none', background: '#10b981', color: 'white', fontSize: 12 },
  danger: { ...base, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626' },
  ghost: {
    ...base,
    border: '1px solid var(--border)',
    background: 'var(--bg-muted)',
    color: 'var(--text)',
    fontSize: 12,
  },
  disabled: { ...base, border: 'none', background: 'var(--bg-muted)', color: 'var(--text-muted)', cursor: 'default' },
} satisfies Record<string, CSSProperties>;

export const th: CSSProperties = {
  textAlign: 'left',
  padding: '8px 0',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  borderBottom: '1px solid var(--border)',
};

export function todayDay(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Money with fils kept: 9999 → "99.99 AED" (never rounded to whole dirhams). */
export function formatPrice(cents: number, currency = 'AED'): string {
  return `${(cents / 100).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
