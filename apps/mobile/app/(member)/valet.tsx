import React, { useMemo, useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import {
  Screen,
  Text,
  Card,
  Button,
  Input,
  Header,
  Skeleton,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';

const ETA_PRESETS = [5, 10, 20, 30];

export default function MemberValetScreen() {
  const toast = useToast();
  const [plate, setPlate] = useState('');
  const [etaMin, setEtaMin] = useState(10);

  const mine = useConvexQuery(api.queries.valet.myReservations, {});
  const reserve = useConvexMutation(api.mutations.valet.reserve);
  const cancel = useConvexMutation(api.mutations.valet.cancel);

  const active = useMemo(
    () => (mine ?? []).filter((r: any) => r.status === 'reserved' || r.status === 'checked_in'),
    [mine]
  );
  const history = useMemo(
    () => (mine ?? []).filter((r: any) => r.status === 'completed' || r.status === 'cancelled'),
    [mine]
  );

  const handleReserve = async () => {
    if (!plate.trim()) {
      toast.warning('Enter your plate number');
      return;
    }
    try {
      await reserve({ plate: plate.trim(), etaMin });
      toast.success('Valet reserved — see you at the curb');
      setPlate('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not reserve valet');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancel({ reservationId: id as any });
      toast.success('Reservation cancelled');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not cancel');
    }
  };

  return (
    <Screen padded={false}>
      <Header title="Valet parking" subtitle="Drop your car, keep your workout" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
          <Card padded>
            <Text variant="h4">Book valet</Text>
            <Text color="$muted">Plate number</Text>
            <Input value={plate} onChangeText={setPlate} placeholder="DXB 12345" autoCapitalize="characters" />
            <Text color="$muted" marginTop="$2">Arriving in (minutes)</Text>
            <XStack gap="$2">
              {ETA_PRESETS.map((m) => (
                <Button key={m} size="sm" variant={etaMin === m ? 'primary' : 'secondary'} onPress={() => setEtaMin(m)}>
                  {`${m}m`}
                </Button>
              ))}
            </XStack>
            <Button marginTop="$3" onPress={handleReserve} disabled={active.length > 0}>
              {active.length > 0 ? 'You have an active booking' : 'Reserve valet'}
            </Button>
          </Card>

          <Text variant="h4">My status</Text>
          {mine === undefined ? (
            <Skeleton height={90} />
          ) : active.length === 0 ? (
            <EmptyState title="No active valet" message="Reserve above and your car status shows here." />
          ) : (
            active.map((r: any) => (
              <Card key={r._id} padded>
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack gap="$1">
                    <Text weight="bold">{r.plate}</Text>
                    <Text color="$muted">{`ETA ${r.etaMin} min · ${r.status === 'checked_in' ? 'Car received' : 'Reserved'}`}</Text>
                  </YStack>
                  <Button size="sm" variant="secondary" onPress={() => handleCancel(r._id)}>
                    Cancel
                  </Button>
                </XStack>
              </Card>
            ))
          )}

          {history.length > 0 && (
            <YStack gap="$2">
              <Text variant="h4">History</Text>
              {history.slice(0, 5).map((r: any) => (
                <Card key={r._id} padded>
                  <XStack justifyContent="space-between">
                    <Text>{r.plate}</Text>
                    <Text color="$muted">{r.status}</Text>
                  </XStack>
                </Card>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
