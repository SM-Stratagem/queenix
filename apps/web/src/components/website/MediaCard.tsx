'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@queenix/convex';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { btnGhost, btnPrimary, card, inputStyle } from '@/components/admin/styles';
import { errMsg } from '@/lib/errors';
import { Notice, label } from './WebsiteHeader';

export const ALBUMS = ['gallery', 'hero', 'blog', 'general'] as const;
export type Album = (typeof ALBUMS)[number];

type Media = FunctionReturnType<typeof api.queries.siteAdmin.listMedia>[number];

const iconBtn: React.CSSProperties = { ...btnGhost, padding: '6px 8px', display: 'inline-flex', alignItems: 'center' };

/** One library tile: thumbnail + inline edit, publish, reorder, delete. */
export function MediaCard({ m, first, last }: { m: Media; first: boolean; last: boolean }) {
  const update = useMutation(api.mutations.site.updateMedia);
  const move = useMutation(api.mutations.site.moveMedia);
  const remove = useMutation(api.mutations.site.deleteMedia);
  const [alt, setAlt] = useState(m.alt);
  const [caption, setCaption] = useState(m.caption ?? '');
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const dirty = alt !== m.alt || caption !== (m.caption ?? '');
  const id = m._id;

  async function run(fn: () => Promise<unknown>, done?: string) {
    setOk(null);
    setErr(null);
    try {
      await fn();
      if (done) setOk(done);
    } catch (e) {
      setErr(errMsg(e, 'Something went wrong'));
    }
  }

  return (
    <article aria-label={`Image: ${m.alt}`} style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--bg)' }}>
        {m.src ? (
          <img src={m.src} alt={m.alt} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>No preview</span>
        )}
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 999,
            background: m.published ? 'var(--success)' : 'rgba(0,0,0,0.7)',
            color: '#fff',
          }}
        >
          {m.published ? 'Published' : 'Hidden'}
        </span>
      </div>
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>
        <label style={label}>
          Alt text
          <input value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={300} style={inputStyle} />
        </label>
        <label style={label}>
          Caption
          <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} style={inputStyle} />
        </label>
        {dirty && (
          <button type="button" onClick={() => run(() => update({ id, alt, caption }), 'Saved.')} style={{ ...btnPrimary, justifySelf: 'start' }}>
            Save details
          </button>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            aria-label="Album"
            value={m.album}
            onChange={(e) => run(() => update({ id, album: e.target.value as Album }), 'Moved album.')}
            style={{ ...inputStyle, width: 'auto', flex: '1 1 90px' }}
          >
            {ALBUMS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={m.published} onChange={(e) => run(() => update({ id, published: e.target.checked }))} />
            Published
          </label>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button type="button" aria-label="Move up" title="Move up" disabled={first} onClick={() => run(() => move({ id, dir: -1 }))} style={{ ...iconBtn, opacity: first ? 0.4 : 1 }}>
            <ArrowUp size={14} />
          </button>
          <button type="button" aria-label="Move down" title="Move down" disabled={last} onClick={() => run(() => move({ id, dir: 1 }))} style={{ ...iconBtn, opacity: last ? 0.4 : 1 }}>
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${m.alt}"? This removes the file and cannot be undone.`)) run(() => remove({ id }));
            }}
            style={{ ...iconBtn, marginLeft: 'auto', gap: 4, color: 'var(--danger)' }}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
        <Notice ok={ok} err={err} />
      </div>
    </article>
  );
}
