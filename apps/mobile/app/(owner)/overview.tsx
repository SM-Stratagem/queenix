import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Logo,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import { QuickAction } from '@/components/owner-overview/Cards';
import {
  RangeSelector,
  KpiGrid,
  RevenueChart,
  AlertsSection,
  type DateRange,
  type Kpi,
  type Alert,
} from '@/components/owner-overview/Sections';
import {
  Users,
  DollarSign,
  Activity,
  Building2,
  ChevronRight,
  Megaphone,
  FileBarChart,
  AlertTriangle,
  Calendar,
} from '@tamagui/lucide-icons-2';

export default function FinanceOverview() {
  const router = useRouter();
  const { session } = useAuth();
  const [range, setRange] = useState<DateRange>('today');

  const ownerName = session?.fullName?.split(' ')[0] ?? 'Finance';
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const kpisQuery = useConvexQuery(api.queries.memberships.getOwnerKPIs, {});
  const approvalsQuery = useConvexQuery(api.queries.memberships.getPendingApprovalsCount, {});
  const liveStatusQuery = useConvexQuery(api.queries.access.getOperationsLiveStatus, {});
  const revenueMonths = useConvexQuery(api.queries.financeReports.getRevenueAnalytics, { monthsBack: 6 }) as
    | Array<{ month: string; netCents: number }>
    | undefined;

  const isLoading = kpisQuery === undefined;

  const pendingApprovals = approvalsQuery ?? 0;
  const openIncidents = liveStatusQuery?.openIncidentsCount ?? 0;

  const kpis = useMemo((): [Kpi, Kpi, Kpi, Kpi] => {
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

  // Real net revenue per month (financeReports.getRevenueAnalytics), bars scaled to the max month.
  const revenueData = useMemo(() => {
    const rows = revenueMonths ?? [];
    const max = Math.max(1, ...rows.map((r) => r.netCents));
    return rows.map((r) => ({
      day: new Date(`${r.month}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'short' }),
      value: Math.max(0, r.netCents) / max,
    }));
  }, [revenueMonths]);

  const alerts = useMemo(() => {
    const out: Alert[] = [];
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
        <RangeSelector range={range} onChange={setRange} />

        {/* KPI grid 2x2 */}
        <KpiGrid isLoading={isLoading} kpis={kpis} />

        {/* Revenue chart */}
        <RevenueChart todaysRevenueCents={kpisQuery?.todaysRevenueCents} data={revenueData} />

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
          <AlertsSection alerts={alerts} onPress={() => router.push('/(owner)/operations')} />
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

export { ScreenError as ErrorBoundary } from '@/components/common/ScreenError';
