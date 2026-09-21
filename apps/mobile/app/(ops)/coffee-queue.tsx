/**
 * Ops — Coffee queue: preparing / ready / served / cancelled.
 * Roles: 'superadmin' | 'admin' | 'owner' | 'operations' | 'coffee'.
 * Server enforces staff roles; this screen only renders the queue.
 */
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Button, Card, EmptyState, Screen, Stack, Text } from '@queenix/ui';

type Step = 'preparing' | 'ready' | 'served';

const NEXT: Record<string, { label: string; status: Step }[]> = {
  queued: [{ label: 'Start preparing', status: 'preparing' }],
  preparing: [{ label: 'Mark ready', status: 'ready' }],
  ready: [{ label: 'Mark served', status: 'served' }],
};

export default function OpsCoffeeQueue() {
  const queue = useQuery(api.queries.commerce.coffeeQueue, {});
  const update = useMutation(api.mutations.commerce.updateCoffeeOrderStatus);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, status: Step | 'cancelled') {
    setBusy(id);
    try {
      await update({ orderId: id as any, status });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Stack>
        <Text variant="title">Coffee queue</Text>
        {queue === undefined ? (
          <Text>Loading…</Text>
        ) : queue.length === 0 ? (
          <EmptyState title="Queue is clear" />
        ) : (
          queue.map((o: any) => {
            const id = String(o._id);
            return (
              <Card key={id}>
                <Text variant="heading">
                  {o.items.reduce((s: number, l: any) => s + l.qty, 0)} items ·{' '}
                  {(o.totalCents / 100).toFixed(2)} · {o.status}
                </Text>
                {o.items.map((l: any, i: number) => (
                  <Text key={i}>
                    {l.qty}× @ {(l.unitPriceCents / 100).toFixed(2)}
                  </Text>
                ))}
                <Stack direction="row">
                  {(NEXT[o.status] ?? []).map((n) => (
                    <Button
                      key={n.status}
                      label={busy === id ? '…' : n.label}
                      onPress={() => act(id, n.status)}
                      disabled={busy !== null}
                    />
                  ))}
                  <Button
                    label="Cancel"
                    onPress={() => act(id, 'cancelled')}
                    disabled={busy !== null}
                  />
                </Stack>
              </Card>
            );
          })
        )}
      </Stack>
    </Screen>
  );
}
