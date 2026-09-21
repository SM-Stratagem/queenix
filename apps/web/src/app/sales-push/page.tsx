'use client';
/**
 * Web — Sales/promo composer: promotional pushes to members.
 * Persists via `mutations/engagement:sendSalesPush` as `type == 'promotion'`
 * rows in the existing `notifications` table (+ `auditEvents`), so the
 * mobile app can render promo cards from its notifications feed later.
 */
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';


const card: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: 16,
};

const input: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 14,
  width: '100%',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--brand)',
  color: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
};

export default function WebSalesPushPage() {
  // New modules: not yet in generated api.d.ts until `convex dev` runs.
  const audience = useQuery((api as any).queries.engagement.audienceCount, {});
  const history = useQuery((api as any).queries.engagement.listBroadcasts, { limit: 20 });
  const send = useMutation((api as any).mutations.engagement.sendSalesPush);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSend() {
    setErr(null);
    setStatus(null);
    if (!title.trim() || !body.trim()) {
      setErr('Title and body are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await send({
        title: title.trim(),
        body: body.trim(),
        cta: cta.trim() || undefined,
        priceCents: price.trim() === '' ? undefined : Math.round(Number(price) * 100),
        audience: 'members',
      });
      setStatus(`Promo sent to ${res.sent} member${res.sent === 1 ? '' : 's'}. Batch ${res.batchId}.`);
      setTitle('');
      setBody('');
      setCta('');
      setPrice('');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to send promo');
    } finally {
      setBusy(false);
    }
  }

  const promos = history?.broadcasts?.filter((b: any) => b.type === 'promotion') ?? [];

  return (
    <RequireAuth>
      <AdminShell>
      <div>

        <h1 style={{ color: 'var(--text)' }}>Sales push</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {audience === undefined
            ? 'Loading audience…'
            : `Audience: ${audience.members} member${audience.members === 1 ? '' : 's'}. Promos appear as promotion cards in the member notifications feed.`}
        </p>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Compose promo</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <input style={input} placeholder="Promo title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
              style={{ ...input, minHeight: 90 }}
              placeholder="Promo details"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input style={{ ...input, width: undefined, flex: 1 }} placeholder="CTA (e.g. Claim offer)" value={cta} onChange={(e) => setCta(e.target.value)} />
              <input style={{ ...input, width: undefined, flex: 1 }} placeholder="Price (optional)" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <button style={btnPrimary} disabled={busy} onClick={onSend}>
                {busy ? 'Sending…' : 'Push promo to members'}
              </button>
            </div>
            {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
            {status && <p style={{ color: 'var(--success)' }}>{status}</p>}
          </div>
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Recent promos</h2>
          {history === undefined ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : promos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No promos pushed yet — compose the first one above.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {promos.map((b: any) => (
                <div key={b.batchId} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{b.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {new Date(b.createdAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{b.body}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
    </RequireAuth>
  );
}
