import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text, Card, Badge, Button, Divider, Skeleton, ErrorState, EmptyState } from '@queenix/ui';
import { Share2, TrendingUp, TrendingDown, CheckCircle2 } from '@tamagui/lucide-icons-2';
import { TierRow } from './primitives';
import { formatDate } from './format';

export interface HistoryItem {
  id: string;
  type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
  amount: number;
  description: string;
  date: number;
}

type Referral = {
  _id: string;
  code: string;
  status: string;
  createdAt: number;
  rewardPoints: number;
};

export function ReferCard({
  referrals,
  onPress,
}: {
  referrals: Referral[] | null | undefined;
  onPress: () => void;
}) {
  return (
    <Card
      variant="outlined"
      padding="md"
      onPress={onPress}
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
  );
}

export type Reward = { id: string; name: string; cost: number };

/** Server-priced perks; the button unlocks once the balance covers the cost. */
export function RedeemList({
  rewards,
  balance,
  busyId,
  onRedeem,
}: {
  rewards: readonly Reward[] | undefined;
  balance: number;
  busyId: string | null;
  onRedeem: (reward: Reward) => void;
}) {
  if (rewards === undefined) return <Skeleton height={140} />;
  if (rewards.length === 0) return <EmptyState title="No rewards yet" message="Perks will appear here." />;
  return (
    <YStack gap="$2">
      {rewards.map((r) => {
        const short = balance < r.cost;
        return (
          <Card key={r.id} variant="outlined" padding="md">
            <XStack alignItems="center" gap="$3">
              <YStack flex={1}>
                <Text variant="label">{r.name}</Text>
                <Text variant="caption" color="secondary">
                  {r.cost} pts{short ? ` · ${r.cost - balance} more to unlock` : ''}
                </Text>
              </YStack>
              <Button
                label={busyId === r.id ? 'Redeeming…' : 'Redeem'}
                size="sm"
                variant={short ? 'outline' : 'primary'}
                disabled={short || busyId !== null}
                onPress={() => onRedeem(r)}
              />
            </XStack>
          </Card>
        );
      })}
    </YStack>
  );
}

export function ReferralsList({ referrals }: { referrals: Referral[] | null | undefined }) {
  return (
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
  );
}

export function HistoryList({
  loyalty,
  entries,
}: {
  loyalty: unknown;
  entries: HistoryItem[];
}) {
  return (
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
  );
}

export function TiersSummary({ pointsBalance }: { pointsBalance: number }) {
  return (
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
  );
}
