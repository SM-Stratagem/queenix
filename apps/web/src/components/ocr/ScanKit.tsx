'use client';
/**
 * Web OCR building blocks: pick/capture a photo → /api/ocr, the confidence +
 * warnings banner every review form shows, image upload to Convex storage
 * (on confirm only), and a staff-only link back to a stored scan.
 */
import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api, type OcrResult, type ScanKind } from '@queenix/convex';

export const input: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
};
export const button: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg-muted)',
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};
export const panel: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: 12,
  background: 'var(--bg-elevated)',
  display: 'grid',
  gap: 8,
};

async function ocrScan(kind: ScanKind, file: File): Promise<OcrResult> {
  const fd = new FormData();
  fd.append('kind', kind);
  fd.append('file', file);
  const res = await fetch('/api/ocr', { method: 'POST', body: fd, credentials: 'same-origin' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? `Scan failed (${res.status})`);
  return json as OcrResult;
}

/** Returns upload(file) → Convex storageId. Call it only when the human confirms. */
export function useUploadScan() {
  const generateUploadUrl = useMutation(api.mutations.scans.generateUploadUrl);
  return async (file: Blob): Promise<any> => {
    const url = await generateUploadUrl({});
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': file.type || 'image/jpeg' }, body: file });
    if (!res.ok) throw new Error('Image upload failed');
    return (await res.json()).storageId;
  };
}

/** Camera (phones/tablets) or file picker → OCR. */
export function ScanButton({
  kind,
  label,
  onResult,
}: {
  kind: ScanKind;
  label: string;
  onResult: (result: OcrResult, file: File) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onResult(await ocrScan(kind, file), file);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <label style={{ ...button, opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Reading…' : label}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          aria-label={label}
          disabled={busy}
          onChange={pick}
          style={{ display: 'none' }}
        />
      </label>
      {error && (
        <span role="alert" style={{ color: '#dc2626', fontSize: 13 }}>
          {error}
        </span>
      )}
    </span>
  );
}

/** Confidence + OCR warnings above every review form. */
export function ScanNotice({ result }: { result: OcrResult }) {
  const pct = Math.round((result.confidence ?? 0) * 100);
  return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
      <div>
        OCR confidence <strong style={{ color: pct >= 90 ? 'var(--success)' : '#d97706' }}>{pct}%</strong> — check
        every field against the photo before saving. Arabic text is not read.
      </div>
      {result.warnings?.length > 0 && (
        <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: '#d97706' }}>
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Link to a stored scan (Convex serves the URL to finance/operations staff only). */
export function ScanLink({ storageId, label = 'scan' }: { storageId: string; label?: string }) {
  const url = useQuery(api.queries.scans.scanUrl, { storageId: storageId as any });
  if (!url) return <span style={{ color: 'var(--text-muted)' }}>{label}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>
      {label}
    </a>
  );
}

/** Labelled text input for review forms. */
export function Field({
  label,
  value,
  onChange,
  width = 180,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  width?: number;
}) {
  return (
    <label style={{ display: 'grid', gap: 2, fontSize: 12, color: 'var(--text-muted)' }}>
      {label}
      <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...input, width }} />
    </label>
  );
}
