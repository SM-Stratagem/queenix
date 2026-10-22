'use client';
/**
 * Signed paper forms: pick member (unless fixed) + document → scan → review
 * the OCR text → confirm → signature record with the image (scans.attachPaperForm).
 * MemberDocuments lists one member's e-signed and paper-signed documents.
 */
import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api, type OcrResult } from '@queenix/convex';
import { errMsg } from '@/lib/errors';
import { ScanButton, ScanLink, ScanNotice, button, input, panel, useUploadScan } from './ScanKit';

export function PaperFormUpload({ memberId: fixedMember }: { memberId?: string }) {
  const templates = useQuery(api.queries.documentsAdmin.listActiveTemplates, {});
  const [search, setSearch] = useState('');
  const members = useQuery(
    api.queries.users.getMembersDirectory,
    !fixedMember && search.trim().length >= 2 ? { search, limit: 8 } : 'skip'
  );
  const attach = useMutation(api.mutations.scans.attachPaperForm);
  const upload = useUploadScan();
  const [memberId, setMemberId] = useState(fixedMember ?? '');
  const [templateId, setTemplateId] = useState('');
  const [scan, setScan] = useState<{ result: OcrResult; file: File } | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function confirm() {
    if (!scan || !memberId || !templateId) return;
    setBusy(true);
    setMsg(null);
    try {
      const scanStorageId = await upload(scan.file);
      await attach({ memberId: memberId as any, templateId: templateId as any, scanStorageId, text });
      setScan(null);
      setMsg('Signed form attached.');
    } catch (e) {
      setMsg(errMsg(e, 'Could not attach form.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={panel} aria-label="Upload signed form">
      <strong>Upload signed form</strong>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!fixedMember && (
          <>
            <input aria-label="Find member" placeholder="Find member (name/email)" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...input, width: 200 }} />
            <select aria-label="Member" value={memberId} onChange={(e) => setMemberId(e.target.value)} style={{ ...input, minWidth: 200 }}>
              <option value="">Pick a member</option>
              {(members ?? []).map((m: any) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.fullName} · {m.user.email}
                </option>
              ))}
            </select>
          </>
        )}
        <select aria-label="Document" value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={{ ...input, minWidth: 200 }}>
          <option value="">Pick the document</option>
          {(templates ?? []).map((t: any) => (
            <option key={t._id} value={t._id}>
              {t.title} v{t.version}
            </option>
          ))}
        </select>
        <ScanButton
          kind="document"
          label="Scan signed form"
          onResult={(result, file) => {
            setScan({ result, file });
            setText(result.fields?.text ?? '');
            setMsg(null);
          }}
        />
      </div>
      {scan && (
        <>
          <ScanNotice result={scan.result} />
          {!scan.result.fields?.signed_by_detected && (
            <div style={{ fontSize: 12, color: '#d97706' }}>No signature label found — check the photo shows the signed page.</div>
          )}
          <textarea aria-label="Extracted text" value={text} onChange={(e) => setText(e.target.value)} rows={6} style={{ ...input, width: '100%', fontFamily: 'monospace', fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirm} disabled={busy || !memberId || !templateId} style={{ ...button, background: 'var(--brand)', color: '#fff' }}>
              {busy ? 'Saving…' : 'Confirm & attach'}
            </button>
            <button onClick={() => setScan(null)} style={button}>
              Discard
            </button>
          </div>
        </>
      )}
      {msg && <p style={{ fontSize: 13, margin: 0 }}>{msg}</p>}
    </div>
  );
}

export function MemberDocuments({ memberId }: { memberId: string }) {
  const sigs = useQuery(api.queries.documentsAdmin.listMemberSignatures, { userId: memberId as any });
  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h2 style={{ fontSize: 17, margin: '20px 0 0' }}>Documents</h2>
      {!sigs ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Loading documents…</p>
      ) : sigs.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>No signed documents.</p>
      ) : (
        <ul data-testid="member-documents" style={{ fontSize: 14, display: 'grid', gap: 6, paddingLeft: 18, margin: 0 }}>
          {sigs.map((s: any) => (
            <li key={s._id}>
              {s.templateTitle} v{s.documentVersion} — signed {new Date(s.signedAt).toLocaleDateString()}
              {s.paperScanStorageId && (
                <>
                  {' · '}
                  <ScanLink storageId={s.paperScanStorageId} label="paper copy" />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <PaperFormUpload memberId={memberId} />
    </section>
  );
}
