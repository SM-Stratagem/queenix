import React, { useMemo, useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import {
  Screen,
  Text,
  Card,
  Button,
  Header,
  Skeleton,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';

type Tab = 'reserved' | 'checked_in' | 'completed' | 'cancelled';
const TABS: Tab[] = ['reserved', 'checked_in', 'completed', 'cancelled'];

export default function OpsValetScreen() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('reserved');

  const queue = useConvexQuery(api.queries.valet.opsQueue, { status: tab });
  const counts = useConvexQuery(api.queries.valet.slotCounts, {});
  const checkIn = useConvexMutation(api.mutations.valet.checkIn);
  const handOver = useConvexMutation(api.mutations.valet.handOver);

  const rows = useMemo(() => queue ?? [], [queue]);

  const mutate = async (fn: (a: any) => Promise<unknown>, id: string, ok: string) => {
    try {
      await fn({ reservationId: id as any });
      toast.success(ok);
    } catch (err: any) {
      toast.error(err?.message ?? 'Action failed');
    }
  };

  return (
    <Screen padded={false}>
      <Header
        title="Valet queue"
        subtitle={counts ? `${counts.active} active cars` : 'Live valet operations'}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
          <XStack backgroundColor="$surfaceMuted" padding="$1" borderRadius="$lg" gap="$1">
            {TABS.map((t) => (
              <YStack
                key={t}
                flex={1}
                paddingVertical="$2"
                alignItems="center"
                borderRadius="$md"
                backgroundColor={tab === t ? '$surface' : 'transparent'}
                onPress={() => setTab(t)}
                pressStyle={{ opacity: 0.8 }}
              >
                <Text size="sm">{t.replace('_', ' ')}</Text>
              </YStack>
            ))}
          </XStack>

          {queue === undefined ? (
            <Skeleton height={120} />
          ) : rows.length === 0 ? (
            <EmptyState title={`No ${tab} cars`} message="New reservations appear here live." />
          ) : (
            rows.map((r: any) => (
              <Card key={r._id} padded>
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack gap="$1">
                    <Text weight="bold">{r.plate}</Text>
                    <Text color="$muted">{`ETA ${r.etaMin} min`}</Text>
                  </YStack>
                  <XStack gap="$2">
                    {r.status === 'reserved' && (
                      <Button size="sm" onPress={() => mutate(checkIn, r._id, 'Car checked in')}>
                        Check in
                      </Button>
                    )}
                    {r.status === 'checked_in' && (
                      <Button size="sm" onPress={() => mutate(handOver, r._id, 'Car handed over')}>
                        Complete
                      </Button>
                    )}
                  </XStack>
                </XStack>
              </Card>
            ))
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
