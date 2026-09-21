import React, { useState, useMemo } from 'react';
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
  EmptyState,
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery } from '@/lib/convex';
import { StatChip, ToggleButton, LegendDot, DayView } from '@/components/trainer-schedule/ScheduleBits';
import { getWeekRange, getDayNumbers } from '@/components/trainer-schedule/format';
import { api } from '@queenix/convex';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Lock,
  Settings,
} from '@tamagui/lucide-icons';

type SlotType = 'PT' | 'Class' | 'Free' | 'Blocked';
type ViewMode = 'week' | 'day';

interface GridSlot {
  day: number; // 0..6 (Mon..Sun)
  hour: number; // 6..21
  type: SlotType;
  title?: string;
  sessionId?: string;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 - 21:00
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const slotColor: Record<SlotType, { bg: string; border: string; text: string }> = {
  PT: { bg: '$brand50', border: '$brand', text: '$brand700' },
  Class: { bg: '$success50', border: '$success500', text: '$success700' },
  Free: { bg: '$surfaceMuted', border: '$borderColor', text: '$textSecondary' },
  Blocked: { bg: '$danger50', border: '$danger500', text: '$danger700' },
};

const slotLabel: Record<SlotType, string> = {
  PT: 'PT session',
  Class: 'Class',
  Free: 'Free slot',
  Blocked: 'Blocked',
};


export default function TrainerSchedule() {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const dayNumbers = useMemo(() => getDayNumbers(weekOffset), [weekOffset]);
  const weekLabel = weekOffset === 0 ? 'This week' : weekOffset > 0 ? `In ${weekOffset}w` : `${-weekOffset}w ago`;

  // For now we always show the current week from the DB.
  // (The weekOffset selector is shown but data is from getWeekSchedule
  // which returns the current week. Future: parameterize the query.)
  const scheduleQuery = useConvexQuery(api.queries.users.getWeekSchedule, {});
  const isLoading = scheduleQuery === undefined;
  const items = scheduleQuery?.items ?? [];

  // Build grid slots from items
  const slots: GridSlot[] = useMemo(() => {
    if (isLoading) return [];
    const weekStart = scheduleQuery!.weekStart;
    const out: GridSlot[] = [];
    for (const it of items as any[]) {
      const date = new Date(it.startsAt);
      const day = (date.getDay() + 6) % 7; // 0 = Mon
      const hour = date.getHours();
      if (hour < 6 || hour > 21) continue;
      if (it.kind === 'pt') {
        out.push({
          day,
          hour,
          type: 'PT',
          title: it.member?.fullName
            ? `${it.member.fullName.split(' ')[0]} • PT`
            : 'PT',
          sessionId: it._id,
        });
      } else if (it.kind === 'class') {
        out.push({
          day,
          hour,
          type: 'Class',
          title: it.classType?.name ?? 'Class',
          sessionId: it._id,
        });
      }
    }
    return out;
  }, [items, isLoading, scheduleQuery]);

  // Week stats
  const weekStats = useMemo(() => {
    const pt = (items as any[]).filter((it) => it.kind === 'pt');
    const classes = (items as any[]).filter((it) => it.kind === 'class');
    return {
      ptCount: pt.length,
      classCount: classes.length,
      totalHours:
        pt.reduce(
          (acc, it) => acc + ((it.endsAt - it.startsAt) / (1000 * 60 * 60)),
          0
        ) +
        classes.reduce(
          (acc, it) => acc + ((it.endsAt - it.startsAt) / (1000 * 60 * 60)),
          0
        ),
    };
  }, [items]);

  const handleSlotPress = (slot: GridSlot) => {
    if (slot.type === 'Free' || slot.type === 'Blocked') {
      toast.info('Tap "Manage availability" to add a slot');
      return;
    }
    if (slot.type === 'PT' && slot.sessionId) {
      router.push(`/(trainer)/clients/${(items as any[]).find((it) => it._id === slot.sessionId)?.member?._id ?? ''}`);
      return;
    }
    toast.info(`${slot.title} • ${DAYS[slot.day]} ${slot.hour}:00`);
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <YStack paddingHorizontal="$4" paddingTop="$4" paddingBottom="$3">
          <XStack alignItems="center" justifyContent="space-between">
            <YStack>
              <Text variant="caption" color="muted">
                {weekLabel}
              </Text>
              <Text variant="h2">Schedule</Text>
            </YStack>
            <XStack
              onPress={() => toast.info('Calendar export — coming soon')}
              accessibilityRole="button"
              accessibilityLabel="Export calendar"
              padding="$2"
            >
              <Calendar size={22} color="$brand" />
            </XStack>
          </XStack>
        </YStack>

        {/* Week selector */}
        <YStack paddingHorizontal="$4">
          <Card variant="outlined" padding="sm">
            <XStack alignItems="center" justifyContent="space-between">
              <XStack
                onPress={() => setWeekOffset(weekOffset - 1)}
                accessibilityRole="button"
                accessibilityLabel="Previous week"
                pressStyle={{ opacity: 0.5 }}
                padding="$2"
              >
                <ChevronLeft size={22} color="$textPrimary" />
              </XStack>
              <YStack alignItems="center">
                <Text variant="label">{weekLabel}</Text>
                <Text variant="caption" color="muted">
                  {weekRange}
                </Text>
              </YStack>
              <XStack
                onPress={() => setWeekOffset(weekOffset + 1)}
                accessibilityRole="button"
                accessibilityLabel="Next week"
                pressStyle={{ opacity: 0.5 }}
                padding="$2"
              >
                <ChevronRight size={22} color="$textPrimary" />
              </XStack>
            </XStack>
          </Card>
        </YStack>

        {/* Week stats */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <XStack gap="$3">
            <StatChip label="PT" value={weekStats.ptCount.toString()} flex={1} />
            <StatChip label="Classes" value={weekStats.classCount.toString()} flex={1} />
            <StatChip label="Hours" value={weekStats.totalHours.toFixed(1)} flex={1} />
          </XStack>
        </YStack>

        {/* View toggle */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <Card variant="outlined" padding="xs">
            <XStack gap="$2">
              <ToggleButton
                label="Week"
                selected={view === 'week'}
                onPress={() => setView('week')}
                flex={1}
              />
              <ToggleButton
                label="Day"
                selected={view === 'day'}
                onPress={() => setView('day')}
                flex={1}
              />
            </XStack>
          </Card>
        </YStack>

        {/* Legend */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <XStack gap="$2" flexWrap="wrap">
            <LegendDot color="$brand" label="PT" />
            <LegendDot color="$success500" label="Class" />
            <LegendDot color="$textMuted" label="Free" />
            <LegendDot color="$danger500" label="Blocked" />
          </XStack>
        </YStack>

        {/* Calendar grid */}
        {view === 'week' ? (
          <YStack paddingHorizontal="$4" marginTop="$4">
            <Card variant="outlined" padding="sm">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <YStack minWidth={560}>
                  {/* Day header row */}
                  <XStack>
                    <YStack width={48} />
                    {DAYS.map((d, i) => (
                      <YStack key={d} width={70} alignItems="center" paddingVertical="$2">
                        <Text variant="caption" weight="600" color="muted">
                          {d}
                        </Text>
                        <Text variant="label">{dayNumbers[i]}</Text>
                      </YStack>
                    ))}
                  </XStack>
                  <Divider />
                  {/* Hours grid */}
                  {HOURS.map((h) => (
                    <XStack key={h} alignItems="stretch" minHeight={44}>
                      <YStack width={48} justifyContent="center" alignItems="center">
                        <Text variant="caption" color="muted">
                          {h}:00
                        </Text>
                      </YStack>
                      {DAYS.map((_, dayIdx) => {
                        const slot = slots.find(
                          (s) => s.day === dayIdx && s.hour === h
                        );
                        return (
                          <YStack key={`${dayIdx}-${h}`} width={70} padding={3}>
                            {slot ? (
                              <XStack
                                flex={1}
                                backgroundColor={slotColor[slot.type].bg as any}
                                borderLeftWidth={3}
                                borderColor={slotColor[slot.type].border as any}
                                borderRadius="$sm"
                                paddingHorizontal="$1.5"
                                paddingVertical="$1"
                                onPress={() => handleSlotPress(slot)}
                                accessibilityRole="button"
                                accessibilityLabel={`${slotLabel[slot.type]} ${DAYS[dayIdx]} at ${h}:00${slot.title ? `, ${slot.title}` : ''}`}
                              >
                                <Text
                                  fontSize={9}
                                  fontWeight="600"
                                  color={slotColor[slot.type].text as any}
                                  numberOfLines={2}
                                >
                                  {slot.title ?? slotLabel[slot.type]}
                                </Text>
                              </XStack>
                            ) : null}
                          </YStack>
                        );
                      })}
                    </XStack>
                  ))}
                </YStack>
              </ScrollView>
            </Card>
            {isLoading ? (
              <Skeleton height={80} borderRadius="$md" marginTop="$3" />
            ) : slots.length === 0 ? (
              <EmptyState
                title="Nothing booked this week"
                message="Your week is clear. Use the actions below to add availability."
              />
            ) : null}
          </YStack>
        ) : (
          <DayView slots={slots} isLoading={isLoading} />
        )}

        {/* Actions */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Button
            label="Manage availability"
            variant="primary"
            size="lg"
            fullWidth
            icon={<Settings size={18} color="$textOnBrand" />}
            onPress={() => toast.info('Availability manager — coming soon')}
          />
          <Button
            label="Block time"
            variant="outline"
            size="lg"
            fullWidth
            icon={<Lock size={18} color="$brand" />}
            onPress={() => toast.info('Block-time sheet — coming soon')}
          />
        </YStack>
      </ScrollView>
    </Screen>
  );
}

