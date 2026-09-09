import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Badge, Button } from '@queenix/ui';
import { useToast } from '@queenix/ui';
import {
  DoorOpen,
  Users,
  AlertOctagon,
  Wifi,
  WifiOff,
  TrendingUp,
  Unlock,
  ChevronRight,
  CircleDot,
  AlertTriangle,
  Clock,
  Calendar,
} from '@tamagui/lucide-icons';

type Tab = 'access' | 'classes' | 'staff' | 'incidents';

export default function OwnerOperations() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('access');

  // Live header
  const facilityOpen = true;
  const headcount = 42;
  const maxCapacity = 80;
  const peakToday = 67;
  const peakTime = '8:30 PM';

  // Access points
  const accessPoints = [
    {
      id: 'front',
      name: 'Front door',
      online: true,
      lastEvent: 'Reem Al-Suwaidi — in, 2 min ago',
    },
    {
      id: 'back',
      name: 'Back door (staff)',
      online: false,
      lastEvent: 'Last seen 14 min ago',
    },
    {
      id: 'studio1',
      name: 'Studio 1',
      online: true,
      lastEvent: 'Power Yoga — 18/20 checked in',
    },
    {
      id: 'studio2',
      name: 'Studio 2',
      online: false,
      lastEvent: 'Last seen 8 min ago',
    },
    {
      id: 'pool',
      name: 'Pool gate',
      online: true,
      lastEvent: 'Quiet — no current session',
    },
  ];

  // Classes today
  const classes = [
    { name: 'Power Yoga', trainer: 'Maya Patel', time: '7:00 AM', booked: 18, capacity: 20, status: 'completed' as const },
    { name: 'HIIT 45', trainer: 'Sarah Khalil', time: '9:30 AM', booked: 14, capacity: 16, status: 'completed' as const },
    { name: 'Pilates Reformer', trainer: 'Layla Najim', time: '12:00 PM', booked: 8, capacity: 10, status: 'in_progress' as const },
    { name: 'Strength Lab', trainer: 'Maya Patel', time: '6:00 PM', booked: 11, capacity: 15, status: 'upcoming' as const },
    { name: 'Sunset Yoga', trainer: 'Sarah Khalil', time: '8:00 PM', booked: 6, capacity: 20, status: 'upcoming' as const },
  ];

  // Staff on shift
  const staff = [
    { name: 'Sarah Khalil', role: 'Senior Trainer', shift: '6 AM – 2 PM', status: 'on_floor' as const },
    { name: 'Maya Patel', role: 'Yoga Lead', shift: '10 AM – 8 PM', status: 'on_floor' as const },
    { name: 'Aisha Hassan', role: 'Front Desk', shift: '7 AM – 3 PM', status: 'on_floor' as const },
    { name: 'Reem Al-Suwaidi', role: 'Housekeeping Lead', shift: '9 AM – 5 PM', status: 'break' as const },
    { name: 'Maryam Al-Falasi', role: 'Trainer', shift: '2 PM – 10 PM', status: 'scheduled' as const },
  ];

  // Incidents
  const incidents = [
    {
      id: 1,
      title: 'Member reported equipment damage',
      location: 'Studio 1 — treadmill 3',
      severity: 'medium' as const,
      reported: '32 min ago',
      status: 'investigating' as const,
    },
    {
      id: 2,
      title: 'Air conditioning unit — weak airflow',
      location: 'Cardio zone',
      severity: 'low' as const,
      reported: '1 hr ago',
      status: 'pending' as const,
    },
    {
      id: 3,
      title: 'Lost & found — designer sunglasses',
      location: 'Reception',
      severity: 'low' as const,
      reported: '2 hr ago',
      status: 'pending' as const,
    },
  ];

  const handleOpenDoor = (member: string) => {
    toast.success(`Door opened for ${member}`);
  };

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
            <Text variant="caption" color="muted">Live operations</Text>
            <Text variant="h2">Today</Text>
          </YStack>
          <Badge
            label={facilityOpen ? 'Open' : 'Closed'}
            variant={facilityOpen ? 'success' : 'danger'}
          />
        </XStack>

        {/* Live status header */}
        <YStack paddingHorizontal="$4">
          <Card variant="elevated">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <YStack>
                <Text variant="caption" color="muted">Current headcount</Text>
                <XStack alignItems="baseline" gap="$2">
                  <Text variant="h1" color="brand">{headcount}</Text>
                  <Text variant="body" color="muted">/ {maxCapacity}</Text>
                </XStack>
              </YStack>
              <YStack alignItems="flex-end">
                <Text variant="caption" color="muted">Peak today</Text>
                <Text variant="h3">{peakToday}</Text>
                <Text variant="caption" color="muted">at {peakTime}</Text>
              </YStack>
            </XStack>
            <Button
              label="Open door remotely"
              variant="primary"
              fullWidth
              size="md"
              icon={<Unlock size={18} color="$textOnBrand" />}
              onPress={() => handleOpenDoor('Aisha Hassan')}
            />
          </Card>
        </YStack>

        {/* Tab bar */}
        <XStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <TabChip active={tab === 'access'} label="Access" icon={<DoorOpen size={14} />} onPress={() => setTab('access')} />
          <TabChip active={tab === 'classes'} label="Classes" icon={<Calendar size={14} />} onPress={() => setTab('classes')} />
          <TabChip active={tab === 'staff'} label="Staff" icon={<Users size={14} />} onPress={() => setTab('staff')} />
          <TabChip active={tab === 'incidents'} label="Incidents" icon={<AlertOctagon size={14} />} onPress={() => setTab('incidents')} />
        </XStack>

        {/* Tab content */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          {tab === 'access' && accessPoints.map((p) => (
            <Card key={p.id} variant="outlined" padding="sm">
              <XStack alignItems="center" gap="$3">
                <YStack
                  backgroundColor={p.online ? '$success50' : '$danger50'}
                  padding="$2.5"
                  borderRadius="$md"
                >
                  {p.online ? (
                    <Wifi size={20} color="$success600" />
                  ) : (
                    <WifiOff size={20} color="$danger500" />
                  )}
                </YStack>
                <YStack flex={1}>
                  <XStack alignItems="center" gap="$2">
                    <Text variant="body" weight="500">{p.name}</Text>
                    <Badge
                      label={p.online ? 'Online' : 'Offline'}
                      variant={p.online ? 'success' : 'danger'}
                    />
                  </XStack>
                  <Text variant="caption" color="muted">{p.lastEvent}</Text>
                </YStack>
                <ChevronRight size={18} color="$textMuted" />
              </XStack>
            </Card>
          ))}

          {tab === 'classes' && classes.map((c, i) => {
            const fillPct = (c.booked / c.capacity) * 100;
            const statusVariant =
              c.status === 'in_progress' ? 'success' :
              c.status === 'completed' ? 'info' : 'brand';
            const statusLabel =
              c.status === 'in_progress' ? 'Live now' :
              c.status === 'completed' ? 'Done' : 'Upcoming';
            return (
              <Card key={i} variant="outlined" padding="sm">
                <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$2">
                  <YStack flex={1}>
                    <XStack alignItems="center" gap="$2">
                      <Text variant="body" weight="500">{c.name}</Text>
                      <Badge label={statusLabel} variant={statusVariant} />
                    </XStack>
                    <Text variant="caption" color="muted">with {c.trainer} • {c.time}</Text>
                  </YStack>
                </XStack>
                <XStack alignItems="center" gap="$3">
                  <YStack flex={1} gap="$1">
                    <XStack justifyContent="space-between">
                      <Text variant="caption" color="muted">Check-ins</Text>
                      <Text variant="caption" weight="600">{c.booked}/{c.capacity}</Text>
                    </XStack>
                    <YStack height={6} backgroundColor="$surfaceMuted" borderRadius="$full" overflow="hidden">
                      <YStack
                        height="100%"
                        width={`${fillPct}%`}
                        backgroundColor={fillPct > 85 ? '$warning500' : '$brand'}
                      />
                    </YStack>
                  </YStack>
                </XStack>
              </Card>
            );
          })}

          {tab === 'staff' && staff.map((s, i) => {
            const statusVariant =
              s.status === 'on_floor' ? 'success' :
              s.status === 'break' ? 'warning' : 'info';
            const statusLabel =
              s.status === 'on_floor' ? 'On floor' :
              s.status === 'break' ? 'On break' : 'Scheduled';
            return (
              <Card key={i} variant="outlined" padding="sm">
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor={
                      s.status === 'on_floor' ? '$success50' :
                      s.status === 'break' ? '$warning50' : '$surfaceMuted'
                    }
                    padding="$2.5"
                    borderRadius="$full"
                  >
                    <CircleDot
                      size={18}
                      color={
                        s.status === 'on_floor' ? '$success600' :
                        s.status === 'break' ? '$warning600' : '$textMuted'
                      }
                    />
                  </YStack>
                  <YStack flex={1}>
                    <XStack alignItems="center" gap="$2">
                      <Text variant="body" weight="500">{s.name}</Text>
                      <Badge label={statusLabel} variant={statusVariant} />
                    </XStack>
                    <Text variant="caption" color="muted">{s.role} • {s.shift}</Text>
                  </YStack>
                </XStack>
              </Card>
            );
          })}

          {tab === 'incidents' && incidents.length === 0 && (
            <Card variant="filled">
              <YStack alignItems="center" padding="$4" gap="$2">
                <AlertOctagon size={32} color="$textMuted" />
                <Text variant="body" color="muted">No open incidents</Text>
              </YStack>
            </Card>
          )}

          {tab === 'incidents' && incidents.map((inc) => {
            const sevVariant =
              inc.severity === 'high' ? 'danger' :
              inc.severity === 'medium' ? 'warning' : 'info';
            const statusVariant = inc.status === 'investigating' ? 'warning' : 'danger';
            return (
              <Card key={inc.id} variant="outlined" padding="sm">
                <XStack alignItems="flex-start" gap="$3">
                  <YStack
                    backgroundColor={inc.severity === 'high' ? '$danger50' : inc.severity === 'medium' ? '$warning50' : '$surfaceMuted'}
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    <AlertTriangle
                      size={20}
                      color={inc.severity === 'high' ? '$danger500' : inc.severity === 'medium' ? '$warning500' : '$textSecondary'}
                    />
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <XStack alignItems="center" gap="$2" flexWrap="wrap">
                      <Text variant="body" weight="500">{inc.title}</Text>
                      <Badge label={inc.severity} variant={sevVariant} />
                    </XStack>
                    <Text variant="caption" color="muted">{inc.location}</Text>
                    <XStack alignItems="center" gap="$2" marginTop="$1">
                      <Clock size={12} color="$textMuted" />
                      <Text variant="caption" color="muted">{inc.reported}</Text>
                      <Badge label={inc.status} variant={statusVariant} />
                    </XStack>
                  </YStack>
                </XStack>
              </Card>
            );
          })}
        </YStack>

        {/* Quick stat footer */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="filled">
            <XStack alignItems="center" gap="$3">
              <YStack
                backgroundColor="$brand50"
                padding="$2.5"
                borderRadius="$md"
              >
                <TrendingUp size={20} color="$brand" />
              </YStack>
              <YStack flex={1}>
                <Text variant="body" weight="500">Busy hour coming up</Text>
                <Text variant="caption" color="muted">Expect 60+ check-ins between 6–8 PM</Text>
              </YStack>
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function TabChip({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <YStack
      flex={1}
      paddingVertical="$2.5"
      paddingHorizontal="$2"
      alignItems="center"
      gap="$1"
      borderRadius="$lg"
      backgroundColor={active ? '$brand' : '$surfaceMuted'}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      pressStyle={{ opacity: 0.85 }}
    >
      <XStack alignItems="center" gap="$1.5">
        {React.cloneElement(icon as React.ReactElement<{ color?: string }>, {
          color: active ? '$textOnBrand' : '$textSecondary',
        })}
        <Text
          variant="bodySmall"
          weight="600"
          color={active ? '$textOnBrand' : '$textSecondary'}
        >
          {label}
        </Text>
      </XStack>
    </YStack>
  );
}
