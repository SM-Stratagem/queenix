import type { CSSProperties } from 'react';

/** Shared inline styles for console cards, buttons and fields. */
export const card: CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
};

export const btnPrimary: CSSProperties = {
  background: 'var(--brand)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
};

export const btnGhost: CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  color: 'var(--text)',
};

export const inputStyle: CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 13,
  background: 'var(--bg)',
  color: 'var(--text)',
  width: '100%',
};
