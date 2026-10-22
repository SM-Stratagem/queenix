'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';

const TABS = [
  { href: '/website', label: 'Content' },
  { href: '/website/media', label: 'Media' },
  { href: '/website/blog', label: 'Blog' },
];

/** Title + Content/Media/Blog tabs + "View on site" for every /website page. */
export function WebsiteHeader({ title, subtitle, viewHref = '/' }: { title: string; subtitle: string; viewHref?: string }) {
  const pathname = usePathname() ?? '';
  return (
    <header style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 style={{ margin: 0 }}>{title}</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>{subtitle}</p>
        </div>
        <a
          href={viewHref}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--brand)', padding: '8px 0' }}
        >
          View on site <ExternalLink size={14} />
        </a>
      </div>
      <nav aria-label="Website sections" style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const active = t.href === '/website' ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? 'page' : undefined}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid var(--border)',
                background: active ? 'var(--brand)' : 'var(--bg-elevated)',
                color: active ? '#fff' : 'var(--text)',
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

/** Inline save/err line; role=status so screen readers + tests see it. */
export function Notice({ ok, err }: { ok?: string | null; err?: string | null }) {
  if (err) return <p role="alert" style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{err}</p>;
  if (ok) return <p role="status" style={{ color: 'var(--success)', fontSize: 13, margin: 0 }}>{ok}</p>;
  return null;
}

export const label: React.CSSProperties = { display: 'grid', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' };
