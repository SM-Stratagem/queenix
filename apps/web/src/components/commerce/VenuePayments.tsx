'use client';

/**
 * Shared venue payments UI (coffee + salon dashboards):
 * - VenueGatewayCard: per-venue gateway choice (cash / tap / stripe),
 *   currency, on/off. Secrets stay in env vars — never in the DB.
 * - OrderPay: per-order payment state — paid badge, shareable payment
 *   link creation + copy, and cash-received confirmation.
 */
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';

type Venue = 'coffee' | 'salon';

const commApi = api as any;

const input: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  fontSize: 14,
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

const btnGhost: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  cursor: 'pointer',
  fontSize: 13,
};

export function VenueGatewayCard({ venue, title }: { venue: Venue; title: string }) {
  const settings = useQuery(commApi.queries.commerce.getVenuePaymentSettings, { venue });
  const save = useMutation(commApi.mutations.commerce.saveVenuePaymentSettings);
  const [provider, setProvider] = useState<'cash' | 'tap' | 'stripe'>('cash');
  const [currency, setCurrency] = useState('AED');
  const [enabled, setEnabled] = useState(true);
  const [primed, setPrimed] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Prime the form from stored settings once they load.
  useEffect(() => {
    if (settings && !primed) {
      setProvider(settings.provider ?? 'cash');
      setCurrency(settings.currency ?? 'AED');
      setEnabled(settings.enabled ?? true);
      setPrimed(true);
    }
  }, [settings, primed]);

  async function onSave() {
    setMsg(null);
    try {
      await save({ venue, provider, currency, enabled });
      setMsg('Gateway saved.');
    } catch (e: any) {
      setMsg(e?.data?.message ?? e?.message ?? 'Save failed.');
    }
  }

  return (
    <section
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h2 style={{ color: 'var(--text)', marginBottom: 4 }}>{title} — payment gateway</h2>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
        {settings === undefined
          ? 'Loading settings…'
          : `Now: ${settings.provider} · ${settings.currency} · ${settings.enabled ? 'online payments on' : 'cash only'}`}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={provider} onChange={(e) => setProvider(e.target.value as any)} style={input} aria-label="Gateway provider">
          <option value="cash">Cash only</option>
          <option value="tap">Tap (UAE cards)</option>
          <option value="stripe">Stripe (international)</option>
        </select>
        <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="AED" style={{ ...input, width: 90 }} aria-label="Currency" />
        <label style={{ fontSize: 13, color: 'var(--text)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Online payments on
        </label>
        <button style={btnPrimary} onClick={onSave}>
          Save gateway
        </button>
        {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
        Card secrets stay in server env vars — they are never stored here.
      </p>
    </section>
  );
}

export function OrderPay({
  venue,
  orderId,
  totalLabel,
  paidAt,
  provider,
  paymentLink,
}: {
  venue: Venue;
  orderId: string;
  totalLabel: string;
  paidAt?: number | null;
  provider?: string | null;
  paymentLink?: string | null;
}) {
  const markCoffeeCash = useMutation(api.mutations.commerce.markCoffeeOrderCashPaid);
  const markSalonCash = useMutation(api.mutations.commerce.markSalonBookingCashPaid);
  const [busy, setBusy] = useState(false);
  const [freshLink, setFreshLink] = useState<string | null>(null);
  const link = freshLink ?? paymentLink ?? null;
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onCashPaid() {
    setMsg(null);
    setBusy(true);
    try {
      if (venue === 'coffee') await markCoffeeCash({ orderId: orderId as any });
      else await markSalonCash({ bookingId: orderId as any });
      setMsg('Marked cash paid.');
    } catch (e: any) {
      setMsg(e?.data?.message ?? e?.message ?? 'Failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onCreateLink() {
    setMsg(null);
    setBusy(true);
    try {
      const r = await fetch('/api/commerce/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venue, orderId }),
      });
      const data = await r.json();
      if (!r.ok) {
        setMsg(data.error ?? 'Link creation failed.');
        return;
      }
      setFreshLink(data.paymentLink);
      setMsg(data.reused ? 'Existing link reused.' : `Link created via ${data.provider}.`);
    } catch (e: any) {
      setMsg(e?.message ?? 'Link creation failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg('Copy failed — select the link manually.');
    }
  }

  if (paidAt) {
    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 999,
          background: '#10b98120',
          color: 'var(--success)',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Paid{provider && provider !== 'cash' ? ` · ${provider}` : ' · cash'}
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 8px',
          borderRadius: 999,
          background: '#f59e0b20',
          color: 'var(--warning)',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        Unpaid · {totalLabel}
      </span>
      <button style={btnGhost} onClick={onCreateLink} disabled={busy}>
        {link ? 'Refresh link' : 'Payment link'}
      </button>
      <button style={btnGhost} onClick={onCashPaid} disabled={busy}>
        Cash paid
      </button>
      {link && (
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', maxWidth: 320 }}>
          <input value={link} readOnly style={{ ...input, fontSize: 12, padding: '4px 8px', width: 200 }} aria-label="Payment link" />
          <button style={btnGhost} onClick={onCopy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      )}
      {msg && <span style={{ fontSize: 12 }}>{msg}</span>}
    </span>
  );
}
