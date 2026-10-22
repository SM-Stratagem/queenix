'use client';

import Link from 'next/link';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';

type Album = 'gallery' | 'hero' | 'blog' | 'general';

/** Pick one image from the media library (optionally one album). '' = none. */
export function MediaPicker({
  label,
  album,
  value,
  onChange,
  noneLabel = 'None',
}: {
  label: string;
  album?: Album;
  value: string;
  onChange: (id: string) => void;
  noneLabel?: string;
}) {
  const media = useQuery(api.queries.siteAdmin.listMedia, album ? { album } : {});
  const tile = (selected: boolean): React.CSSProperties => ({
    width: 96,
    height: 72,
    borderRadius: 8,
    padding: 0,
    overflow: 'hidden',
    cursor: 'pointer',
    background: 'var(--bg)',
    color: 'var(--text-muted)',
    fontSize: 12,
    border: selected ? '2px solid var(--brand)' : '1px solid var(--border)',
    flex: '0 0 auto',
  });
  return (
    <div role="group" aria-label={label} style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{label}</span>
      {media === undefined ? (
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading images…</span>
      ) : (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button type="button" aria-pressed={!value} onClick={() => onChange('')} style={tile(!value)}>
            {noneLabel}
          </button>
          {media.map((m) => (
            <button
              key={m._id}
              type="button"
              aria-pressed={value === m._id}
              aria-label={`Use image: ${m.alt}`}
              title={m.alt}
              onClick={() => onChange(m._id)}
              style={tile(value === m._id)}
            >
              {m.src && <img src={m.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
            </button>
          ))}
          {media.length === 0 && (
            <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>
              No {album ?? ''} images yet — <Link href="/website/media" style={{ color: 'var(--brand)' }}>upload one</Link>.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
