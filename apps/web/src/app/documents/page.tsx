'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';

const adminApi = api as any;


export default function DocumentsPage() {
  const templates = useQuery(adminApi.queries.documentsAdmin.listDocumentTemplates, {});
  const [openId, setOpenId] = useState<string | null>(null);
  const sigs = useQuery(
    adminApi.queries.documentsAdmin.listSignatures,
    openId ? { templateId: openId as any, limit: 50 } : 'skip'
  );

  return (
    <RequireAuth>
      <AdminShell>
      <div>
        <h1>Legal documents</h1>
        <p style={{ color: 'var(--text-muted)', margin: '4px 0 16px' }}>Agreement &amp; waiver templates with signature counts (staff only).</p>
        {!templates ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading templates…</p>
        ) : templates.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No document templates published yet. Templates are added via the backend seed or a future template editor.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {templates.map((t: any) => (
              <div key={t._id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14, background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.title} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>v{t.version}</span></div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.type} · {t.required ? 'required' : 'optional'} · effective {new Date(t.effectiveDate).toLocaleDateString()} · {t.signatureCount} signatures</div>
                  </div>
                  <button onClick={() => setOpenId(openId === t._id ? null : t._id)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>
                    {openId === t._id ? 'Hide' : 'Signatures'}
                  </button>
                </div>
                {openId === t._id && (
                  <div style={{ marginTop: 10, fontSize: 13 }}>
                    {!sigs ? (
                      <p style={{ color: 'var(--text-muted)' }}>Loading signatures…</p>
                    ) : sigs.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)' }}>No signatures on this template yet.</p>
                    ) : (
                      <ul style={{ paddingLeft: 18, display: 'grid', gap: 4 }}>
                        {sigs.map((s: any) => (
                          <li key={s._id}>{s.memberName ?? 'Unknown member'} — signed {new Date(s.signedAt).toLocaleString()}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
    </RequireAuth>
  );
}
