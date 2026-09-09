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

interface RosterEntry {
  id: string;
  name: string;
  initials: string;
  status: 'checked_in' | 'booked' | 'no_show' | 'late';
  memberId: string;
  time?: string;
}

interface ClassInstance {
  id: string;
  name: string;
  trainer: string;
  trainerInitials: string;
  startsAt: number;
  durationMin: number;
  room: string;
  capacity: number;
  attendees: RosterEntry[];
}

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

function SummaryStat({
  icon,
  label,
  value,
  flex,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  flex?: number;
}) {
  return (
    <Card variant="outlined" padding="sm" flex={flex}>
      <YStack gap="$1">
        {icon}
        <Text variant="h3">{value}</Text>
        <Text variant="caption" color="muted">
          {label}
        </Text>
      </YStack>
    </Card>
  );
}

function ClassCard({
  cls,
  checkedIn,
  late,
  noShow,
  onOpen,
}: {
  cls: ClassInstance;
  checkedIn: number;
  late: number;
  noShow: number;
  onOpen: () => void;
}) {
  const capacityPct = Math.min(100, (cls.attendees.length / cls.capacity) * 100);
  const rosterPreview = cls.attendees.slice(0, 4);
  const overflowCount = cls.attendees.length - rosterPreview.length;

  return (
    <Card variant="elevated" padding="md">
      <XStack justifyContent="space-between" alignItems="flex-start">
        <YStack flex={1} gap="$1">
          <Text variant="h3" numberOfLines={1}>
            {cls.name}
          </Text>
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <XStack alignItems="center" gap="$1">
              <Clock size={14} color="$textMuted" />
              <Text variant="bodySmall" color="secondary">
                {formatTime(cls.startsAt)} • {cls.durationMin} min
              </Text>
            </XStack>
          </XStack>
          <XStack alignItems="center" gap="$2">
            <XStack alignItems="center" gap="$1">
              <Users size={14} color="$textMuted" />
              <Text variant="bodySmall" color="secondary">
                {cls.trainer}
              </Text>
            </XStack>
            <Text variant="caption" color="muted">
              •
            </Text>
            <XStack alignItems="center" gap="$1">
              <MapPin size={14} color="$textMuted" />
              <Text variant="bodySmall" color="secondary">
                {cls.room}
              </Text>
            </XStack>
          </XStack>
        </YStack>
        {cls.startsAt - Date.now() < 60 * 60 * 1000 && cls.startsAt > Date.now() && (
          <Badge label="Starting soon" variant="warning" />
        )}
      </XStack>

      {/* Capacity bar */}
      <YStack marginTop="$3" gap="$1.5">
        <XStack justifyContent="space-between">
          <Text variant="caption" color="muted">
            Capacity
          </Text>
          <Text variant="caption" weight="600">
            {cls.attendees.length}/{cls.capacity}
          </Text>
        </XStack>
        <Progress
          value={capacityPct}
          color={capacityPct > 90 ? '$warning' : '$brand'}
          size="sm"
        />
      </YStack>

      {/* Status chips */}
      {(late > 0 || noShow > 0) && (
        <XStack gap="$2" marginTop="$2">
          {late > 0 && (
            <Badge label={`${late} late`} variant="warning" />
          )}
          {noShow > 0 && (
            <Badge label={`${noShow} no-show`} variant="danger" />
          )}
        </XStack>
      )}

      <Divider marginVertical="$3" />

      {/* Roster preview */}
      <XStack alignItems="center" gap="$2">
        <XStack>
          {rosterPreview.length > 0 ? (
            rosterPreview.map((a, i) => (
              <YStack key={a.id} marginLeft={i === 0 ? 0 : -10}>
                <Avatar
                  name={a.name}
                  size="sm"
                  fallbackColor={a.status === 'checked_in' ? '$success' : '$info'}
                />
              </YStack>
            ))
          ) : (
            <Text variant="caption" color="muted">
              No bookings yet
            </Text>
          )}
        </XStack>
        <Text variant="caption" color="muted" flex={1}>
          {overflowCount > 0
            ? `+${overflowCount} more in roster`
            : `${checkedIn} of ${cls.attendees.length} checked in`}
        </Text>
        <Button
          label="Start check-in"
          variant="primary"
          size="sm"
          icon={<PlayCircle size={14} color="$textOnBrand" />}
          onPress={onOpen}
          accessibilityLabel={`Start check-in for ${cls.name}`}
        />
      </XStack>

      <YStack marginTop="$2">
        <Card
          variant="outlined"
          padding="sm"
          onPress={onOpen}
          accessibilityLabel={`View full roster for ${cls.name}`}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <Text variant="label">View full roster</Text>
            <ChevronRight size={16} color="$textMuted" />
          </XStack>
        </Card>
      </YStack>
    </Card>
  );
}

function RosterDetail({ cls }: { cls: ClassInstance }) {
  const checkedIn = cls.attendees.filter((a) => a.status === 'checked_in');
  const others = cls.attendees.filter((a) => a.status !== 'checked_in');
  return (
    <YStack gap="$3">
      <XStack gap="$2">
        <SummaryStat
          icon={<Check size={18} color="$success500" />}
          label="Checked in"
          value={checkedIn.length.toString()}
          flex={1}
        />
        <SummaryStat
          icon={<Clock size={18} color="$warning500" />}
          label="Pending"
          value={others.length.toString()}
          flex={1}
        />
        <SummaryStat
          icon={<Users size={18} color="$brand" />}
          label="Capacity"
          value={`${cls.attendees.length}/${cls.capacity}`}
          flex={1}
        />
      </XStack>

      <YStack gap="$2">
        <Text variant="h4">Checked in</Text>
        {checkedIn.length === 0 ? (
          <Text variant="bodySmall" color="muted">
            No one has checked in yet.
          </Text>
        ) : (
          checkedIn.map((a) => <RosterRow key={a.id} entry={a} />)
        )}
      </YStack>

      <YStack gap="$2" marginTop="$2">
        <Text variant="h4">Awaiting</Text>
        {others.length === 0 ? (
          <Text variant="bodySmall" color="muted">
            Everyone has checked in.
          </Text>
        ) : (
          others.map((a) => <RosterRow key={a.id} entry={a} />)
        )}
      </YStack>

      <YStack marginTop="$2">
        <Button
          label="Open scanner for this class"
          variant="primary"
          size="md"
          fullWidth
          icon={<PlayCircle size={18} color="$textOnBrand" />}
          onPress={() => {}}
          accessibilityLabel="Open scanner for this class"
        />
      </YStack>
    </YStack>
  );
}

function RosterRow({ entry }: { entry: RosterEntry }) {
  const colors: Record<RosterEntry['status'], { bg: string; fg: string; label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
    checked_in: { bg: '$success100', fg: '$success', label: 'In', tone: 'success' },
    booked: { bg: '$surfaceMuted', fg: '$textPrimary', label: 'Booked', tone: 'neutral' },
    late: { bg: '$warning100', fg: '$warning', label: entry.time ?? 'Late', tone: 'warning' },
    no_show: { bg: '$danger100', fg: '$danger', label: 'No-show', tone: 'danger' },
  };
  const c = colors[entry.status];
  return (
    <Card variant="outlined" padding="sm" accessibilityLabel={`${entry.name}, ${c.label}`}>
      <XStack alignItems="center" gap="$3">
        <Avatar name={entry.name} size="md" fallbackColor={c.fg} />
        <YStack flex={1} gap="$0.5">
          <Text variant="label" numberOfLines={1}>
            {entry.name}
          </Text>
          <Text variant="caption" color="muted">
            {entry.memberId}
          </Text>
        </YStack>
        <Badge label={c.label} variant={c.tone} />
      </XStack>
    </Card>
  );
}
