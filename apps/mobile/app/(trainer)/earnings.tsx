import React, { useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  Progress,
  Divider,
  Skeleton,
  EmptyState,
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  formatMoney,
  formatMoneyShort,
  getMonthLabel,
  CURRENCY,
} from '@/components/trainer-earnings/format';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarClock,
  Dumbbell,
  Users,
  Gift,
  CheckCircle2,
  Clock,
  Download,
} from '@tamagui/lucide-icons';

type EarnStatus = 'pending' | 'paid' | 'cancelled';

const CURRENCY = 'AED';

function formatMoney(cents: number, currency: string = CURRENCY): string {
  return `${currency} ${(cents / 100).toFixed(0)}`;
}

function formatMoneyShort(cents: number): string {
  return (cents / 100).toLocaleString();
}

function getMonthLabel(): string {
  return new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default function TrainerEarnings() {
  const toast = useToast();
  const earningsQuery = useConvexQuery(api.queries.users.getMyEarnings, {});
  const requestPayout = useConvexMutation(api.mutations.users.requestEarlyPayout);

  const isLoading = earningsQuery === undefined;
  const records = earningsQuery ?? [];

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  }, []);
  const monthEnd = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  }, []);

  const thisMonthRecords = useMemo(
    () => records.filter((r: any) => r.createdAt >= monthStart && r.createdAt < monthEnd),
    [records, monthStart, monthEnd]
  );

  const monthEarningsCents = thisMonthRecords
    .filter((r: any) => r.status !== 'cancelled')
    .reduce((acc: number, r: any) => acc + r.amountCents, 0);
  const pendingCents = records
    .filter((r: any) => r.status === 'pending')
    .reduce((acc: number, r: any) => acc + r.amountCents, 0);
  const paidCents = records
    .filter((r: any) => r.status === 'paid')
    .reduce((acc: number, r: any) => acc + r.amountCents, 0);

  // Last month for delta
  const lastMonthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  }, []);
  const lastMonthEnd = monthStart;
  const lastMonthCents = records
    .filter(
      (r: any) =>
        r.createdAt >= lastMonthStart &&
        r.createdAt < lastMonthEnd &&
        r.status !== 'cancelled'
    )
    .reduce((acc: number, r: any) => acc + r.amountCents, 0);

  const delta = lastMonthCents > 0
    ? Math.round(((monthEarningsCents - lastMonthCents) / lastMonthCents) * 100)
    : monthEarningsCents > 0
      ? 100
      : 0;
  const isUp = delta >= 0;

  // Group by source — we have one record per PT session, so for the
  // breakdown we just split into PT earnings vs class/other. Since the
  // current data only has PT earnings rows, we show 100% PT for now.
  const breakdown = useMemo(() => {
    const pt = thisMonthRecords
      .filter((r: any) => r.session)
      .reduce((acc: number, r: any) => acc + r.amountCents, 0);
    const total = pt; // currently only PT earnings in trainerEarnings table
    return [
      {
        key: 'PT',
        label: 'PT sessions',
        amount: pt,
        pct: total > 0 ? Math.round((pt / total) * 100) : 0,
      },
    ];
  }, [thisMonthRecords]);

  const monthTarget = 1400000; // AED 14,000 in cents
  const progress = Math.min(100, (monthEarningsCents / monthTarget) * 100);

  const handleRequestPayout = async () => {
    if (pendingCents <= 0) {
      toast.show('No pending balance to request', 'info');
      return;
    }
    try {
      await requestPayout({
        amountCents: pendingCents,
        currency: CURRENCY,
        note: 'Requested from trainer app',
      });
      toast.show('Early payout requested — owner notified', 'success');
    } catch (e: any) {
      toast.show(e?.message ?? 'Failed to request payout', 'error');
    }
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <YStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$3">
          <Text variant="caption" color="muted">
            {getMonthLabel()}
          </Text>
          <Text variant="h2">Earnings</Text>
        </YStack>

        {/* Hero */}
        <YStack paddingHorizontal="$4">
          <EarningsHero
            isLoading={isLoading}
            monthEarningsCents={monthEarningsCents}
            monthTarget={monthTarget}
            progress={progress}
            delta={delta}
            isUp={isUp}
          />
        </YStack>

        <EarningsSecondaryCards
          pendingCents={pendingCents}
          paidCents={paidCents}
          totalSessions={records.length}
          isLoading={isLoading}
          breakdown={breakdown}
        />

        {/* Action row */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Button
            label="Request early payout"
            variant="primary"
            size="md"
            fullWidth
            icon={<Wallet size={18} color="$textOnBrand" />}
            onPress={handleRequestPayout}
            disabled={pendingCents <= 0}
          />
          <Button
            label="Download monthly statement"
            variant="outline"
            size="md"
            fullWidth
            icon={<Download size={18} color="$brand" />}
            onPress={() => toast.show('Statement generation — coming soon', 'info')}
          />
        </YStack>

        {/* Transaction history */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Recent transactions</Text>
            <Text variant="caption" color="muted">
              {records.length} entries
            </Text>
          </XStack>
          {isLoading ? (
            <YStack gap="$2">
              <Skeleton height={60} borderRadius="$md" />
              <Skeleton height={60} borderRadius="$md" />
              <Skeleton height={60} borderRadius="$md" />
            </YStack>
          ) : records.length === 0 ? (
            <EmptyState
              title="No earnings yet"
              message="Once you start training members, your earnings will appear here."
            />
          ) : (
            <Card variant="outlined" padding="sm">
              {records.map((r: any, idx: number) => (
                <React.Fragment key={r._id}>
                  <XStack
                    alignItems="center"
                    gap="$3"
                    paddingVertical="$3"
                    onPress={() =>
                      toast.info(
                        `Session ${r.sessionId} — ${formatMoney(r.amountCents, r.currency)}`
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Earnings record, ${formatMoney(r.amountCents, r.currency)}, ${r.status}`}
                  >
                    <YStack
                      width={36}
                      height={36}
                      borderRadius="$full"
                      backgroundColor={
                        r.status === 'paid' ? '$success50' : r.status === 'cancelled' ? '$danger50' : '$warning50'
                      }
                      alignItems="center"
                      justifyContent="center"
                    >
                      {r.status === 'paid' ? (
                        <CheckCircle2 size={18} color="$success500" />
                      ) : r.status === 'cancelled' ? (
                        <Clock size={18} color="$danger500" />
                      ) : (
                        <Clock size={18} color="$warning500" />
                      )}
                    </YStack>
                    <YStack flex={1} gap="$0.5">
                      <Text variant="body" weight="500" numberOfLines={1}>
                        PT session earning
                      </Text>
                      <XStack alignItems="center" gap="$2">
                        <Text variant="caption" color="muted">
                          {new Date(r.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                        <Badge
                          label={r.status}
                          variant={
                            r.status === 'paid'
                              ? 'success'
                              : r.status === 'cancelled'
                                ? 'danger'
                                : 'warning'
                          }
                          size="sm"
                        />
                      </XStack>
                    </YStack>
                    <YStack alignItems="flex-end" gap="$0.5">
                      <Text
                        variant="label"
                        color={r.status === 'paid' ? 'primary' : r.status === 'cancelled' ? 'muted' : 'warning'}
                      >
                        +{formatMoney(r.amountCents, r.currency)}
                      </Text>
                      <Text variant="caption" color="muted">
                        {r.commissionRate ? `${(r.commissionRate * 100).toFixed(0)}%` : ''}
                      </Text>
                    </YStack>
                  </XStack>
                  {idx < records.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </Card>
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
