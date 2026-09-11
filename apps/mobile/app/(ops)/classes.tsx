import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Header,
  Progress,
  Sheet,
  Divider,
  Skeleton,
  ErrorState,
  EmptyState,
} from '@queenix/ui';
import { useConvexQuery, api } from '@/lib/convex';
import { SummaryStat } from '@/components/ops-classes/SummaryStat';
import { ClassCard, type ClassInstance, type RosterEntry } from '@/components/ops-classes/ClassCard';
import { RosterRow } from '@/components/ops-classes/RosterRow';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  Check,
  X,
  UserCheck,
  PlayCircle,
  RefreshCw,
} from '@tamagui/lucide-icons';
import { formatTime } from '@queenix/types';
import { RosterDetail } from '@/components/ops-classes/RosterDetail';

function getInitials(name?: string | null): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

const TRAINER_AVATAR_COLOR = {
  PT: '$brand100',
  MA: '$success100',
  SK: '$warning100',
} as const;

export default function OpsClassesScreen() {
  const router = useRouter();
  const [selectedDateOffset, setSelectedDateOffset] = useState(0);
  const [selectedClass, setSelectedClass] = useState<ClassInstance | null>(null);

  const dateStrip = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return {
        offset: i,
        day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        num: d.getDate(),
        month: d.toLocaleDateString('en-GB', { month: 'short' }),
        isToday: i === 0,
      };
    });
  }, []);

  const todayClasses = useConvexQuery(api.queries.classes.getTodayRoster, {});

  // Map Convex data → UI shape
  const classes: ClassInstance[] = useMemo(() => {
    if (!todayClasses) return [];
    return todayClasses.map((c: any) => {
      const rosterPreview: RosterEntry[] = (c.rosterPreview ?? []).map((r: any, i: number) => ({
        id: r._id ?? `r${i}`,
        name: r.user?.fullName ?? 'Member',
        initials: getInitials(r.user?.fullName),
        status: 'booked',
        memberId: `QNX-${(r.user?._id ?? '').slice(-5).toUpperCase()}`,
      }));
      return {
        id: c._id,
        name: c.classType?.name ?? 'Class',
        trainer: c.trainer?.fullName ?? 'TBA',
        trainerInitials: getInitials(c.trainer?.fullName),
        startsAt: c.startsAt,
        durationMin: c.classType?.durationMinutes ?? 60,
        room: c.roomId ?? 'Studio',
        capacity: c.capacity,
        attendees: rosterPreview,
      };
    });
  }, [todayClasses]);

  const checkedInCount = (c: ClassInstance) =>
    c.attendees.filter((a) => a.status === 'checked_in').length;
  const bookedCount = (c: ClassInstance) =>
    c.attendees.filter((a) => a.status === 'booked').length;
  const lateCount = (c: ClassInstance) =>
    c.attendees.filter((a) => a.status === 'late').length;
  const noShowCount = (c: ClassInstance) =>
    c.attendees.filter((a) => a.status === 'no_show').length;

  const totalCheckedIn = classes.reduce((acc, c) => acc + checkedInCount(c), 0);
  const totalBooked = classes.reduce((acc, c) => acc + bookedCount(c), 0);
  const totalLate = classes.reduce((acc, c) => acc + lateCount(c), 0);
  const totalNoShow = classes.reduce((acc, c) => acc + noShowCount(c), 0);

  return (
    <Screen padded={false}>
      <Header
        title="Class rosters"
        subtitle="Manage today's check-ins"
        right={
          <Button
            label="Check-in"
            variant="primary"
            size="sm"
            icon={<UserCheck size={16} color="$textOnBrand" />}
            onPress={() => router.push('/(ops)/scanner')}
            accessibilityLabel="Open scanner"
          />
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Date selector */}
        <YStack paddingHorizontal="$4" marginTop="$2">
          <XStack gap="$2">
            {dateStrip.map((d) => {
              const active = d.offset === selectedDateOffset;
              return (
                <YStack
                  key={d.offset}
                  flex={1}
                  alignItems="center"
                  paddingVertical="$2.5"
                  borderRadius="$md"
                  backgroundColor={active ? '$brand' : '$surfaceMuted'}
                  onPress={() => setSelectedDateOffset(d.offset)}
                  pressStyle={{ opacity: 0.75, scale: 0.96 }}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.isToday ? 'Today, ' : ''}${d.day} ${d.num} ${d.month}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    color={active ? 'inverse' : 'muted'}
                    textTransform="uppercase"
                  >
                    {d.isToday ? 'Today' : d.day}
                  </Text>
                  <Text
                    variant="h3"
                    color={active ? 'inverse' : 'primary'}
                    marginTop="$0.5"
                  >
                    {d.num}
                  </Text>
                </YStack>
              );
            })}
          </XStack>
        </YStack>

        {/* Quick stats */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack gap="$3">
            <SummaryStat
              icon={<Check size={18} color="$success500" />}
              label="Checked in"
              value={totalCheckedIn.toString()}
              flex={1}
            />
            <SummaryStat
              icon={<Clock size={18} color="$warning500" />}
              label="Booked"
              value={totalBooked.toString()}
              flex={1}
            />
            <SummaryStat
              icon={<X size={18} color="$danger500" />}
              label="No-shows"
              value={totalNoShow.toString()}
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Class list */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="h4">Today's classes</Text>
            {todayClasses && todayClasses.length > 0 && (
              <Text variant="caption" color="muted">
                {todayClasses.length} session{todayClasses.length === 1 ? '' : 's'}
              </Text>
            )}
          </XStack>
          {todayClasses === undefined ? (
            <YStack gap="$3">
              <Skeleton height={180} borderRadius={16} />
              <Skeleton height={180} borderRadius={16} />
            </YStack>
          ) : todayClasses === null ? (
            <ErrorState onRetry={() => {}} />
          ) : classes.length === 0 ? (
            <EmptyState
              title="No classes today"
              message="The schedule is clear. New bookings will appear here as soon as members sign up."
              icon={<Calendar size={32} color="$textMuted" />}
            />
          ) : (
            classes.map((c) => (
              <ClassCard
                key={c.id}
                cls={c}
                checkedIn={checkedInCount(c)}
                late={lateCount(c)}
                noShow={noShowCount(c)}
                onOpen={() => setSelectedClass(c)}
              />
            ))
          )}
        </YStack>
      </ScrollView>

      {/* Roster sheet */}
      <Sheet
        open={!!selectedClass}
        onOpenChange={(open) => !open && setSelectedClass(null)}
      >
        {selectedClass ? (
          <YStack gap="$3">
            <YStack gap="$0.5">
              <Text variant="h2">{selectedClass.name}</Text>
              <Text variant="bodySmall" color="secondary">
                {selectedClass.trainer} • {selectedClass.room} • {formatTime(selectedClass.startsAt)}
              </Text>
            </YStack>
            <RosterDetail cls={selectedClass} />
          </YStack>
        ) : null}
      </Sheet>
    </Screen>
  );
}

