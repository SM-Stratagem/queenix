/**
 * Member — Coffee: browse menu, place an order (pay at counter).
 * Role contract: member orders; cash is counter-only (staff dashboards);
 * staff fulfil in (ops)/coffee-queue and confirm cash on pickup.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Button, Card, EmptyState, Screen, Stack, Text } from '@queenix/ui';

export default function MemberCoffee() {
  const menu = useQuery(api.queries.commerce.coffeeMenu, {});
  const mine = useQuery(api.queries.commerce.myCoffeeOrders, {});
  const order = useMutation(api.mutations.commerce.orderCoffee);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([itemId, qty]) => ({ itemId: itemId as any, qty })),
    [cart],
  );
  const total = useMemo(() => {
    if (!menu) return 0;
    const price = new Map(menu.map((m: any) => [String(m._id), m.priceCents as number]));
    return lines.reduce((s, l) => s + (price.get(String(l.itemId)) ?? 0) * l.qty, 0);
  }, [menu, lines]);

  function bump(id: string, d: number) {
    setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));
  }

  async function submit() {
    if (lines.length === 0 || busy) return;
    setBusy(true);
    try {
      await order({ items: lines, paymentMode: 'counter' });
      setCart({});
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack>
        <Text variant="title">Coffee</Text>
        <Text>Pay at the counter on pickup — cash and cards accepted there.</Text>

        <Text variant="heading">Menu</Text>
        {menu === undefined ? (
          <Text>Loading…</Text>
        ) : menu.length === 0 ? (
          <EmptyState title="Menu is empty" />
        ) : (
          menu.map((m: any) => {
            const qty = cart[String(m._id)] ?? 0;
            return (
              <Card key={String(m._id)}>
                <Text variant="heading">{m.name}</Text>
                {m.description ? <Text>{m.description}</Text> : null}
                <Text>{(m.priceCents / 100).toFixed(2)}</Text>
                <Stack direction="row">
                  <Button label="−" onPress={() => bump(String(m._id), -1)} disabled={qty === 0} />
                  <Text>{qty}</Text>
                  <Button label="+" onPress={() => bump(String(m._id), 1)} />
                </Stack>
              </Card>
            );
          })
        )}

        <Card>
          <Text variant="heading">Cart · {(total / 100).toFixed(2)}</Text>
          <Button
            label={busy ? 'Placing…' : `Place order (${lines.length} lines)`}
            onPress={submit}
            disabled={lines.length === 0 || busy}
          />
        </Card>

        <Text variant="heading">My orders</Text>
        {mine === undefined ? (
          <Text>Loading…</Text>
        ) : mine.length === 0 ? (
          <EmptyState title="No orders yet" />
        ) : (
          mine.map((o: any) => (
            <Card key={String(o._id)}>
              <Text>
                {o.items.length} items · {(o.totalCents / 100).toFixed(2)} · {o.status} ·{' '}
                {o.paymentMode}
              </Text>
            </Card>
          ))
        )}
      </Stack>
    </Screen>
  );
}
