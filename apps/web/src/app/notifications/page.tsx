'use client';
/**
 * Web — Notification composer: custom in-app broadcasts to members.
 * Persists via `mutations/engagement:sendBroadcastNotification` into the
 * existing `notifications` table (+ `auditEvents`), so the mobile app can
 * consume sends through its normal notifications feed later.
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

const TYPES = ['system', 'class_reminder', 'membership', 'booking', 'reward'] as const;

export default function WebNotificationsPage() {
  // New modules: not yet in generated api.d.ts until `convex dev` runs.
  const audience = useQuery((api as any).queries.engagement.audienceCount, {});
  const history = useQuery((api as any).queries.engagement.listBroadcasts, { limit: 20 });
  const send = useMutation((api as any).mutations.engagement.sendBroadcastNotification);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<string>('system');
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
      const res = await send({ title: title.trim(), body: body.trim(), type, audience: 'members' });
      setStatus(`Sent to ${res.sent} member${res.sent === 1 ? '' : 's'}${res.capped ? ' (audience larger than one batch — send again with offset to continue)' : ''}. Batch ${res.batchId}.`);
      setTitle('');
      setBody('');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to send');
    } finally {
      setBusy(false);
    }
  }

  return (
    <RequireAuth>
      <AdminShell>
      <div>

        <h1 style={{ color: 'var(--text)' }}>Notifications</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {audience === undefined
            ? 'Loading audience…'
            : `Audience: ${audience.members} member${audience.members === 1 ? '' : 's'} (${audience.total} users total${audience.capped ? ', capped preview' : ''}). Sends land in each member's in-app notifications feed.`}
        </p>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Compose broadcast</h2>
          <div style={{ display: 'grid', gap: 8 }}>
            <input style={input} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
              style={{ ...input, minHeight: 90 }}
              placeholder="Message body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <select style={input} value={type} onChange={(e) => setType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button style={btnPrimary} disabled={busy} onClick={onSend}>
                {busy ? 'Sending…' : 'Send to members'}
              </button>
            </div>
            {err && <p style={{ color: 'var(--danger)' }}>{err}</p>}
            {status && <p style={{ color: 'var(--success)' }}>{status}</p>}
          </div>
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Recent sends</h2>
          {history === undefined ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
          ) : history.broadcasts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No broadcasts sent yet — compose the first one above.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {history.broadcasts.map((b: any) => (
                <div key={b.batchId} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{b.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {b.type} · {b.audience ?? 'members'} · {new Date(b.createdAt).toLocaleString()}
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
