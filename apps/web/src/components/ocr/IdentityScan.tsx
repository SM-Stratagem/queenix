'use client';
/**
 * Member detail → "Scan ID": Emirates ID / passport photo → OCR → editable
 * review form → confirm → memberProfiles.identity (staff-verified).
 */
import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { api, identityFromOcr, type IdentityDraft, type OcrResult } from '@queenix/convex';
import { errMsg } from '@/lib/errors';
import { Field, ScanButton, ScanLink, ScanNotice, button, input, panel, useUploadScan } from './ScanKit';

export function IdentityScan({ memberId, identity }: { memberId: string; identity?: any }) {
  const save = useMutation(api.mutations.scans.saveIdentity);
  const upload = useUploadScan();
  const [docType, setDocType] = useState<'emirates_id' | 'passport'>('emirates_id');
  const [scan, setScan] = useState<{ result: OcrResult; file: File } | null>(null);
  const [draft, setDraft] = useState<IdentityDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: keyof IdentityDraft) => (v: string) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function confirm() {
    if (!draft || !scan) return;
    setBusy(true);
    setMsg(null);
    try {
      const scanStorageId = await upload(scan.file);
      await save({ memberId: memberId as any, ...draft, scanStorageId });
      setScan(null);
      setDraft(null);
      setMsg('ID verified and saved.');
    } catch (e) {
      setMsg(errMsg(e, 'Could not save ID.'));
    } finally {
      setBusy(false);
    }
  }

  const self = identity && String(identity.verifiedBy) === String(memberId);
  return (
    <section style={{ display: 'grid', gap: 8 }}>
      <h2 style={{ fontSize: 17, margin: '20px 0 0' }}>ID document</h2>
      {identity ? (
        <div data-testid="member-identity" style={{ fontSize: 14 }}>
          <strong>{identity.docType === 'passport' ? 'Passport' : 'Emirates ID'} {identity.docNumber}</strong> ·{' '}
          {identity.fullName}
          {identity.nationality ? ` · ${identity.nationality}` : ''}
          {identity.expiryDate ? ` · expires ${identity.expiryDate}` : ''}
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {self ? 'Self-scanned by member' : 'Verified by staff'} {new Date(identity.verifiedAt).toLocaleString()}
            {identity.scanStorageId && (
              <>
                {' · '}
                <ScanLink storageId={identity.scanStorageId} label="view scan" />
              </>
            )}
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>No ID on file.</p>
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select aria-label="ID type" value={docType} onChange={(e) => setDocType(e.target.value as any)} style={input}>
          <option value="emirates_id">Emirates ID</option>
          <option value="passport">Passport</option>
        </select>
        <ScanButton
          kind={docType}
          label="Scan ID"
          onResult={(result, file) => {
            setScan({ result, file });
            setDraft(identityFromOcr(result));
            setMsg(null);
          }}
        />
      </div>
      {scan && draft && (
        <div style={panel} aria-label="Review ID">
          <ScanNotice result={scan.result} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Field label={draft.docType === 'passport' ? 'Passport number' : 'ID number'} value={draft.docNumber} onChange={set('docNumber')} />
            <Field label="Full name" value={draft.fullName} onChange={set('fullName')} width={220} />
            <Field label="Nationality" value={draft.nationality} onChange={set('nationality')} width={120} />
            <Field label="Date of birth" value={draft.dateOfBirth} onChange={set('dateOfBirth')} width={120} />
            <Field label="Expiry date" value={draft.expiryDate} onChange={set('expiryDate')} width={120} />
            <Field label="Sex" value={draft.sex} onChange={set('sex')} width={50} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={confirm} disabled={busy} style={{ ...button, background: 'var(--brand)', color: '#fff' }}>
              {busy ? 'Saving…' : 'Confirm & save ID'}
            </button>
            <button onClick={() => setScan(null)} style={button}>
              Discard
            </button>
          </div>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, margin: 0 }}>{msg}</p>}
    </section>
  );
}
