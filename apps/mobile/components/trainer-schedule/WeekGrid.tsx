import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { Text, Card, Divider, Skeleton, EmptyState } from '@queenix/ui';
import type { GridSlot, SlotType } from './types';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 - 21:00
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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

export function WeekGrid({
  dayNumbers,
  slots,
  isLoading,
  onSlotPress,
}: {
  dayNumbers: number[];
  slots: GridSlot[];
  isLoading: boolean;
  onSlotPress: (slot: GridSlot) => void;
}) {
  return (
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
                          onPress={() => onSlotPress(slot)}
                          role="button"
                          aria-label={`${slotLabel[slot.type]} ${DAYS[dayIdx]} at ${h}:00${slot.title ? `, ${slot.title}` : ''}`}
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
  );
}
