'use client';
/**
 * Web — Salon ops: services catalogue + sales / revenue / inflow + booking queue.
 * Cash / test-mode only (see PAYMENTS_TODO.commerce.md).
 */
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';
import { VenueGatewayCard, OrderPay } from '@/components/commerce/VenuePayments';


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

function fmt(cents: number) {
  return `${(cents / 100).toFixed(2)}`;
}

export default function WebSalonPage() {
  const services = useQuery(api.queries.commerce.listSalonServices, {});
  const queue = useQuery(api.queries.commerce.salonQueue, {});
  // New module: not yet in generated api.d.ts until `convex dev` runs.
  const revenue = useQuery((api as any).queries.commerceOps.getSalonRevenue, {});
  const create = useMutation(api.mutations.commerce.createSalonService);
  const toggle = useMutation(api.mutations.commerce.setSalonServiceActive);
  const remove = useMutation((api.mutations as any).commerce.deleteSalonService);
  const update = useMutation(api.mutations.commerce.updateSalonBookingStatus);
  const walkIn = useMutation((api.mutations as any).commerce.createCounterSalonBooking);
  const [walkService, setWalkService] = useState('');
  const [walkDate, setWalkDate] = useState('');
  const [walkTime, setWalkTime] = useState('');
  const [walkMsg, setWalkMsg] = useState<string | null>(null);

  async function onWalkIn() {
    setWalkMsg(null);
    if (!walkService || !walkDate || !walkTime) {
      setWalkMsg('Pick a service, date and time.');
      return;
    }
    const startAt = Date.parse(`${walkDate}T${walkTime}:00`);
    if (!Number.isFinite(startAt)) {
      setWalkMsg('Use YYYY-MM-DD and HH:MM.');
      return;
    }
    try {
      await walkIn({ serviceId: walkService as any, startAt });
      setWalkService('');
      setWalkDate('');
      setWalkTime('');
      setWalkMsg('Walk-in booked (cash).');
    } catch (e: any) {
      setWalkMsg(e?.data?.message ?? e?.message ?? 'Walk-in failed.');
    }
  }

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [err, setErr] = useState<string | null>(null);

  const servicePrice = new Map((services ?? []).map((s: any) => [String(s._id), s.priceCents as number]));

  async function onCreate() {
    setErr(null);
    if (!name.trim()) return;
    try {
      await create({
        name: name.trim(),
        priceCents: Math.round(Number(price || 0) * 100),
        durationMin: Number(duration || 30),
      });
      setName('');
      setPrice('');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create service');
    }
  }

  return (
    <RequireAuth>
      <AdminShell>
      <div>

        <h1 style={{ color: 'var(--text)' }}>Salon management</h1>

        <VenueGatewayCard venue="salon" title="Salon" />

        <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Revenue (non-cancelled)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
              {revenue === undefined ? '…' : fmt(revenue.grossCents)}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Billable bookings</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
              {revenue === undefined ? '…' : revenue.bookingCount}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Open queue</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
              {queue === undefined ? '…' : queue.length}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Inflow by status</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>
              {revenue === undefined
                ? '…'
                : Object.entries(revenue.byStatus as Record<string, number>).map(([k, v]) => (
                    <div key={k}>
                      {k}: {v}
                    </div>
                  ))}
            </div>
          </div>
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Add service</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={input} placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
            <input
              style={input}
              placeholder="Duration (min)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <button style={btnPrimary} onClick={onCreate}>Create service</button>
          </div>
          {err && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{err}</p>}
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Services</h2>
          {services === undefined ? (
            'Loading…'
          ) : services.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No services yet — add the first one above.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {services.map((s: any) => (
                <div key={String(s._id)} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text)' }}>
                    {s.name} · {fmt(s.priceCents)} · {s.durationMin} min
                  </span>
                  <button style={btnGhost} onClick={() => toggle({ serviceId: s._id, isActive: !s.isActive })}>
                    {s.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    style={{ ...btnGhost, color: '#dc2626', borderColor: '#dc262680' }}
                    onClick={async () => {
                      if (!confirm(`Remove "${s.name}" from services?`)) return;
                      setErr(null);
                      try {
                        await remove({ serviceId: s._id });
                      } catch (e: any) {
                        setErr(e?.data?.message ?? e?.message ?? 'Remove failed.');
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Walk-in booking (counter, cash)</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={walkService} onChange={(e) => setWalkService(e.target.value)} style={input} aria-label="Walk-in service">
              <option value="">Pick service…</option>
              {(services ?? []).filter((s: any) => s.isActive).map((s: any) => (
                <option key={String(s._id)} value={String(s._id)}>
                  {s.name} · {fmt(s.priceCents)} · {s.durationMin} min
                </option>
              ))}
            </select>
            <input type="date" value={walkDate} onChange={(e) => setWalkDate(e.target.value)} style={input} aria-label="Date" />
            <input value={walkTime} onChange={(e) => setWalkTime(e.target.value)} placeholder="HH:MM" style={{ ...input, width: 100 }} aria-label="Time" />
            <button style={btnPrimary} onClick={onWalkIn}>Book &amp; take cash</button>
            {walkMsg && <span style={{ fontSize: 13 }}>{walkMsg}</span>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
            Cash is counter-only — members book from the app and pay at the till.
          </p>
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Booking queue</h2>
          {queue === undefined ? (
            'Loading…'
          ) : queue.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Queue is empty — no pending or confirmed bookings.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {queue.map((b: any) => (
                <div key={String(b._id)} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text)' }}>
                    {new Date(b.startAt).toLocaleString()} · {b.status} · {b.paymentMode}
                  </span>
                  <button style={btnGhost} onClick={() => update({ bookingId: b._id, status: 'confirmed' })}>
                    Confirm
                  </button>
                  <button style={btnGhost} onClick={() => update({ bookingId: b._id, status: 'completed' })}>
                    Complete
                  </button>
                  <button style={btnGhost} onClick={() => update({ bookingId: b._id, status: 'cancelled' })}>
                    Cancel
                  </button>
                  <OrderPay
                    venue="salon"
                    orderId={String(b._id)}
                    totalLabel={`${fmt(servicePrice.get(String(b.serviceId)) ?? 0)} AED`}
                    paidAt={b.paidAt}
                    provider={b.paymentProvider}
                    paymentLink={b.paymentLink}
                  />
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
