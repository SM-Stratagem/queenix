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
} from '@queenix/ui';
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

const TRAINER_AVATAR_COLOR = {
  PT: '$brand100',
  MA: '$success100',
  SK: '$warning100',
} as const;

const ROSTERS: Record<string, RosterEntry[]> = {
  c1: [
    { id: 'a1', name: 'Aisha Al-Mansoori', initials: 'AM', status: 'checked_in', memberId: 'QNX-08421' },
    { id: 'a2', name: 'Sara Al-Maktoum', initials: 'SM', status: 'checked_in', memberId: 'QNX-06550' },
    { id: 'a3', name: 'Daniel Pereira', initials: 'DP', status: 'booked', memberId: 'QNX-07209' },
    { id: 'a4', name: 'Priya Sharma', initials: 'PS', status: 'late', memberId: 'QNX-05833', time: '5 min late' },
    { id: 'a5', name: 'Khalifa Al-Suwaidi', initials: 'KS', status: 'booked', memberId: 'QNX-12044' },
    { id: 'a6', name: 'Mohammed Ali', initials: 'MA', status: 'no_show', memberId: 'QNX-10298' },
    { id: 'a7', name: 'Reem Al-Suwaidi', initials: 'RA', status: 'booked', memberId: 'QNX-13011' },
    { id: 'a8', name: 'Yusuf Khan', initials: 'YK', status: 'booked', memberId: 'QNX-09112' },
    { id: 'a9', name: 'Latifa Hassan', initials: 'LH', status: 'booked', memberId: 'QNX-14287' },
    { id: 'a10', name: 'Hala Al-Suwaidi', initials: 'HA', status: 'booked', memberId: 'QNX-15601' },
  ],
  c2: [
    { id: 'b1', name: 'Maryam Al-Falasi', initials: 'MA', status: 'checked_in', memberId: 'QNX-09833' },
    { id: 'b2', name: 'James Wilson', initials: 'JW', status: 'checked_in', memberId: 'QNX-07412' },
    { id: 'b3', name: 'Fatima Al-Zahra', initials: 'FZ', status: 'booked', memberId: 'QNX-11250' },
    { id: 'b4', name: 'Carlos Mendoza', initials: 'CM', status: 'booked', memberId: 'QNX-12904' },
    { id: 'b5', name: 'Aisha Patel', initials: 'AP', status: 'booked', memberId: 'QNX-08312' },
    { id: 'b6', name: 'Omar Al-Hashimi', initials: 'OH', status: 'no_show', memberId: 'QNX-10025' },
  ],
  c3: [
    { id: 'd1', name: 'Noura Al-Marri', initials: 'NM', status: 'booked', memberId: 'QNX-04418' },
    { id: 'd2', name: 'Vikram Iyer', initials: 'VI', status: 'booked', memberId: 'QNX-11733' },
    { id: 'd3', name: 'Anna Kowalski', initials: 'AK', status: 'booked', memberId: 'QNX-13822' },
    { id: 'd4', name: 'Rashid Al-Nuaimi', initials: 'RN', status: 'booked', memberId: 'QNX-06120' },
  ],
};

const CLASSES: ClassInstance[] = [
  {
    id: 'c1',
    name: 'Power Yoga',
    trainer: 'Maya Patel',
    trainerInitials: 'MP',
    startsAt: Date.now() + 30 * 60 * 1000,
    durationMin: 60,
    room: 'Studio 2',
    capacity: 12,
    attendees: ROSTERS.c1,
  },
  {
    id: 'c2',
    name: 'HIIT 45',
    trainer: 'Sam Khan',
    trainerInitials: 'SK',
    startsAt: Date.now() + 2.5 * 60 * 60 * 1000,
    durationMin: 45,
    room: 'Studio 1',
    capacity: 8,
    attendees: ROSTERS.c2,
  },
  {
    id: 'c3',
    name: 'Sunset Pilates',
    trainer: 'Maya Patel',
    trainerInitials: 'MP',
    startsAt: Date.now() + 5 * 60 * 60 * 1000,
    durationMin: 50,
    room: 'Rooftop',
    capacity: 6,
    attendees: ROSTERS.c3,
  },
];

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

  const checkedInCount = (c: ClassInstance) =>
    c.attendees.filter((a) => a.status === 'checked_in').length;
  const noShowCount = (c: ClassInstance) =>
    c.attendees.filter((a) => a.status === 'no_show').length;
  const lateCount = (c: ClassInstance) =>
    c.attendees.filter((a) => a.status === 'late').length;

  const totalLate = CLASSES.reduce((acc, c) => acc + lateCount(c), 0);
  const totalNoShow = CLASSES.reduce((acc, c) => acc + noShowCount(c), 0);

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
              value={CLASSES.reduce((acc, c) => acc + checkedInCount(c), 0).toString()}
              flex={1}
            />
            <SummaryStat
              icon={<Clock size={18} color="$warning500" />}
              label="Late"
              value={totalLate.toString()}
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
          <Text variant="h4">Today's classes</Text>
          {CLASSES.map((c) => (
            <ClassCard
              key={c.id}
              cls={c}
              checkedIn={checkedInCount(c)}
              late={lateCount(c)}
              noShow={noShowCount(c)}
              onOpen={() => setSelectedClass(c)}
            />
          ))}
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
        {cls.startsAt - Date.now() < 60 * 60 * 1000 && (
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
          {rosterPreview.map((a, i) => (
            <YStack key={a.id} marginLeft={i === 0 ? 0 : -10}>
              <Avatar
                name={a.name}
                size="sm"
                fallbackColor={a.status === 'checked_in' ? '$success' : '$info'}
              />
            </YStack>
          ))}
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
        {others.map((a) => (
          <RosterRow key={a.id} entry={a} />
        ))}
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
