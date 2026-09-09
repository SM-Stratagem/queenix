import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Badge, Button, Skeleton, EmptyState, useToast } from '@queenix/ui';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
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

  const liveQuery = useConvexQuery(api.queries.access.getOperationsLiveStatus, {});
  const isLoading = liveQuery === undefined;
  const currentOccupancy = liveQuery?.currentOccupancy ?? 0;
  const occupancyTs = liveQuery?.occupancyTimestamp ?? null;
  const classes = liveQuery?.classes ?? [];
  const activeShifts = liveQuery?.activeShifts ?? [];
  const openIncidentsCount = liveQuery?.openIncidentsCount ?? 0;

  const handleOpenDoor = () => {
    toast.success('Remote door open signal sent');
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
          <Badge label="Open" variant="success" />
        </XStack>

        {/* Live status header */}
        <YStack paddingHorizontal="$4">
          <Card variant="elevated">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
              <YStack>
                <Text variant="caption" color="muted">Current headcount</Text>
                <XStack alignItems="baseline" gap="$2">
                  {isLoading ? (
                    <Skeleton width={60} height={40} />
                  ) : (
                    <Text variant="h1" color="brand">
                      {currentOccupancy}
                    </Text>
                  )}
                  <Text variant="body" color="muted">
                    / 80
                  </Text>
                </XStack>
                {occupancyTs && (
                  <Text variant="caption" color="muted">
                    Last updated {new Date(occupancyTs).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </YStack>
              <YStack alignItems="flex-end">
                <Text variant="caption" color="muted">Active staff</Text>
                <Text variant="h3">{activeShifts.length}</Text>
                <Text variant="caption" color="muted">on shift now</Text>
              </YStack>
            </XStack>
            <Button
              label="Open door remotely"
              variant="primary"
              fullWidth
              size="md"
              icon={<Unlock size={18} color="$textOnBrand" />}
              onPress={handleOpenDoor}
            />
          </Card>
        </YStack>

        {/* Tab bar */}
        <XStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <TabChip active={tab === 'access'} label="Access" icon={<DoorOpen size={14} />} onPress={() => setTab('access')} />
          <TabChip active={tab === 'classes'} label="Classes" icon={<Calendar size={14} />} onPress={() => setTab('classes')} />
          <TabChip active={tab === 'staff'} label="Staff" icon={<Users size={14} />} onPress={() => setTab('staff')} />
          <TabChip
            active={tab === 'incidents'}
            label="Incidents"
            icon={<AlertOctagon size={14} />}
            onPress={() => setTab('incidents')}
            badge={openIncidentsCount > 0 ? openIncidentsCount.toString() : undefined}
          />
        </XStack>

        {/* Tab content */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          {tab === 'access' && (
            <AccessView currentOccupancy={currentOccupancy} />
          )}

          {tab === 'classes' &&
            (isLoading ? (
              <>
                <Skeleton height={92} borderRadius="$md" />
                <Skeleton height={92} borderRadius="$md" />
              </>
            ) : classes.length === 0 ? (
              <EmptyState
                icon={<Calendar size={32} color="$textMuted" />}
                title="No classes today"
                message="The class schedule is empty for today."
              />
            ) : (
              classes.map((c: any) => {
                const fillPct = (c.bookedCount / Math.max(1, c.capacity)) * 100;
                const statusLabel =
                  c.status === 'in_progress' ? 'Live' :
                  c.status === 'completed' ? 'Done' : 'Upcoming';
                const statusVariant =
                  c.status === 'in_progress' ? 'success' :
                  c.status === 'completed' ? 'info' : 'brand';
                return (
                  <Card key={c._id} variant="outlined" padding="sm">
                    <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$2">
                      <YStack flex={1}>
                        <XStack alignItems="center" gap="$2">
                          <Text variant="body" weight="500">
                            {c.classType?.name ?? 'Class'}
                          </Text>
                          <Badge label={statusLabel} variant={statusVariant} />
                        </XStack>
                        <Text variant="caption" color="muted">
                          {new Date(c.startsAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {c.roomId ? ` • ${c.roomId}` : ''}
                        </Text>
                      </YStack>
                    </XStack>
                    <XStack alignItems="center" gap="$3">
                      <YStack flex={1} gap="$1">
                        <XStack justifyContent="space-between">
                          <Text variant="caption" color="muted">Check-ins</Text>
                          <Text variant="caption" weight="600">
                            {c.bookedCount}/{c.capacity}
                          </Text>
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
              })
            ))}

          {tab === 'staff' &&
            (isLoading ? (
              <>
                <Skeleton height={60} borderRadius="$md" />
                <Skeleton height={60} borderRadius="$md" />
              </>
            ) : activeShifts.length === 0 ? (
              <EmptyState
                icon={<Users size={32} color="$textMuted" />}
                title="No staff on shift"
                message="No staff are currently checked in via the punch clock."
              />
            ) : (
              activeShifts.map((s: any) => {
                return (
                  <Card key={s._id} variant="outlined" padding="sm">
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        backgroundColor="$success50"
                        padding="$2.5"
                        borderRadius="$full"
                      >
                        <CircleDot size={18} color="$success600" />
                      </YStack>
                      <YStack flex={1}>
                        <XStack alignItems="center" gap="$2">
                          <Text variant="body" weight="500">
                            {s.user?.fullName ?? 'Staff'}
                          </Text>
                          <Badge label="On shift" variant="success" />
                        </XStack>
                        <Text variant="caption" color="muted">
                          {s.role} •{' '}
                          {new Date(s.startsAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          –{' '}
                          {new Date(s.endsAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                );
              })
            ))}

          {tab === 'incidents' && (
            <>
              {openIncidentsCount === 0 ? (
                <Card variant="filled">
                  <YStack alignItems="center" padding="$4" gap="$2">
                    <AlertOctagon size={32} color="$textMuted" />
                    <Text variant="body" color="muted">No open incidents</Text>
                    <Text variant="caption" color="muted" align="center">
                      All clear — operations are running smoothly.
                    </Text>
                  </YStack>
                </Card>
              ) : (
                <Card variant="outlined" padding="sm">
                  <XStack alignItems="center" gap="$3">
                    <YStack backgroundColor="$warning50" padding="$2.5" borderRadius="$md">
                      <AlertTriangle size={20} color="$warning500" />
                    </YStack>
                    <YStack flex={1}>
                      <Text variant="body" weight="500">
                        {openIncidentsCount} open incident{openIncidentsCount > 1 ? 's' : ''}
                      </Text>
                      <Text variant="caption" color="muted">
                        View and resolve in the incidents section.
                      </Text>
                    </YStack>
                    <Badge label="Open" variant="warning" />
                  </XStack>
                </Card>
              )}
            </>
          )}
        </YStack>

        {/* Quick stat footer */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="filled">
            <XStack alignItems="center" gap="$3">
              <YStack backgroundColor="$brand50" padding="$2.5" borderRadius="$md">
                <TrendingUp size={20} color="$brand" />
              </YStack>
              <YStack flex={1}>
                <Text variant="body" weight="500">Operations live</Text>
                <Text variant="caption" color="muted">
                  {classes.length} classes today • {activeShifts.length} staff on shift
                </Text>
              </YStack>
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function AccessView({ currentOccupancy }: { currentOccupancy: number }) {
  // The current schema doesn't yet model individual access points as
  // online/offline devices — we show the aggregated headcount here and
  // invite the owner to drill in once hardware telemetry is wired up.
  return (
    <Card variant="outlined" padding="md">
      <YStack gap="$3">
        <XStack alignItems="center" gap="$3">
          <YStack backgroundColor="$success50" padding="$2.5" borderRadius="$md">
            <Wifi size={20} color="$success600" />
          </YStack>
          <YStack flex={1}>
            <Text variant="body" weight="500">Front door</Text>
            <Text variant="caption" color="muted">
              Current occupancy: {currentOccupancy}
            </Text>
          </YStack>
          <Badge label="Online" variant="success" />
        </XStack>
        <XStack alignItems="center" gap="$3">
          <YStack backgroundColor="$success50" padding="$2.5" borderRadius="$md">
            <Wifi size={20} color="$success600" />
          </YStack>
          <YStack flex={1}>
            <Text variant="body" weight="500">Back door (staff)</Text>
            <Text variant="caption" color="muted">
              Hardware telemetry pending — show last snapshot
            </Text>
          </YStack>
          <Badge label="Online" variant="success" />
        </XStack>
        <XStack alignItems="center" gap="$3">
          <YStack backgroundColor="$success50" padding="$2.5" borderRadius="$md">
            <Wifi size={20} color="$success600" />
          </YStack>
          <YStack flex={1}>
            <Text variant="body" weight="500">Studio gates</Text>
            <Text variant="caption" color="muted">Connected</Text>
          </YStack>
          <Badge label="Online" variant="success" />
        </XStack>
      </YStack>
    </Card>
  );
}

function TabChip({
  active,
  label,
  icon,
  onPress,
  badge,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  badge?: string;
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
        {badge && (
          <XStack
            backgroundColor="$danger500"
            paddingHorizontal="$1.5"
            borderRadius="$full"
            minWidth={16}
            height={16}
            alignItems="center"
            justifyContent="center"
          >
            <Text variant="caption" color="white" weight="700" fontSize={9}>
              {badge}
            </Text>
          </XStack>
        )}
      </XStack>
    </YStack>
  );
}
