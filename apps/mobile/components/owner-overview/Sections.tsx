import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text, Card, Badge, Skeleton } from '@queenix/ui';
import { AlertTriangle, ChevronRight } from '@tamagui/lucide-icons-2';
import { KPICard } from './Cards';

export type DateRange = 'today' | 'week' | 'month';

export interface Kpi {
  key: string;
  label: string;
  value: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}

export type Alert = { severity: 'danger' | 'warning'; title: string; subtitle: string };

export function RangeSelector({
  range,
  onChange,
}: {
  range: DateRange;
  onChange: (r: DateRange) => void;
}) {
  return (
  <XStack paddingHorizontal="$4" gap="$2" marginTop="$2">
    {(['today', 'week', 'month'] as DateRange[]).map((r) => (
      <YStack
        key={r}
        flex={1}
        paddingVertical="$2.5"
        alignItems="center"
        borderRadius="$lg"
        backgroundColor={range === r ? '$brand' : '$surfaceMuted'}
        onPress={() => onChange(r)}
        role="button"
        aria-label={`View ${r}`}
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
  );
}

export function KpiGrid({
  isLoading,
  kpis,
}: {
  isLoading: boolean;
  kpis: [Kpi, Kpi, Kpi, Kpi];
}) {
  return (
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
  );
}

export function RevenueChart({
  todaysRevenueCents,
  data,
}: {
  todaysRevenueCents: number | undefined;
  data: Array<{ day: string; value: number }>;
}) {
  return (
  <YStack paddingHorizontal="$4" marginTop="$4">
    <Card variant="outlined">
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
        <YStack>
          <Text variant="label">Revenue this week</Text>
          <Text variant="caption" color="muted">
            AED {(todaysRevenueCents ? todaysRevenueCents / 100 : 0).toLocaleString()} today
          </Text>
        </YStack>
      </XStack>
      <XStack alignItems="flex-end" justifyContent="space-between" height={120} gap="$2">
        {data.map((d) => (
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
              aria-label={`${d.day} revenue`}
            />
            <Text variant="caption" color="muted">
              {d.day}
            </Text>
          </YStack>
        ))}
      </XStack>
    </Card>
  </YStack>
  );
}

export function AlertsSection({
  alerts,
  onPress,
}: {
  alerts: Alert[];
  onPress: () => void;
}) {
  return (
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
          onPress={onPress}
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
  );
}
