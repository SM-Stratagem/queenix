import React from 'react';
import { YStack, ScrollView } from 'tamagui';
import { Screen, Text, Card, Header } from '@queenix/ui';
import { useConvexQuery, api } from '@/lib/convex';
import { TIER_THRESHOLDS, tierForBalance, type Tier } from '@/components/rewards/format';

const TIER_PERKS: Record<Tier, string[]> = {
  Silver: ['Earn 100 pts per class attended', 'Birthday month bonus', 'Member event invites'],
  Gold: ['Everything in Silver', '500 pts per referral', 'Priority class booking', 'Guest pass quarterly'],
  Platinum: ['Everything in Gold', 'Dedicated trainer consult', 'Spa + café credit monthly', 'First access to new programs'],
};

const ORDER: Tier[] = ['Silver', 'Gold', 'Platinum'];

export default function MemberTiersScreen() {
  const loyalty = useConvexQuery(api.queries.users.getLoyaltyBalance, {});
  const balance: number = (loyalty as any)?.balance ?? 0;
  const current = tierForBalance(balance);

  return (
    <Screen padded={false}>
      <Header title="Tier breakdown" subtitle={`${balance.toLocaleString()} pts · ${current}`} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
          {ORDER.map((tier) => (
            <Card key={tier} padded variant={current === tier ? 'filled' : 'outlined'}>
              <YStack gap="$1">
                <Text variant="h4">
                  {tier} · from {TIER_THRESHOLDS[tier].toLocaleString()} pts{current === tier ? ' · yours' : ''}
                </Text>
                {TIER_PERKS[tier].map((perk) => (
                  <Text key={perk} color="$muted">
                    • {perk}
                  </Text>
                ))}
              </YStack>
            </Card>
          ))}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
