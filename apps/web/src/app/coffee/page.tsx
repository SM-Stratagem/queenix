'use client';
/**
 * Web — Coffee ops: menu + sales / revenue / inflow + order queue.
 * Cash / test-mode only (see PAYMENTS_TODO.commerce.md).
 */
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { RequireAuth } from '@/components/RequireAuth';
import { AdminShell } from '@/components/admin/AdminShell';
import { VenueGatewayCard, OrderPay } from '@/components/commerce/VenuePayments';

const ORDER_STEPS = ['preparing', 'ready', 'served', 'cancelled'] as const;


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

export default function WebCoffeePage() {
  const menu = useQuery(api.queries.commerce.coffeeMenu, {});
  const queue = useQuery(api.queries.commerce.coffeeQueue, {});
  // New module: not yet in generated api.d.ts until `convex dev` runs.
  const revenue = useQuery((api as any).queries.commerceOps.getCoffeeRevenue, {});
  const create = useMutation(api.mutations.commerce.createCoffeeItem);
  const toggle = useMutation(api.mutations.commerce.setCoffeeItemActive);
  const remove = useMutation((api.mutations as any).commerce.deleteCoffeeItem);
  const update = useMutation(api.mutations.commerce.updateCoffeeOrderStatus);
  const counterSale = useMutation((api.mutations as any).commerce.createCounterCoffeeOrder);
  const [saleItem, setSaleItem] = useState('');
  const [saleQty, setSaleQty] = useState('1');
  const [saleMsg, setSaleMsg] = useState<string | null>(null);

  async function onCounterSale() {
    setSaleMsg(null);
    const qty = Math.round(Number(saleQty));
    if (!saleItem || !Number.isFinite(qty) || qty <= 0) {
      setSaleMsg('Pick an item and a positive quantity.');
      return;
    }
    try {
      await counterSale({ items: [{ itemId: saleItem as any, qty }] });
      setSaleItem('');
      setSaleQty('1');
      setSaleMsg('Counter sale recorded (cash).');
    } catch (e: any) {
      setSaleMsg(e?.data?.message ?? e?.message ?? 'Counter sale failed.');
    }
  }

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function onCreate() {
    setErr(null);
    if (!name.trim()) return;
    try {
      await create({ name: name.trim(), priceCents: Math.round(Number(price || 0) * 100) });
      setName('');
      setPrice('');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create item');
    }
  }

  return (
    <RequireAuth>
      <AdminShell>
      <div>

        <h1 style={{ color: 'var(--text)' }}>Coffee management</h1>

        <VenueGatewayCard venue="coffee" title="Coffee shop" />

        <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Revenue (non-cancelled)</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
              {revenue === undefined ? '…' : fmt(revenue.grossCents)}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Billable orders</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
              {revenue === undefined ? '…' : revenue.orderCount}
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
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Add menu item</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input style={input} placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
            <button style={btnPrimary} onClick={onCreate}>Create item</button>
          </div>
          {err && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{err}</p>}
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Menu</h2>
          {menu === undefined ? (
            'Loading…'
          ) : menu.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No menu items yet — add the first one above.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {menu.map((m: any) => (
                <div key={String(m._id)} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text)' }}>
                    {m.name} · {fmt(m.priceCents)}
                    {!m.isActive && ' (inactive)'}
                  </span>
                  <button style={btnGhost} onClick={() => toggle({ itemId: m._id, isActive: !m.isActive })}>
                    {m.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    style={{ ...btnGhost, color: '#dc2626', borderColor: '#dc262680' }}
                    onClick={async () => {
                      if (!confirm(`Remove "${m.name}" from the menu?`)) return;
                      setErr(null);
                      try {
                        await remove({ itemId: m._id });
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
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Counter sale (walk-up, cash)</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={saleItem} onChange={(e) => setSaleItem(e.target.value)} style={input} aria-label="Counter item">
              <option value="">Pick item…</option>
              {(menu ?? []).filter((m: any) => m.isActive).map((m: any) => (
                <option key={String(m._id)} value={String(m._id)}>
                  {m.name} · {fmt(m.priceCents)}
                </option>
              ))}
            </select>
            <input value={saleQty} onChange={(e) => setSaleQty(e.target.value)} placeholder="Qty" style={{ ...input, width: 80 }} aria-label="Quantity" />
            <button style={btnPrimary} onClick={onCounterSale}>Record cash sale</button>
            {saleMsg && <span style={{ fontSize: 13 }}>{saleMsg}</span>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
            Cash is counter-only — members order from the app and pay on pickup.
          </p>
        </section>

        <section style={card}>
          <h2 style={{ color: 'var(--text)', marginBottom: 8 }}>Order queue</h2>
          {queue === undefined ? (
            'Loading…'
          ) : queue.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Queue is empty — no queued or preparing orders.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {queue.map((o: any) => (
                <div key={String(o._id)} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--text)' }}>
                    {o.items.reduce((s: number, l: any) => s + l.qty, 0)} items · {fmt(o.totalCents)} · {o.status} ·{' '}
                    {o.paymentMode}
                  </span>
                  {ORDER_STEPS.map((s) => (
                    <button key={s} style={btnGhost} onClick={() => update({ orderId: o._id, status: s })}>
                      {s}
                    </button>
                  ))}
                  <OrderPay
                    venue="coffee"
                    orderId={String(o._id)}
                    totalLabel={`${fmt(o.totalCents)} AED`}
                    paidAt={o.paidAt}
                    provider={o.paymentProvider}
                    paymentLink={o.paymentLink}
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
