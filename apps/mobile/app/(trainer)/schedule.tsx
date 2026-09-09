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
  useToast,
} from '@queenix/ui';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Lock,
  Settings,
  Plus,
} from '@tamagui/lucide-icons';

type SlotType = 'PT' | 'Class' | 'Free' | 'Blocked';
type ViewMode = 'week' | 'day';

interface Slot {
  day: number; // 0..6 (Mon..Sun)
  hour: number; // 6..21
  type: SlotType;
  title?: string;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 - 21:00
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const mockSlots: Slot[] = [
  { day: 0, hour: 7, type: 'PT', title: 'Amna • PT' },
  { day: 0, hour: 8, type: 'Class', title: 'Power Yoga' },
  { day: 0, hour: 10, type: 'PT', title: 'Hala • PT' },
  { day: 0, hour: 12, type: 'PT', title: 'Mariam • PT' },
  { day: 0, hour: 17, type: 'Class', title: 'HIIT 45' },
  { day: 0, hour: 19, type: 'PT', title: 'Sara • PT' },

  { day: 1, hour: 8, type: 'Class', title: 'Power Yoga' },
  { day: 1, hour: 11, type: 'PT', title: 'Fatima • PT' },
  { day: 1, hour: 16, type: 'Free' },
  { day: 1, hour: 18, type: 'Class', title: 'Pilates' },

  { day: 2, hour: 7, type: 'PT', title: 'Noora • PT' },
  { day: 2, hour: 9, type: 'Blocked', title: 'Staff meeting' },
  { day: 2, hour: 14, type: 'PT', title: 'Reem • PT' },
  { day: 2, hour: 17, type: 'Class', title: 'HIIT 45' },
  { day: 2, hour: 19, type: 'PT', title: 'Latifa • PT' },

  { day: 3, hour: 8, type: 'Class', title: 'Power Yoga' },
  { day: 3, hour: 12, type: 'PT', title: 'Hala • PT' },
  { day: 3, hour: 18, type: 'Class', title: 'Pilates' },
  { day: 3, hour: 20, type: 'PT', title: 'Amna • PT' },

  { day: 4, hour: 7, type: 'PT', title: 'Fatima • PT' },
  { day: 4, hour: 9, type: 'PT', title: 'Aisha • PT' },
  { day: 4, hour: 17, type: 'Class', title: 'HIIT 45' },
  { day: 4, hour: 19, type: 'PT', title: 'Sara • PT' },

  { day: 5, hour: 9, type: 'Class', title: 'Weekend Yoga' },
  { day: 5, hour: 11, type: 'PT', title: 'Mariam • PT' },
  { day: 5, hour: 14, type: 'Free' },
  { day: 5, hour: 16, type: 'Blocked', title: 'Personal' },

  { day: 6, hour: 10, type: 'Class', title: 'Weekend Yoga' },
  { day: 6, hour: 17, type: 'Free' },
];

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

function getWeekRange(offsetWeeks: number): string {
  const now = new Date();
  // Move to Monday of the target week
  const day = (now.getDay() + 6) % 7; // 0 = Mon
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + offsetWeeks * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export default function TrainerSchedule() {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<ViewMode>('week');
  const [weekOffset, setWeekOffset] = useState(0);

  const weekRange = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const weekLabel = weekOffset === 0 ? 'This week' : weekOffset > 0 ? `In ${weekOffset}w` : `${-weekOffset}w ago`;

  const handleSlotPress = (slot: Slot) => {
    toast.info(
      slot.type === 'Free'
        ? 'Tap "Add availability" to fill this slot'
        : `${slot.title ?? slotLabel[slot.type]} • ${DAYS[slot.day]} ${slot.hour}:00`,
    );
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
                        <Text variant="label">
                          {((i + 1) % 7) + 8}
                        </Text>
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
                        const slot = mockSlots.find(
                          (s) => s.day === dayIdx && s.hour === h,
                        );
                        return (
                          <YStack
                            key={`${dayIdx}-${h}`}
                            width={70}
                            padding={3}
                          >
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
          </YStack>
        ) : (
          <DayView day={0} />
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

function ToggleButton({
  label,
  selected,
  onPress,
  flex,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <XStack
      flex={flex}
      backgroundColor={selected ? '$brand' : 'transparent'}
      paddingVertical="$2"
      borderRadius="$md"
      alignItems="center"
      justifyContent="center"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
      accessibilityRole="button"
      accessibilityLabel={`${label} view`}
      accessibilityState={{ selected }}
    >
      <Text
        variant="label"
        color={selected ? 'inverse' : 'secondary'}
      >
        {label}
      </Text>
    </XStack>
  );
}

function LegendDot({ color, label }: { color: any; label: string }) {
  return (
    <XStack
      alignItems="center"
      gap="$1.5"
      backgroundColor="$surfaceMuted"
      paddingHorizontal="$2.5"
      paddingVertical="$1"
      borderRadius="$full"
    >
      <YStack width={8} height={8} borderRadius="$full" backgroundColor={color} />
      <Text variant="caption" color="secondary">
        {label}
      </Text>
    </XStack>
  );
}

function DayView({ day }: { day: number }) {
  const toast = useToast();
  const daySlots = mockSlots.filter((s) => s.day === day);
  return (
    <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
      <Text variant="h4">{DAYS[day]}'s plan</Text>
      {daySlots.length === 0 ? (
        <Card variant="outlined">
          <Text variant="body" color="muted" align="center">
            No sessions booked. Tap "Add availability" to open slots.
          </Text>
        </Card>
      ) : (
        daySlots
          .sort((a, b) => a.hour - b.hour)
          .map((s, i) => (
            <Card
              key={i}
              variant="outlined"
              padding="sm"
              onPress={() => toast.info(s.title ?? slotLabel[s.type])}
            >
              <XStack alignItems="center" gap="$3">
                <YStack width={56} alignItems="center">
                  <Text variant="h4">
                    {s.hour.toString().padStart(2, '0')}:00
                  </Text>
                </YStack>
                <YStack
                  width={3}
                  alignSelf="stretch"
                  backgroundColor={slotColor[s.type].border as any}
                  borderRadius="$full"
                />
                <YStack flex={1}>
                  <Text variant="label">{s.title ?? slotLabel[s.type]}</Text>
                  <Text variant="caption" color="muted">
                    {slotLabel[s.type]}
                  </Text>
                </YStack>
                <Badge
                  label={slotLabel[s.type]}
                  variant={
                    s.type === 'PT'
                      ? 'brand'
                      : s.type === 'Class'
                        ? 'success'
                        : s.type === 'Blocked'
                          ? 'danger'
                          : 'neutral'
                  }
                />
              </XStack>
            </Card>
          ))
      )}
    </YStack>
  );
}
