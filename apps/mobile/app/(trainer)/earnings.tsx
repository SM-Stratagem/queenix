import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  Progress,
  Divider,
  useToast,
} from '@queenix/ui';
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

interface Transaction {
  id: string;
  date: string;
  source: string;
  category: 'PT' | 'Class' | 'Commission' | 'Bonus';
  amountAED: number;
  status: 'paid' | 'pending';
}

const mockTransactions: Transaction[] = [
  {
    id: 't1',
    date: 'Today, 09:15',
    source: 'PT • Amna Al-Mazrouei',
    category: 'PT',
    amountAED: 220,
    status: 'pending',
  },
  {
    id: 't2',
    date: 'Yesterday, 18:45',
    source: 'HIIT 45 (8 attendees)',
    category: 'Class',
    amountAED: 360,
    status: 'pending',
  },
  {
    id: 't3',
    date: 'Yesterday, 11:00',
    source: 'PT • Hala Al-Suwaidi',
    category: 'PT',
    amountAED: 220,
    status: 'pending',
  },
  {
    id: 't4',
    date: 'Mon, 20:00',
    source: 'PT • Sara Al-Marri',
    category: 'PT',
    amountAED: 220,
    status: 'paid',
  },
  {
    id: 't5',
    date: 'Mon, 17:30',
    source: 'Pilates (12 attendees)',
    category: 'Class',
    amountAED: 540,
    status: 'paid',
  },
  {
    id: 't6',
    date: 'Sun, 10:00',
    source: 'New member bonus — Aisha',
    category: 'Bonus',
    amountAED: 150,
    status: 'paid',
  },
  {
    id: 't7',
    date: 'Sat, 19:00',
    source: 'PT • Sara Al-Marri',
    category: 'PT',
    amountAED: 220,
    status: 'paid',
  },
  {
    id: 't8',
    date: 'Fri, 08:00',
    source: 'Supplement commission',
    category: 'Commission',
    amountAED: 95,
    status: 'paid',
  },
  {
    id: 't9',
    date: 'Thu, 18:00',
    source: 'Power Yoga (15 attendees)',
    category: 'Class',
    amountAED: 675,
    status: 'paid',
  },
  {
    id: 't10',
    date: 'Wed, 20:00',
    source: 'PT • Amna Al-Mazrouei',
    category: 'PT',
    amountAED: 220,
    status: 'paid',
  },
];

const breakdown = [
  {
    key: 'PT' as const,
    label: 'PT sessions',
    amount: 6240,
    pct: 62,
    icon: <Dumbbell size={18} color="$brand" />,
    variant: 'brand' as const,
  },
  {
    key: 'Class' as const,
    label: 'Class instruction',
    amount: 2580,
    pct: 26,
    icon: <Users size={18} color="$success500" />,
    variant: 'success' as const,
  },
  {
    key: 'Commission' as const,
    label: 'Commissions',
    amount: 720,
    pct: 7,
    icon: <Gift size={18} color="$info500" />,
    variant: 'info' as const,
  },
  {
    key: 'Bonus' as const,
    label: 'Bonuses',
    amount: 460,
    pct: 5,
    icon: <TrendingUp size={18} color="$warning500" />,
    variant: 'warning' as const,
  },
];

const categoryBadge: Record<Transaction['category'], {
  label: string;
  variant: 'brand' | 'success' | 'info' | 'warning';
}> = {
  PT: { label: 'PT', variant: 'brand' },
  Class: { label: 'Class', variant: 'success' },
  Commission: { label: 'Commission', variant: 'info' },
  Bonus: { label: 'Bonus', variant: 'warning' },
};

export default function TrainerEarnings() {
  const toast = useToast();
  const monthEarnings = breakdown.reduce((acc, b) => acc + b.amount, 0); // 10,000
  const monthTarget = 14000;
  const progress = (monthEarnings / monthTarget) * 100;
  const lastMonth = 8930;
  const delta = Math.round(((monthEarnings - lastMonth) / lastMonth) * 100);
  const isUp = delta >= 0;

  const pendingTotal = mockTransactions
    .filter((t) => t.status === 'pending')
    .reduce((acc, t) => acc + t.amountAED, 0);

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <YStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$3">
          <Text variant="caption" color="muted">
            September 2026
          </Text>
          <Text variant="h2">Earnings</Text>
        </YStack>

        {/* Hero */}
        <YStack paddingHorizontal="$4">
          <Card variant="elevated" padding="lg">
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack>
                  <Text variant="caption" color="secondary" textTransform="uppercase">
                    This month
                  </Text>
                  <XStack alignItems="baseline" gap="$2" marginTop="$1">
                    <Text variant="h1" color="brand">
                      {monthEarnings.toLocaleString()}
                    </Text>
                    <Text variant="h4" color="muted">
                      AED
                    </Text>
                  </XStack>
                  <XStack alignItems="center" gap="$1.5" marginTop="$1">
                    {isUp ? (
                      <TrendingUp size={14} color="$success500" />
                    ) : (
                      <TrendingDown size={14} color="$danger500" />
                    )}
                    <Text
                      variant="bodySmall"
                      weight="600"
                      color={isUp ? 'success' : 'danger'}
                    >
                      {isUp ? '+' : ''}
                      {delta}% vs last month
                    </Text>
                  </XStack>
                </YStack>
                <YStack
                  backgroundColor="$brand50"
                  padding="$3"
                  borderRadius="$lg"
                >
                  <Wallet size={24} color="$brand" />
                </YStack>
              </XStack>

              <YStack gap="$1.5" marginTop="$2">
                <XStack justifyContent="space-between">
                  <Text variant="caption" color="muted">
                    Progress to target
                  </Text>
                  <Text variant="caption" weight="600">
                    AED {monthEarnings.toLocaleString()} /{' '}
                    {monthTarget.toLocaleString()}
                  </Text>
                </XStack>
                <Progress value={progress} />
                <Text variant="caption" color="muted">
                  {Math.round(progress)}% of AED {monthTarget.toLocaleString()} target
                </Text>
              </YStack>
            </YStack>
          </Card>
        </YStack>

        {/* Pending payout */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <XStack alignItems="center" gap="$3">
              <YStack
                backgroundColor="$warning50"
                padding="$2.5"
                borderRadius="$md"
              >
                <CalendarClock size={20} color="$warning500" />
              </YStack>
              <YStack flex={1}>
                <Text variant="label">Pending payout</Text>
                <Text variant="caption" color="muted">
                  AED {pendingTotal.toLocaleString()} • Pays on 30 Sep
                </Text>
              </YStack>
              <Badge label="Pending" variant="warning" />
            </XStack>
          </Card>
        </YStack>

        {/* Breakdown */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">
            Breakdown
          </Text>
          <YStack gap="$2">
            {breakdown.map((b) => (
              <Card key={b.key} variant="outlined" padding="sm">
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor="$surfaceMuted"
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    {b.icon}
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <XStack justifyContent="space-between">
                      <Text variant="label">{b.label}</Text>
                      <Text variant="label">
                        AED {b.amount.toLocaleString()}
                      </Text>
                    </XStack>
                    <Progress
                      value={b.pct}
                      size="sm"
                      color={
                        b.variant === 'brand'
                          ? '$brand'
                          : b.variant === 'success'
                            ? '$success500'
                            : b.variant === 'info'
                              ? '$info500'
                              : '$warning500'
                      }
                    />
                    <Text variant="caption" color="muted">
                      {b.pct}% of total
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            ))}
          </YStack>
        </YStack>

        {/* Action row */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Button
            label="Request early payout"
            variant="primary"
            size="md"
            fullWidth
            icon={<Wallet size={18} color="$textOnBrand" />}
            onPress={() => toast.info('Early payout request submitted')}
          />
          <Button
            label="Download monthly statement"
            variant="outline"
            size="md"
            fullWidth
            icon={<Download size={18} color="$brand" />}
            onPress={() => toast.info('Generating PDF…')}
          />
        </YStack>

        {/* Transaction history */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Recent transactions</Text>
            <Text variant="caption" color="muted">
              {mockTransactions.length} entries
            </Text>
          </XStack>
          <Card variant="outlined" padding="sm">
            {mockTransactions.map((t, idx) => {
              const cat = categoryBadge[t.category];
              return (
                <React.Fragment key={t.id}>
                  <XStack
                    alignItems="center"
                    gap="$3"
                    paddingVertical="$3"
                    onPress={() => toast.info(`Details for ${t.source}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.source}, AED ${t.amountAED}, ${t.status}`}
                  >
                    <YStack
                      width={36}
                      height={36}
                      borderRadius="$full"
                      backgroundColor={
                        t.status === 'paid' ? '$success50' : '$warning50'
                      }
                      alignItems="center"
                      justifyContent="center"
                    >
                      {t.status === 'paid' ? (
                        <CheckCircle2 size={18} color="$success500" />
                      ) : (
                        <Clock size={18} color="$warning500" />
                      )}
                    </YStack>
                    <YStack flex={1} gap="$0.5">
                      <XStack alignItems="center" gap="$2">
                        <Text variant="body" weight="500" numberOfLines={1}>
                          {t.source}
                        </Text>
                      </XStack>
                      <XStack alignItems="center" gap="$2">
                        <Text variant="caption" color="muted">
                          {t.date}
                        </Text>
                        <Badge label={cat.label} variant={cat.variant} size="sm" />
                      </XStack>
                    </YStack>
                    <YStack alignItems="flex-end" gap="$0.5">
                      <Text
                        variant="label"
                        color={t.status === 'paid' ? 'primary' : 'warning'}
                      >
                        +AED {t.amountAED}
                      </Text>
                      <Text variant="caption" color="muted" textTransform="capitalize">
                        {t.status}
                      </Text>
                    </YStack>
                  </XStack>
                  {idx < mockTransactions.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
