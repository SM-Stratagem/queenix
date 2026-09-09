import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Badge, Button, Logo } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Building2,
  ChevronRight,
  Megaphone,
  FileBarChart,
  AlertTriangle,
  Calendar,
  Award,
  UserPlus,
  Clock,
  ArrowRight,
} from '@tamagui/lucide-icons';

type DateRange = 'today' | 'week' | 'month';

export default function OwnerOverview() {
  const router = useRouter();
  const { session } = useAuth();
  const [range, setRange] = useState<DateRange>('today');

  const ownerName = session?.fullName?.split(' ')[0] ?? 'Layla';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  // Mock KPIs
  const kpis = [
    {
      key: 'members',
      label: 'Active members',
      value: '247',
      delta: '+5%',
      trend: 'up' as const,
      icon: <Users size={20} color="$brand" />,
    },
    {
      key: 'revenue',
      label: "Today's revenue",
      value: 'AED 12,480',
      delta: '+12%',
      trend: 'up' as const,
      icon: <DollarSign size={20} color="$brand" />,
    },
    {
      key: 'checkins',
      label: "Today's check-ins",
      value: '89',
      delta: '+3%',
      trend: 'up' as const,
      icon: <Activity size={20} color="$brand" />,
    },
    {
      key: 'occupancy',
      label: 'Current occupancy',
      value: '42/80',
      delta: '-2%',
      trend: 'down' as const,
      icon: <Building2 size={20} color="$brand" />,
    },
  ];

  // Mock 7-day revenue bars (heights 0-1)
  const revenueData = [
    { day: 'Mon', value: 0.65 },
    { day: 'Tue', value: 0.78 },
    { day: 'Wed', value: 0.55 },
    { day: 'Thu', value: 0.88 },
    { day: 'Fri', value: 0.95 },
    { day: 'Sat', value: 0.72 },
    { day: 'Sun', value: 0.82 },
  ];

  const highlights = [
    {
      icon: <Award size={18} color="$success600" />,
      title: 'Power Yoga with Maya Patel',
      subtitle: 'Top class today — 18 attendees',
    },
    {
      icon: <TrendingUp size={18} color="$success600" />,
      title: 'Maya Patel',
      subtitle: 'Highest revenue trainer — AED 3,420',
    },
    {
      icon: <UserPlus size={18} color="$brand" />,
      title: '4 new sign-ups',
      subtitle: '2 Premium, 2 Group memberships',
    },
    {
      icon: <Clock size={18} color="$warning600" />,
      title: '7 memberships expiring',
      subtitle: 'Within the next 7 days',
    },
  ];

  const alerts = [
    {
      severity: 'danger' as const,
      title: '2 access scanners offline',
      subtitle: 'Back door and Studio 2 — last seen 14 min ago',
    },
    {
      severity: 'warning' as const,
      title: 'PT certification expiring',
      subtitle: 'Sarah Khalil — NASM cert expires in 5 days',
    },
  ];

  return (
    <Screen scroll padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <XStack
          paddingTop="$4"
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
        >
          <YStack>
            <Text variant="caption" color="muted">{greeting}</Text>
            <Text variant="h2">{ownerName}</Text>
          </YStack>
          <Logo size="sm" />
        </XStack>

        {/* Date range selector */}
        <XStack paddingHorizontal="$4" gap="$2" marginTop="$2">
          {(['today', 'week', 'month'] as DateRange[]).map((r) => (
            <YStack
              key={r}
              flex={1}
              paddingVertical="$2.5"
              alignItems="center"
              borderRadius="$lg"
              backgroundColor={range === r ? '$brand' : '$surfaceMuted'}
              onPress={() => setRange(r)}
              accessibilityRole="button"
              accessibilityLabel={`View ${r}`}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text
                variant="bodySmall"
                weight="600"
                color={range === r ? '$textOnBrand' : '$textSecondary'}
                textTransform="capitalize"
              >
                {r}
              </Text>
            </YStack>
          ))}
        </XStack>

        {/* KPI grid 2x2 */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <XStack gap="$3">
            <KPICard {...kpis[0]} flex={1} />
            <KPICard {...kpis[1]} flex={1} />
          </XStack>
          <XStack gap="$3">
            <KPICard {...kpis[2]} flex={1} />
            <KPICard {...kpis[3]} flex={1} />
          </XStack>
        </YStack>

        {/* Revenue chart */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <YStack>
                <Text variant="label">Revenue this week</Text>
                <Text variant="caption" color="muted">AED 86,240 total</Text>
              </YStack>
              <Badge label="+18%" variant="success" />
            </XStack>
            <XStack alignItems="flex-end" justifyContent="space-between" height={120} gap="$2">
              {revenueData.map((d) => (
                <YStack key={d.day} flex={1} alignItems="center" gap="$1" height="100%" justifyContent="flex-end">
                  <YStack
                    width="100%"
                    height={`${d.value * 100}%`}
                    backgroundColor="$brand"
                    borderRadius="$sm"
                    accessibilityLabel={`${d.day} revenue`}
                  />
                  <Text variant="caption" color="muted">{d.day}</Text>
                </YStack>
              ))}
            </XStack>
          </Card>
        </YStack>

        {/* Quick actions */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">Quick actions</Text>
          <XStack gap="$3">
            <QuickAction
              icon={<AlertTriangle size={20} color="$textOnBrand" />}
              label="Approvals"
              badge="7"
              onPress={() => router.push('/(owner)/approvals')}
              flex={1}
            />
            <QuickAction
              icon={<Megaphone size={20} color="$textOnBrand" />}
              label="Announce"
              onPress={() => router.push('/(owner)/profile')}
              flex={1}
            />
            <QuickAction
              icon={<FileBarChart size={20} color="$textOnBrand" />}
              label="Reports"
              onPress={() => router.push('/(owner)/profile')}
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Today's highlights */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">Today's highlights</Text>
          <YStack gap="$2">
            {highlights.map((h, i) => (
              <Card key={i} variant="outlined" padding="sm">
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor="$surfaceMuted"
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    {h.icon}
                  </YStack>
                  <YStack flex={1}>
                    <Text variant="body" weight="500">{h.title}</Text>
                    <Text variant="caption" color="muted">{h.subtitle}</Text>
                  </YStack>
                  <ArrowRight size={16} color="$textMuted" />
                </XStack>
              </Card>
            ))}
          </YStack>
        </YStack>

        {/* Alerts */}
        {alerts.length > 0 && (
          <YStack paddingHorizontal="$4" marginTop="$4">
            <XStack alignItems="center" gap="$2" marginBottom="$3">
              <AlertTriangle size={18} color="$danger500" />
              <Text variant="h4">Alerts</Text>
              <Badge label={alerts.length.toString()} variant="danger" />
            </XStack>
            <YStack gap="$2">
              {alerts.map((a, i) => (
                <Card
                  key={i}
                  variant="outlined"
                  padding="sm"
                  borderColor={a.severity === 'danger' ? '$danger500' : '$warning500'}
                  onPress={() => router.push('/(owner)/operations')}
                >
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      backgroundColor={a.severity === 'danger' ? '$danger50' : '$warning50'}
                      padding="$2.5"
                      borderRadius="$md"
                    >
                      <AlertTriangle
                        size={18}
                        color={a.severity === 'danger' ? '$danger500' : '$warning500'}
                      />
                    </YStack>
                    <YStack flex={1}>
                      <Text variant="body" weight="500">{a.title}</Text>
                      <Text variant="caption" color="muted">{a.subtitle}</Text>
                    </YStack>
                    <ChevronRight size={18} color="$textMuted" />
                  </XStack>
                </Card>
              ))}
            </YStack>
          </YStack>
        )}

        {/* See all link */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="filled" onPress={() => router.push('/(owner)/operations')}>
            <XStack alignItems="center" gap="$3">
              <Calendar size={20} color="$textPrimary" />
              <YStack flex={1}>
                <Text variant="body" weight="500">View full operations</Text>
                <Text variant="caption" color="muted">Live status, classes, staff</Text>
              </YStack>
              <ChevronRight size={18} color="$textMuted" />
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function KPICard({
  label,
  value,
  delta,
  trend,
  icon,
  flex,
}: {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
  flex?: number;
}) {
  const isUp = trend === 'up';
  return (
    <Card variant="elevated" padding="md" flex={flex}>
      <YStack gap="$2">
        <XStack alignItems="center" justifyContent="space-between">
          <YStack
            backgroundColor="$brand50"
            padding="$2"
            borderRadius="$md"
          >
            {icon}
          </YStack>
          {isUp ? (
            <TrendingUp size={14} color="$success500" />
          ) : (
            <TrendingDown size={14} color="$danger500" />
          )}
        </XStack>
        <YStack gap="$0.5">
          <Text variant="caption" color="muted">{label}</Text>
          <Text variant="h3">{value}</Text>
          <Text variant="caption" color={isUp ? '$success500' : '$danger500'} weight="600">
            {delta} vs yesterday
          </Text>
        </YStack>
      </YStack>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  badge,
  onPress,
  flex,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <YStack
      flex={flex}
      alignItems="center"
      gap="$2"
      onPress={onPress}
      pressStyle={{ opacity: 0.7, scale: 0.97 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <YStack position="relative">
        <YStack
          backgroundColor="$brand"
          padding="$3"
          borderRadius="$xl"
          alignItems="center"
          justifyContent="center"
          width={56}
          height={56}
        >
          {icon}
        </YStack>
        {badge && (
          <YStack
            position="absolute"
            top={-4}
            right={-4}
            backgroundColor="$danger500"
            borderRadius="$full"
            minWidth={20}
            height={20}
            alignItems="center"
            justifyContent="center"
            paddingHorizontal="$1.5"
          >
            <Text variant="caption" color="white" weight="700" fontSize={10}>
              {badge}
            </Text>
          </YStack>
        )}
      </YStack>
      <Text variant="caption" weight="600">{label}</Text>
    </YStack>
  );
}
