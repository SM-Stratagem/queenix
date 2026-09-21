/**
 * Ops — Salon queue: confirm / complete / cancel bookings.
 * Roles: 'superadmin' | 'admin' | 'owner' | 'operations' | 'salon'.
 * Server enforces staff roles; this screen only renders the queue.
 */
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Button, Card, EmptyState, Screen, Stack, Text } from '@queenix/ui';

const NEXT: Record<string, { label: string; status: 'confirmed' | 'completed' }[]> = {
  pending: [{ label: 'Confirm', status: 'confirmed' }],
  confirmed: [{ label: 'Complete', status: 'completed' }],
};

export default function OpsSalonQueue() {
  const queue = useQuery(api.queries.commerce.salonQueue, {});
  const update = useMutation(api.mutations.commerce.updateSalonBookingStatus);
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, status: 'confirmed' | 'completed' | 'cancelled') {
    setBusy(id);
    try {
      await update({ bookingId: id as any, status });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Stack>
        <Text variant="title">Salon queue</Text>
        {queue === undefined ? (
          <Text>Loading…</Text>
        ) : queue.length === 0 ? (
          <EmptyState title="Queue is clear" />
        ) : (
          queue.map((b: any) => {
            const id = String(b._id);
            return (
              <Card key={id}>
                <Text variant="heading">{new Date(b.startAt).toLocaleString()}</Text>
                <Text>
                  {b.status} · {b.paymentMode}
                  {b.note ? ` · ${b.note}` : ''}
                </Text>
                <Stack direction="row">
                  {(NEXT[b.status] ?? []).map((n) => (
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
