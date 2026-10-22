import React, { useState, useMemo, useCallback } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, useToast } from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { TabPill } from '@/components/rewards/primitives';
import { PointsHeroCard } from '@/components/rewards/PointsHero';
import {
  ReferCard,
  ReferralsList,
  RedeemList,
  HistoryList,
  type Reward,
  TiersSummary,
  type HistoryItem,
} from '@/components/rewards/sections';
import { api } from '@queenix/convex';
import { tierForBalance } from '@/components/rewards/format';

type TabKey = 'redeem' | 'history' | 'referrals';

const NEXT_TIER_COST = 2000;

export default function RewardsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('redeem');

  // Real data
  const loyalty = useConvexQuery(api.queries.users.getLoyaltyBalance, {});
  const referrals = useConvexQuery(api.queries.users.getMyReferrals, {});
  const rewards = useConvexQuery(api.queries.users.listRewards, {});
  const [redeeming, setRedeeming] = useState<string | null>(null);

  // Mutations
  const redeemReward = useConvexMutation(api.mutations.loyalty.redeemReward);
  const createReferral = useConvexMutation(api.mutations.loyalty.createReferral);

  const pointsBalance = loyalty?.balance ?? 0;
  const entries: HistoryItem[] = useMemo(() => {
    if (!loyalty?.entries) return [];
    return loyalty.entries.map((e: any) => ({
      id: e._id,
      type: e.type as HistoryItem['type'],
      amount: e.points,
      description: e.reason,
      date: e.createdAt,
    }));
  }, [loyalty]);

  const tier = tierForBalance(pointsBalance);
  const tierProgressPct = Math.min(100, (pointsBalance / NEXT_TIER_COST) * 100);

  const handleRedeem = useCallback(
    async (reward: Reward) => {
      setRedeeming(reward.id);
      try {
        await redeemReward({ rewardId: reward.id });
        toast.success(`Redeemed: ${reward.name} — show this at the desk`);
      } catch (err: any) {
        toast.error(err?.data?.message ?? err?.message ?? 'Redemption failed');
      } finally {
        setRedeeming(null);
      }
    },
    [redeemReward, toast]
  );

  const handleRefer = useCallback(async () => {
    try {
      const ref = await createReferral({});
      if (ref?.code) {
        toast.success(`Referral link copied: queenix.gym/r/${ref.code}`)
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not create referral');
    }
  }, [createReferral, toast]);

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <YStack paddingTop="$4" paddingHorizontal="$4" paddingBottom="$2" gap="$1">
          <Text variant="h1">Rewards</Text>
          <Text variant="bodySmall" color="secondary">
            Earn points, unlock perks
          </Text>
        </YStack>

        {/* Hero points card */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <PointsHeroCard
            tier={tier}
            pointsBalance={pointsBalance}
            tierProgressPct={tierProgressPct}
            toNextLabel={`${Math.max(0, NEXT_TIER_COST - pointsBalance)} pts to Platinum`}
            isLoading={loyalty === undefined}
            onHowToEarn={() => toast.info('100 pts per class, 500 for referrals')}
            onTiers={() => router.push('/(member)/tiers')}
          />
        </YStack>

        {/* Refer a friend */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <ReferCard referrals={referrals} onPress={handleRefer} />
        </YStack>

        {/* Tabs */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <XStack
            backgroundColor="$surfaceMuted"
            padding="$1"
            borderRadius="$lg"
            gap="$1"
          >
            <TabPill label="Redeem" active={tab === 'redeem'} onPress={() => setTab('redeem')} flex={1} />
            <TabPill label="History" active={tab === 'history'} onPress={() => setTab('history')} flex={1} />
            <TabPill label="Referrals" active={tab === 'referrals'} onPress={() => setTab('referrals')} flex={1} />
          </XStack>

          {tab === 'redeem' ? (
            <RedeemList rewards={rewards} balance={pointsBalance} busyId={redeeming} onRedeem={handleRedeem} />
          ) : tab === 'referrals' ? (
            <ReferralsList referrals={referrals} />
          ) : (
            <HistoryList loyalty={loyalty} entries={entries} />
          )}
        </YStack>

        <TiersSummary pointsBalance={pointsBalance} />
      </ScrollView>
    </Screen>
  );
}

