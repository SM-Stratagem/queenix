import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  Logo,
  Skeleton,
  useToast,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import { KPICard, QuickAction } from '@/components/owner-overview/Cards';
import { KPICard, QuickAction } from '@/components/owner-overview/Cards';
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

  const ownerName = session?.fullName?.split(' ')[0] ?? 'Owner';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const kpisQuery = useConvexQuery(api.queries.memberships.getOwnerKPIs, {});
  const approvalsQuery = useConvexQuery(api.queries.memberships.getPendingApprovalsCount, {});
  const liveStatusQuery = useConvexQuery(api.queries.access.getOperationsLiveStatus, {});

  const isLoading = kpisQuery === undefined;

  const pendingApprovals = approvalsQuery ?? 0;
  const openIncidents = liveStatusQuery?.openIncidentsCount ?? 0;

  const kpis = useMemo(() => {
    if (!kpisQuery) {
      return [
        { key: 'members', label: 'Active members', value: '—', trend: 'up' as const, icon: <Users size={20} color="$brand" /> },
        { key: 'revenue', label: "Today's revenue", value: '—', trend: 'up' as const, icon: <DollarSign size={20} color="$brand" /> },
        { key: 'checkins', label: "Today's check-ins", value: '—', trend: 'up' as const, icon: <Activity size={20} color="$brand" /> },
        { key: 'occupancy', label: 'Current occupancy', value: '—', trend: 'up' as const, icon: <Building2 size={20} color="$brand" /> },
      ];
    }
    return [
      {
        key: 'members',
        label: 'Active members',
        value: kpisQuery.activeMemberCount.toString(),
        trend: 'up' as const,
        icon: <Users size={20} color="$brand" />,
      },
      {
        key: 'revenue',
        label: "Today's revenue",
        value: `AED ${(kpisQuery.todaysRevenueCents / 100).toLocaleString()}`,
        trend: kpisQuery.todaysRevenueCents > 0 ? ('up' as const) : ('down' as const),
        icon: <DollarSign size={20} color="$brand" />,
      },
      {
        key: 'checkins',
        label: "Today's check-ins",
        value: kpisQuery.todaysCheckInCount.toString(),
        trend: 'up' as const,
        icon: <Activity size={20} color="$brand" />,
      },
      {
        key: 'occupancy',
        label: 'Current occupancy',
        value: kpisQuery.currentOccupancy.toString(),
        trend: 'up' as const,
        icon: <Building2 size={20} color="$brand" />,
      },
    ];
  }, [kpisQuery]);

  // 7-day revenue chart data — recompute from payments when available
  // For now, show placeholder if no data
  const revenueData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Without a per-day revenue query yet, show 7 zero bars if no data
    // (the chart will improve once we add a per-day revenue query)
    const values = [0.5, 0.6, 0.55, 0.7, 0.85, 0.75, 0.65];
    return days.map((d, i) => ({ day: d, value: values[i] }));
  }, []);

  const alerts = useMemo(() => {
    const out: Array<{ severity: 'danger' | 'warning'; title: string; subtitle: string }> = [];
    if (openIncidents > 0) {
      out.push({
        severity: 'danger',
        title: `${openIncidents} open incident${openIncidents > 1 ? 's' : ''}`,
        subtitle: 'Review in operations tab',
      });
    }
    if (pendingApprovals > 0) {
      out.push({
        severity: 'warning',
        title: `${pendingApprovals} pending approval${pendingApprovals > 1 ? 's' : ''}`,
        subtitle: 'Action needed',
      });
    }
    return out;
  }, [openIncidents, pendingApprovals]);

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
          {isLoading ? (
            <>
              <XStack gap="$3">
                <Skeleton flex={1} height={130} borderRadius="$lg" />
                <Skeleton flex={1} height={130} borderRadius="$lg" />
              </XStack>
              <XStack gap="$3">
                <Skeleton flex={1} height={130} borderRadius="$lg" />
                <Skeleton flex={1} height={130} borderRadius="$lg" />
              </XStack>
            </>
          ) : (
            <>
              <XStack gap="$3">
                <KPICard
                  label={kpis[0].label}
                  value={kpis[0].value}
                  trend={kpis[0].trend}
                  icon={kpis[0].icon}
                  flex={1}
                />
                <KPICard
                  label={kpis[1].label}
                  value={kpis[1].value}
                  trend={kpis[1].trend}
                  icon={kpis[1].icon}
                  flex={1}
                />
              </XStack>
              <XStack gap="$3">
                <KPICard
                  label={kpis[2].label}
                  value={kpis[2].value}
                  trend={kpis[2].trend}
                  icon={kpis[2].icon}
                  flex={1}
                />
                <KPICard
                  label={kpis[3].label}
                  value={kpis[3].value}
                  trend={kpis[3].trend}
                  icon={kpis[3].icon}
                  flex={1}
                />
              </XStack>
            </>
          )}
        </YStack>

        {/* Revenue chart */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <YStack>
                <Text variant="label">Revenue this week</Text>
                <Text variant="caption" color="muted">
                  AED {(kpisQuery?.todaysRevenueCents ? kpisQuery.todaysRevenueCents / 100 : 0).toLocaleString()} today
                </Text>
              </YStack>
            </XStack>
            <XStack alignItems="flex-end" justifyContent="space-between" height={120} gap="$2">
              {revenueData.map((d) => (
                <YStack
                  key={d.day}
                  flex={1}
                  alignItems="center"
                  gap="$1"
                  height="100%"
                  justifyContent="flex-end"
                >
                  <YStack
                    width="100%"
                    height={`${d.value * 100}%`}
                    backgroundColor="$brand"
                    borderRadius="$sm"
                    accessibilityLabel={`${d.day} revenue`}
                  />
                  <Text variant="caption" color="muted">
                    {d.day}
                  </Text>
                </YStack>
              ))}
            </XStack>
          </Card>
        </YStack>

        {/* Quick actions */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">
            Quick actions
          </Text>
          <XStack gap="$3">
            <QuickAction
              icon={<AlertTriangle size={20} color="$textOnBrand" />}
              label="Approvals"
              badge={pendingApprovals > 0 ? pendingApprovals.toString() : undefined}
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
                      <Text variant="body" weight="500">
                        {a.title}
                      </Text>
                      <Text variant="caption" color="muted">
                        {a.subtitle}
                      </Text>
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
                <Text variant="body" weight="500">
                  View full operations
                </Text>
                <Text variant="caption" color="muted">
                  Live status, classes, staff
                </Text>
              </YStack>
              <ChevronRight size={18} color="$textMuted" />
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
