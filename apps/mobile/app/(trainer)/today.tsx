import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Logo,
  Spacer,
  Progress,
  useToast,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import {
  Clock,
  Users,
  Calendar,
  Play,
  FileText,
  CalendarPlus,
  Ban,
  Plane,
  ChevronRight,
  CheckCircle2,
} from '@tamagui/lucide-icons';

type SessionStatus = 'completed' | 'in-progress' | 'upcoming';

interface TodaySession {
  id: string;
  startTime: string; // "08:00"
  endTime: string;
  memberName: string;
  memberAvatarSeed: string;
  type: 'PT' | 'Class';
  durationMin: number;
  status: SessionStatus;
  room?: string;
}

const mockSessions: TodaySession[] = [
  {
    id: 's1',
    startTime: '07:00',
    endTime: '08:00',
    memberName: 'Amna Al-Mazrouei',
    memberAvatarSeed: 'Amna Al-Mazrouei',
    type: 'PT',
    durationMin: 60,
    status: 'completed',
    room: 'Studio 1',
  },
  {
    id: 's2',
    startTime: '08:30',
    endTime: '09:15',
    memberName: 'Fatima Saeed',
    memberAvatarSeed: 'Fatima Saeed',
    type: 'Class',
    durationMin: 45,
    status: 'completed',
    room: 'Studio 2',
  },
  {
    id: 's3',
    startTime: '10:00',
    endTime: '11:00',
    memberName: 'Hala Al-Suwaidi',
    memberAvatarSeed: 'Hala Al-Suwaidi',
    type: 'PT',
    durationMin: 60,
    status: 'in-progress',
    room: 'Studio 1',
  },
  {
    id: 's4',
    startTime: '12:00',
    endTime: '13:00',
    memberName: 'Mariam Al-Hashimi',
    memberAvatarSeed: 'Mariam Al-Hashimi',
    type: 'PT',
    durationMin: 60,
    status: 'upcoming',
    room: 'Studio 1',
  },
  {
    id: 's5',
    startTime: '17:30',
    endTime: '18:30',
    memberName: 'Noora Al-Naimi',
    memberAvatarSeed: 'Noora Al-Naimi',
    type: 'Class',
    durationMin: 60,
    status: 'upcoming',
    room: 'Studio 2',
  },
  {
    id: 's6',
    startTime: '19:00',
    endTime: '20:00',
    memberName: 'Sara Al-Marri',
    memberAvatarSeed: 'Sara Al-Marri',
    type: 'PT',
    durationMin: 60,
    status: 'upcoming',
    room: 'Studio 1',
  },
];

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStatusVariant(status: SessionStatus): 'success' | 'brand' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'in-progress') return 'brand';
  return 'neutral';
}

function getStatusLabel(status: SessionStatus): string {
  if (status === 'completed') return 'Completed';
  if (status === 'in-progress') return 'In progress';
  return 'Upcoming';
}

export default function TrainerToday() {
  const router = useRouter();
  const { session } = useAuth();
  const toast = useToast();

  const greeting = getTimeGreeting();
  const firstName = session?.fullName?.split(' ')[0] ?? 'Trainer';

  const stats = {
    sessions: mockSessions.length,
    hours: mockSessions.reduce((acc, s) => acc + s.durationMin, 0) / 60,
    clientsSeen: mockSessions.filter((s) => s.status === 'completed').length,
  };

  const handleQuickAction = (label: string) => {
    toast.info(`${label} — coming soon`);
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <XStack
          paddingTop="$4"
          paddingHorizontal="$4"
          paddingBottom="$3"
          alignItems="center"
          justifyContent="space-between"
        >
          <YStack>
            <Text variant="caption" color="muted">
              {greeting}
            </Text>
            <Text variant="h2">{firstName}</Text>
          </YStack>
          <Logo size="sm" />
        </XStack>

        {/* Hero stats */}
        <YStack paddingHorizontal="$4">
          <Card variant="elevated" padding="lg">
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack>
                  <Text variant="caption" color="secondary" textTransform="uppercase">
                    Today
                  </Text>
                  <Text variant="h3" marginTop="$1">
                    Your training day
                  </Text>
                </YStack>
                <Badge label="On shift" variant="success" />
              </XStack>
              <XStack gap="$3" marginTop="$2">
                <HeroStat
                  icon={<Calendar size={18} color="$brand" />}
                  value={stats.sessions.toString()}
                  label="Sessions"
                  flex={1}
                />
                <HeroStat
                  icon={<Clock size={18} color="$brand" />}
                  value={`${stats.hours}h`}
                  label="Hours booked"
                  flex={1}
                />
                <HeroStat
                  icon={<Users size={18} color="$brand" />}
                  value={`${stats.clientsSeen}/${mockSessions.length}`}
                  label="Clients seen"
                  flex={1}
                />
              </XStack>
            </YStack>
          </Card>
        </YStack>

        {/* Quick actions */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$3">
            Quick actions
          </Text>
          <XStack gap="$3">
            <QuickAction
              icon={<CalendarPlus size={20} color="$textOnBrand" />}
              label="Add availability"
              onPress={() => handleQuickAction('Add availability')}
              flex={1}
            />
            <QuickAction
              icon={<Ban size={20} color="$textOnBrand" />}
              label="Mark unavailable"
              onPress={() => handleQuickAction('Mark unavailable')}
              flex={1}
            />
            <QuickAction
              icon={<Plane size={20} color="$textOnBrand" />}
              label="Request day off"
              onPress={() => handleQuickAction('Request day off')}
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Today's schedule */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Today's schedule</Text>
            <Text
              variant="bodySmall"
              color="brand"
              onPress={() => router.push('/(trainer)/schedule')}
              accessibilityLabel="Open weekly schedule"
            >
              View week
            </Text>
          </XStack>
          <YStack gap="$2">
            {mockSessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onStart={() => toast.success(`Started ${s.type} with ${s.memberName}`)}
                onViewNotes={() => toast.info(`Notes for ${s.memberName}`)}
              />
            ))}
          </YStack>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function HeroStat({
  icon,
  value,
  label,
  flex,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  flex?: number;
}) {
  return (
    <YStack
      flex={flex}
      gap="$1"
      backgroundColor="$surfaceMuted"
      padding="$3"
      borderRadius="$md"
    >
      <XStack>{icon}</XStack>
      <Text variant="h3">{value}</Text>
      <Text variant="caption" color="muted">
        {label}
      </Text>
    </YStack>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  flex,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  flex?: number;
}) {
  return (
    <YStack
      flex={flex}
      alignItems="center"
      gap="$2"
      onPress={onPress}
      pressStyle={{ opacity: 0.7, scale: 0.97 }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <YStack
        backgroundColor="$brand"
        padding="$3"
        borderRadius="$xl"
        alignItems="center"
        justifyContent="center"
        width={56}
        height={56}
      >
        {icon}
      </YStack>
      <Text variant="caption" weight="600" align="center">
        {label}
      </Text>
    </YStack>
  );
}

function SessionRow({
  session,
  onStart,
  onViewNotes,
}: {
  session: TodaySession;
  onStart: () => void;
  onViewNotes: () => void;
}) {
  const variant = getStatusVariant(session.status);
  const statusLabel = getStatusLabel(session.status);

  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={
        session.status === 'upcoming'
          ? onStart
          : session.status === 'in-progress'
            ? onStart
            : onViewNotes
      }
      accessibilityLabel={`${session.type} with ${session.memberName} at ${session.startTime}, ${statusLabel}`}
    >
      <XStack alignItems="center" gap="$3">
        <YStack alignItems="center" width={56} gap="$0.5">
          <Text variant="h4" color={session.status === 'completed' ? 'muted' : 'primary'}>
            {session.startTime}
          </Text>
          <Text variant="caption" color="muted">
            {session.durationMin}m
          </Text>
        </YStack>
        <YStack
          width={3}
          alignSelf="stretch"
          backgroundColor={
            session.type === 'PT' ? '$brand' : '$success500'
          }
          borderRadius="$full"
        />
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2">
            <Text variant="label" textDecorationLine={session.status === 'completed' ? 'line-through' : 'none'}>
              {session.memberName}
            </Text>
            <Badge
              label={session.type}
              variant={session.type === 'PT' ? 'brand' : 'success'}
              size="sm"
            />
          </XStack>
          <Text variant="caption" color="muted">
            {session.startTime}–{session.endTime}
            {session.room ? ` • ${session.room}` : ''}
          </Text>
          <XStack marginTop="$1">
            <Badge label={statusLabel} variant={variant} size="sm" />
          </XStack>
        </YStack>
        <YStack>
          {session.status === 'upcoming' ? (
            <Button
              label="Start"
              size="sm"
              variant="primary"
              onPress={onStart}
              icon={<Play size={14} color="$textOnBrand" />}
            />
          ) : session.status === 'in-progress' ? (
            <Button
              label="Resume"
              size="sm"
              variant="primary"
              onPress={onStart}
            />
          ) : (
            <XStack
              onPress={onViewNotes}
              pressStyle={{ opacity: 0.6 }}
              accessibilityRole="button"
              accessibilityLabel="View session notes"
              padding="$2"
            >
              <FileText size={20} color="$textMuted" />
            </XStack>
          )}
        </YStack>
      </XStack>
    </Card>
  );
}
