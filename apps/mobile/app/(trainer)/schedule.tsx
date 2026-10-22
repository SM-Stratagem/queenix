import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Button,
  useToast,
} from '@queenix/ui';
import { Share } from 'react-native';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import {
  StatChip,
  ToggleButton,
  LegendDot,
  DayView,
  WeekSelector,
} from '@/components/trainer-schedule/ScheduleBits';
import { WeekGrid, DAYS } from '@/components/trainer-schedule/WeekGrid';
import type { GridSlot, ViewMode } from '@/components/trainer-schedule/types';
import { getWeekRange, getDayNumbers, getMonday } from '@/components/trainer-schedule/format';
import { api } from '@queenix/convex';
import { Calendar, Lock, Settings } from '@tamagui/lucide-icons-2';

export default function TrainerSchedule() {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const dayNumbers = useMemo(() => getDayNumbers(weekOffset), [weekOffset]);
  const weekLabel = weekOffset === 0 ? 'This week' : weekOffset > 0 ? `In ${weekOffset}w` : `${-weekOffset}w ago`;

  // weekStart = local Monday 00:00 of the selected week (arrows load that week).
  const weekStart = useMemo(() => getMonday(weekOffset).getTime(), [weekOffset]);
  const scheduleQuery = useConvexQuery(api.queries.users.getWeekSchedule, { weekStart });
  const myProfile = useConvexQuery(api.queries.users.getMyTrainerProfile, {});
  const setAvailability = useConvexMutation(api.mutations.users.updateTrainerProfile);
  const isAvailable = (myProfile as any)?.isAvailable !== false;

  function fmtTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  async function onShareWeek() {
    const lines = (items as any[]).map((it) =>
      it.kind === 'pt'
        ? `• ${fmtTime(it.startsAt)} — PT with ${it.member?.fullName ?? 'member'} (${it.status})`
        : `• ${fmtTime(it.startsAt)} — ${it.classType?.name ?? 'Class'} (${it.bookedCount}/${it.capacity})`
    );
    try {
      await Share.share({
        title: `My schedule — ${weekLabel}`,
        message: `My schedule — ${weekLabel}\n${lines.length > 0 ? lines.join('\n') : 'No sessions this week.'}`,
      });
    } catch {
      // Dismissed — nothing to do.
    }
  }

  async function onToggleAvailability() {
    try {
      await setAvailability({ isAvailable: !isAvailable });
      toast.success(isAvailable ? 'Marked unavailable' : 'Marked available');
    } catch (e: any) {
      toast.error(e?.data?.message ?? e?.message ?? 'Update failed');
    }
  }
  const isLoading = scheduleQuery === undefined;
  const items = scheduleQuery?.items ?? [];

  // Build grid slots from items
  const slots: GridSlot[] = useMemo(() => {
    if (isLoading) return [];
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
  }, [items, isLoading]);

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
              onPress={onShareWeek}
              role="button"
              aria-label="Share week"
              padding="$2"
            >
              <Calendar size={22} color="$brand" />
            </XStack>
          </XStack>
        </YStack>

        {/* Week selector */}
        <YStack paddingHorizontal="$4">
          <WeekSelector
            weekLabel={weekLabel}
            weekRange={weekRange}
            onPrev={() => setWeekOffset(weekOffset - 1)}
            onNext={() => setWeekOffset(weekOffset + 1)}
          />
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
          <WeekGrid
            dayNumbers={dayNumbers}
            slots={slots}
            isLoading={isLoading}
            onSlotPress={handleSlotPress}
          />
        ) : (
          <DayView slots={slots} isLoading={isLoading} />
        )}

        {/* Actions */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Button
            label={isAvailable ? 'Available — tap to go unavailable' : 'Unavailable — tap to go available'}
            variant="primary"
            size="lg"
            fullWidth
            icon={<Settings size={18} color="$textOnBrand" />}
            onPress={onToggleAvailability}
          />
          <Button
            label="Request day off"
            variant="outline"
            size="lg"
            fullWidth
            icon={<Lock size={18} color="$brand" />}
            onPress={() => router.push('/(trainer)/time-off')}
          />
        </YStack>
      </ScrollView>
    </Screen>
  );
}


export { ScreenError as ErrorBoundary } from '@/components/common/ScreenError';
