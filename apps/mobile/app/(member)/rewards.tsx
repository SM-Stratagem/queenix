import React, { useState, useMemo, useCallback } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Divider,
  Skeleton,
  ErrorState,
  EmptyState,
  useToast,
  Progress,
} from '@queenix/ui';
import {
  Award,
  Share2,
  TrendingUp,
  TrendingDown,
  Crown,
  Sparkles,
  CheckCircle2,
} from '@tamagui/lucide-icons';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { TabPill, TierRow } from '@/components/rewards/primitives';
import { PointsHeroCard } from '@/components/rewards/PointsHero';
import { api } from '@queenix/convex';
import {
  formatDate,
  tierForBalance,
  tierVariant,
  NEXT_TIER_COST,
  type Tier,
} from '@/components/rewards/format';

type TabKey = 'available' | 'history';

interface HistoryItem {
  id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  amount: number;
  description: string;
  date: number;
}

const NEXT_TIER_COST = 2000;

export default function RewardsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('available');

  // Real data
  const loyalty = useConvexQuery(api.queries.users.getLoyaltyBalance, {});
  const referrals = useConvexQuery(api.queries.users.getMyReferrals, {});

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
    async (reward: { id: string; name: string; cost: number }) => {
      if (pointsBalance < reward.cost) {
        toast.warning(`You need ${reward.cost - pointsBalance} more points`);
        return;
      }
      try {
        await redeemReward({ points: reward.cost, reason: reward.name });
        toast.success(`Redeemed: ${reward.name}`);
      } catch (err: any) {
        toast.error(err?.message ?? 'Redemption failed');
      }
    },
    [pointsBalance, redeemReward, toast]
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
            onTiers={() => toast.info('Tier breakdown coming soon')}
          />
        </YStack>

        {/* Refer a friend */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <Card
            variant="outlined"
            padding="md"
            onPress={handleRefer}
            accessibilityLabel="Refer a friend and earn 500 points"
          >
            <XStack alignItems="center" gap="$3">
              <YStack backgroundColor="$success50" padding="$3" borderRadius="$xl">
                <Share2 size={22} color="$success700" />
              </YStack>
              <YStack flex={1}>
                <Text variant="h4">Refer a friend</Text>
                <Text variant="bodySmall" color="secondary">
                  Earn 500 points when they join. They get 200.
                </Text>
                <XStack alignItems="center" gap="$1" marginTop="$1">
                  <Text variant="caption" color="brand" weight="700">
                    {referrals && referrals.length > 0
                      ? `${referrals.length} referral${referrals.length === 1 ? '' : 's'} so far`
                      : 'Share your link'}
                  </Text>
                </XStack>
              </YStack>
            </XStack>
          </Card>
        </YStack>

        {/* Tabs */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <XStack
            backgroundColor="$surfaceMuted"
            padding="$1"
            borderRadius="$lg"
            gap="$1"
          >
            <TabPill
              label="History"
              active={tab === 'history'}
              onPress={() => setTab('history')}
              flex={1}
            />
            <TabPill
              label="Referrals"
              active={tab === 'available'}
              onPress={() => setTab('available')}
              flex={1}
            />
          </XStack>

          {tab === 'available' ? (
            <YStack gap="$3">
              {referrals === undefined ? (
                <Card variant="outlined" padding="md">
                  <YStack gap="$2">
                    <Skeleton width="100%" height={48} borderRadius={8} />
                    <Skeleton width="100%" height={48} borderRadius={8} />
                  </YStack>
                </Card>
              ) : referrals === null ? (
                <ErrorState
                  title="Could not load referrals"
                  message="Please try again in a moment."
                  onRetry={() => {
                    /* Convex auto-revalidates */
                  }}
                />
              ) : referrals.length === 0 ? (
                <Card variant="outlined" padding="md">
                  <EmptyState
                    title="No referrals yet"
                    message="Tap the card above to generate your first referral link."
                  />
                </Card>
              ) : (
                <YStack gap="$2">
                  <Text variant="caption" color="muted">
                    {referrals.length} referral{referrals.length === 1 ? '' : 's'}
                  </Text>
                  <Card variant="outlined" padding="none">
                    <YStack>
                      {referrals.map((r, idx) => (
                        <YStack key={r._id}>
                          {idx > 0 && <Divider />}
                          <XStack alignItems="center" gap="$3" padding="$4">
                            <YStack
                              backgroundColor={
                                r.status === 'converted'
                                  ? '$success50'
                                  : r.status === 'expired'
                                    ? '$danger50'
                                    : '$warning50'
                              }
                              padding="$2.5"
                              borderRadius="$md"
                            >
                              <Share2
                                size={18}
                                color={
                                  r.status === 'converted'
                                    ? '$success700'
                                    : r.status === 'expired'
                                      ? '$danger'
                                      : '$warning'
                                }
                              />
                            </YStack>
                            <YStack flex={1}>
                              <Text variant="label" numberOfLines={1}>
                                {r.code}
                              </Text>
                              <Text variant="caption" color="muted">
                                {formatDate(r.createdAt)} • {r.rewardPoints} pts reward
                              </Text>
                            </YStack>
                            <Badge
                              label={r.status}
                              variant={
                                r.status === 'converted'
                                  ? 'success'
                                  : r.status === 'expired'
                                    ? 'danger'
                                    : 'warning'
                              }
                            />
                          </XStack>
                        </YStack>
                      ))}
                    </YStack>
                  </Card>
                </YStack>
              )}
            </YStack>
          ) : (
            <YStack gap="$2">
              <Text variant="caption" color="muted">
                {entries.length} transaction{entries.length === 1 ? '' : 's'}
              </Text>
              {loyalty === undefined ? (
                <Card variant="outlined" padding="md">
                  <YStack gap="$2">
                    <Skeleton width="100%" height={48} borderRadius={8} />
                    <Skeleton width="100%" height={48} borderRadius={8} />
                    <Skeleton width="100%" height={48} borderRadius={8} />
                  </YStack>
                </Card>
              ) : loyalty === null ? (
                <ErrorState
                  title="Could not load history"
                  message="Please try again in a moment."
                  onRetry={() => {
                    /* Convex auto-revalidates */
                  }}
                />
              ) : entries.length === 0 ? (
                <Card variant="outlined" padding="md">
                  <EmptyState
                    title="No history yet"
                    message="Earn your first points by checking into a class."
                  />
                </Card>
              ) : (
                <Card variant="outlined" padding="none">
                  <YStack>
                    {entries
                      .slice()
                      .reverse()
                      .map((h, idx) => (
                        <YStack key={h.id}>
                          {idx > 0 && <Divider />}
                          <XStack alignItems="center" gap="$3" padding="$4">
                            <YStack
                              backgroundColor={
                                h.amount >= 0 ? '$success50' : '$warning50'
                              }
                              padding="$2.5"
                              borderRadius="$md"
                            >
                              {h.amount >= 0 ? (
                                <TrendingUp size={18} color="$success700" />
                              ) : h.type === 'redeemed' ? (
                                <TrendingDown size={18} color="$warning" />
                              ) : (
                                <CheckCircle2 size={18} color="$textMuted" />
                              )}
                            </YStack>
                            <YStack flex={1}>
                              <Text variant="label" numberOfLines={1}>
                                {h.description}
                              </Text>
                              <Text variant="caption" color="muted">
                                {formatDate(h.date)}
                              </Text>
                            </YStack>
                            <Text
                              variant="label"
                              color={h.amount >= 0 ? 'success' : 'warning'}
                            >
                              {h.amount >= 0 ? '+' : ''}
                              {h.amount} pts
                            </Text>
                          </XStack>
                        </YStack>
                      ))}
                  </YStack>
                </Card>
              )}
            </YStack>
          )}
        </YStack>

        {/* Tiers summary */}
        <YStack paddingHorizontal="$4" marginTop="$5" gap="$3">
          <Text variant="h3">Membership tiers</Text>
          <Card variant="outlined" padding="md">
            <YStack gap="$3">
              <TierRow
                name="Silver"
                from={0}
                to={500}
                current={pointsBalance >= 0 && pointsBalance < 500}
                reached={pointsBalance >= 0}
                perks={['Basic point earning', 'Birthday reward']}
              />
              <Divider />
              <TierRow
                name="Gold"
                from={500}
                to={2000}
                current={pointsBalance >= 500 && pointsBalance < 2000}
                reached={pointsBalance >= 500}
                perks={['2x points on weekends', 'Free smoothie monthly', 'Priority booking']}
              />
              <Divider />
              <TierRow
                name="Platinum"
                from={2000}
                to={5000}
                current={false}
                reached={false}
                perks={['3x points always', 'Free PT session quarterly', 'VIP events']}
              />
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

