import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Divider,
  useToast,
  Progress,
} from '@queenix/ui';
import {
  Award,
  Gift,
  Sparkles,
  Share2,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Crown,
  Coffee,
  ShoppingBag,
  Heart,
  Dumbbell,
  Ticket,
} from '@tamagui/lucide-icons';

type TabKey = 'available' | 'history';
type CatFilter = 'All' | 'Classes' | 'Merch' | 'Wellness' | 'Food';

interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: Exclude<CatFilter, 'All'>;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  iconColor: string;
  remaining?: number;
}

interface HistoryItem {
  id: string;
  type: 'earn' | 'redeem';
  amount: number;
  description: string;
  date: number;
}

const REWARDS: Reward[] = [
  {
    id: 'r1',
    name: 'Free PT Session',
    description: 'Book a 1-hour personal training session with any coach.',
    cost: 800,
    category: 'Classes',
    Icon: Dumbbell,
    iconColor: '$brand',
    remaining: 5,
  },
  {
    id: 'r2',
    name: 'Queenix Tank Top',
    description: 'Limited edition breathable training tank in your size.',
    cost: 1200,
    category: 'Merch',
    Icon: ShoppingBag,
    iconColor: '$success700',
    remaining: 12,
  },
  {
    id: 'r3',
    name: 'Smoothie Bar Voucher',
    description: 'Free post-workout smoothie at the in-gym bar.',
    cost: 250,
    category: 'Food',
    Icon: Coffee,
    iconColor: '$warning',
    remaining: 50,
  },
  {
    id: 'r4',
    name: 'Recovery Massage (30m)',
    description: 'Book a 30-minute sports recovery massage.',
    cost: 1500,
    category: 'Wellness',
    Icon: Heart,
    iconColor: '$danger',
    remaining: 8,
  },
  {
    id: 'r5',
    name: 'Drop-in Class Pass',
    description: 'One premium drop-in to any group class.',
    cost: 400,
    category: 'Classes',
    Icon: Ticket,
    iconColor: '$brand',
    remaining: 25,
  },
  {
    id: 'r6',
    name: 'Queenix Water Bottle',
    description: 'Insulated stainless steel bottle, branded.',
    cost: 600,
    category: 'Merch',
    Icon: Gift,
    iconColor: '$info700',
    remaining: 20,
  },
];

const HISTORY: HistoryItem[] = [
  { id: 'h1', type: 'earn', amount: 100, description: 'Class check-in — Power Yoga', date: Date.now() - 1 * 24 * 60 * 60 * 1000 },
  { id: 'h2', type: 'earn', amount: 50, description: 'Daily streak bonus', date: Date.now() - 2 * 24 * 60 * 60 * 1000 },
  { id: 'h3', type: 'redeem', amount: -250, description: 'Smoothie voucher redeemed', date: Date.now() - 4 * 24 * 60 * 60 * 1000 },
  { id: 'h4', type: 'earn', amount: 500, description: 'Referral — Aisha K. joined', date: Date.now() - 9 * 24 * 60 * 60 * 1000 },
  { id: 'h5', type: 'earn', amount: 200, description: 'Monthly check-in bonus', date: Date.now() - 14 * 24 * 60 * 60 * 1000 },
  { id: 'h6', type: 'redeem', amount: -800, description: 'Free PT session — Maya Patel', date: Date.now() - 21 * 24 * 60 * 60 * 1000 },
  { id: 'h7', type: 'earn', amount: 100, description: 'Class check-in — HIIT Burner', date: Date.now() - 30 * 24 * 60 * 60 * 1000 },
  { id: 'h8', type: 'earn', amount: 50, description: 'Profile completion bonus', date: Date.now() - 45 * 24 * 60 * 60 * 1000 },
];

const CATEGORIES: CatFilter[] = ['All', 'Classes', 'Merch', 'Wellness', 'Food'];

const POINTS_BALANCE = 1240;
const NEXT_TIER_COST = 2000;
const TIER_PROGRESS = (POINTS_BALANCE / NEXT_TIER_COST) * 100;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function RewardsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('available');
  const [category, setCategory] = useState<CatFilter>('All');

  const filteredRewards =
    category === 'All'
      ? REWARDS
      : REWARDS.filter((r) => r.category === category);

  const handleRedeem = (reward: Reward) => {
    if (POINTS_BALANCE < reward.cost) {
      toast.warning(`You need ${reward.cost - POINTS_BALANCE} more points`);
      return;
    }
    toast.success(`Redeemed: ${reward.name}`);
  };

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
          <YStack
            backgroundColor="$brand"
            padding="$5"
            borderRadius="$xl"
            gap="$3"
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.15}
            shadowRadius={12}
            elevation={6}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <XStack alignItems="center" gap="$2">
                <YStack
                  backgroundColor="$brand600"
                  padding="$2"
                  borderRadius="$full"
                >
                  <Award size={18} color="$textOnBrand" />
                </YStack>
                <Text variant="caption" weight="700" textTransform="uppercase">
                  Your points
                </Text>
              </XStack>
              <Badge label="Gold" variant="warning" />
            </XStack>

            <YStack>
              <Text variant="display">
                {POINTS_BALANCE.toLocaleString()}
              </Text>
              <Text variant="bodySmall" color="muted">
                {NEXT_TIER_COST - POINTS_BALANCE} pts to Platinum
              </Text>
            </YStack>

            <Progress
              value={TIER_PROGRESS}
              size="sm"
              color="$warning500"
              backgroundColor="$brand600"
            />

            <XStack gap="$2" marginTop="$2">
              <Button
                label="How to earn"
                variant="secondary"
                size="sm"
                onPress={() => toast.info('100 pts per class, 500 for referrals')}
              />
              <Button
                label="Tiers"
                variant="ghost"
                size="sm"
                onPress={() => toast.info('Tier breakdown coming soon')}
              />
            </XStack>
          </YStack>
        </YStack>

        {/* Refer a friend */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <Card
            variant="outlined"
            padding="md"
            onPress={() => toast.success('Referral link copied: queenix.gym/r/SUHAYL')}
            accessibilityLabel="Refer a friend and earn 500 points"
          >
            <XStack alignItems="center" gap="$3">
              <YStack
                backgroundColor="$success50"
                padding="$3"
                borderRadius="$xl"
              >
                <Share2 size={22} color="$success700" />
              </YStack>
              <YStack flex={1}>
                <Text variant="h4">Refer a friend</Text>
                <Text variant="bodySmall" color="secondary">
                  Earn 500 points when they join. They get 200.
                </Text>
                <XStack alignItems="center" gap="$1" marginTop="$1">
                  <Text variant="caption" color="brand" weight="700">
                    Share your link
                  </Text>
                  <ChevronRight size={12} color="$brand" />
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
              label="Available rewards"
              active={tab === 'available'}
              onPress={() => setTab('available')}
              flex={1}
            />
            <TabPill
              label="History"
              active={tab === 'history'}
              onPress={() => setTab('history')}
              flex={1}
            />
          </XStack>

          {tab === 'available' ? (
            <YStack gap="$3">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={category === c}
                    variant={category === c ? 'brand' : 'default'}
                    onPress={() => setCategory(c)}
                  />
                ))}
              </ScrollView>

              <Text variant="caption" color="muted">
                {filteredRewards.length} reward{filteredRewards.length === 1 ? '' : 's'} available
              </Text>

              <YStack gap="$3">
                {filteredRewards.map((reward) => (
                  <RewardCard
                    key={reward.id}
                    reward={reward}
                    onRedeem={() => handleRedeem(reward)}
                  />
                ))}
              </YStack>
            </YStack>
          ) : (
            <YStack gap="$2">
              <Text variant="caption" color="muted">
                {HISTORY.length} transactions
              </Text>
              <Card variant="outlined" padding="none">
                <YStack>
                  {HISTORY.map((h, idx) => (
                    <YStack key={h.id}>
                      {idx > 0 && <Divider />}
                      <XStack
                        alignItems="center"
                        gap="$3"
                        padding="$4"
                      >
                        <YStack
                          backgroundColor={h.type === 'earn' ? '$success50' : '$warning50'}
                          padding="$2.5"
                          borderRadius="$md"
                        >
                          {h.type === 'earn' ? (
                            <TrendingUp size={18} color="$success700" />
                          ) : (
                            <TrendingDown size={18} color="$warning" />
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
                          color={h.type === 'earn' ? 'success' : 'warning'}
                        >
                          {h.type === 'earn' ? '+' : ''}
                          {h.amount} pts
                        </Text>
                      </XStack>
                    </YStack>
                  ))}
                </YStack>
              </Card>
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
                current={POINTS_BALANCE >= 0 && POINTS_BALANCE < 500}
                reached
                perks={['Basic point earning', 'Birthday reward']}
              />
              <Divider />
              <TierRow
                name="Gold"
                from={500}
                to={2000}
                current={POINTS_BALANCE >= 500 && POINTS_BALANCE < 2000}
                reached={POINTS_BALANCE >= 500}
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

function TabPill({
  label,
  active,
  onPress,
  flex,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <XStack
      flex={flex}
      alignItems="center"
      justifyContent="center"
      paddingVertical="$2.5"
      borderRadius="$md"
      backgroundColor={active ? '$surface' : 'transparent'}
      onPress={onPress}
      pressStyle={{ opacity: 0.85 }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      shadowColor={active ? '$shadowColor' : 'transparent'}
      shadowOffset={{ width: 0, height: 1 }}
      shadowOpacity={active ? 0.1 : 0}
      shadowRadius={2}
    >
      <Text variant="label" color={active ? 'brand' : 'secondary'}>
        {label}
      </Text>
    </XStack>
  );
}

function RewardCard({ reward, onRedeem }: { reward: Reward; onRedeem: () => void }) {
  const Icon = reward.Icon;
  const canAfford = POINTS_BALANCE >= reward.cost;
  return (
    <Card variant="outlined" padding="md">
      <XStack gap="$3" alignItems="flex-start">
        <YStack
          backgroundColor="$brand50"
          padding="$3"
          borderRadius="$lg"
        >
          <Icon size={24} color={reward.iconColor as any} />
        </YStack>
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" justifyContent="space-between" gap="$2">
            <Text variant="label" flex={1}>{reward.name}</Text>
            <Badge label={reward.category} variant="neutral" />
          </XStack>
          <Text variant="caption" color="secondary" numberOfLines={2}>
            {reward.description}
          </Text>
          {reward.remaining != null && (
            <Text variant="caption" color="muted" marginTop="$1">
              {reward.remaining} left
            </Text>
          )}
          <XStack
            justifyContent="space-between"
            alignItems="center"
            marginTop="$2"
            paddingTop="$2"
            borderTopWidth={1}
            borderTopColor="$borderColor"
          >
            <XStack alignItems="baseline" gap="$1">
              <Text variant="h4" color="brand">{reward.cost}</Text>
              <Text variant="caption" color="muted">pts</Text>
            </XStack>
            <Button
              label={canAfford ? 'Redeem' : 'Need more'}
              variant={canAfford ? 'primary' : 'outline'}
              size="sm"
              onPress={onRedeem}
              disabled={!canAfford}
            />
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}

function TierRow({
  name,
  from,
  to,
  current,
  reached,
  perks,
}: {
  name: string;
  from: number;
  to: number;
  current: boolean;
  reached: boolean;
  perks: string[];
}) {
  const Icon = name === 'Silver' ? Award : name === 'Gold' ? Crown : Sparkles;
  return (
    <XStack gap="$3" alignItems="flex-start">
      <YStack
        backgroundColor={current ? '$brand50' : '$surfaceMuted'}
        padding="$2.5"
        borderRadius="$md"
      >
        <Icon size={20} color={current ? '$brand' : '$textSecondary'} />
      </YStack>
      <YStack flex={1} gap="$1">
        <XStack alignItems="center" gap="$2">
          <Text variant="label">{name}</Text>
          {current && <Badge label="Current" variant="brand" />}
          {!current && reached && <Badge label="Unlocked" variant="success" />}
        </XStack>
        <Text variant="caption" color="muted">
          {from.toLocaleString()} — {to.toLocaleString()} pts
        </Text>
        <XStack gap="$1" flexWrap="wrap" marginTop="$1">
          {perks.map((p) => (
            <XStack
              key={p}
              backgroundColor="$surfaceMuted"
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$full"
            >
              <Text variant="caption" color="secondary">
                {p}
              </Text>
            </XStack>
          ))}
        </XStack>
      </YStack>
    </XStack>
  );
}
