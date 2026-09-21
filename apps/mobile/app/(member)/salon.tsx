/**
 * Member — Salon: browse services, book a slot (pay at the salon).
 * Role contract: member books; cash is counter-only (staff dashboards);
 * staff confirm in (ops)/salon-queue and confirm cash at the till.
 */
import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@queenix/convex';
import { Button, Card, EmptyState, Screen, Stack, Text } from '@queenix/ui';

type Role = 'superadmin' | 'admin' | 'owner' | 'operations' | 'salon' | 'coffee' | 'trainer' | 'member';
const ACTIVE_ROLE: Role = 'member';

function fmt(cents: number) {
  return `${(cents / 100).toFixed(2)}`;
}

export default function MemberSalon() {
  void ACTIVE_ROLE;
  const services = useQuery(api.queries.commerce.listSalonServices, {});
  const mine = useQuery(api.queries.commerce.mySalonBookings, {});
  const book = useMutation(api.mutations.commerce.bookSalon);
  const cancel = useMutation(api.mutations.commerce.updateSalonBookingStatus);
  const [busy, setBusy] = useState<string | null>(null);

  async function onBook(serviceId: any) {
    // Demo slot: next whole hour. Real picker can call salonAvailability first.
    const startAt = Math.ceil(Date.now() / 3600000) * 3600000;
    setBusy(String(serviceId));
    try {
      await book({ serviceId, startAt, paymentMode: 'counter' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <Stack>
        <Text variant="title">Salon</Text>
        <Text>Pay at the salon — cash and cards accepted at the till.</Text>

        <Text variant="heading">Services</Text>
        {services === undefined ? (
          <Text>Loading…</Text>
        ) : services.length === 0 ? (
          <EmptyState title="No services yet" />
        ) : (
          services.map((s: any) => (
            <Card key={String(s._id)}>
              <Text variant="heading">{s.name}</Text>
              {s.description ? <Text>{s.description}</Text> : null}
              <Text>
                {fmt(s.priceCents)} · {s.durationMin} min
              </Text>
              <Button
                label={busy === String(s._id) ? 'Booking…' : 'Book next hour'}
                onPress={() => onBook(s._id)}
                disabled={busy !== null}
              />
            </Card>
          ))
        )}

        <Text variant="heading">My bookings</Text>
        {mine === undefined ? (
          <Text>Loading…</Text>
        ) : mine.length === 0 ? (
          <EmptyState title="No bookings" />
        ) : (
          mine.map((b: any) => (
            <Card key={String(b._id)}>
              <Text>
                {new Date(b.startAt).toLocaleString()} · {b.status} · {b.paymentMode}
              </Text>
              {b.status === 'pending' ? (
                <Button
                  label="Cancel"
                  onPress={() =>
                    cancel({ bookingId: b._id, status: 'cancelled' })
                  }
                />
              ) : null}
            </Card>
          ))
        )}
      </Stack>
    </Screen>
  );
}
