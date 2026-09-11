import React, { useState, useEffect, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Badge,
  Button,
  Header,
  Divider,
  Sheet,
  Switch,
  Skeleton,
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import {
  Play,
  StopCircle,
  Bell,
  FileText,
  LogOut,
  Clock,
  Calendar,
  Phone,
  Mail,
  IdCard,
  ShieldCheck,
  Check,
  X,
  Crown,
  User as UserIcon,
  Dumbbell,
  Building2,
  Fingerprint,
} from '@tamagui/lucide-icons';
import { ContactRow, type Shift } from '@/components/profile/ContactRow';
import { ShiftStat } from '@/components/profile/ShiftStat';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { ShiftRow } from '@/components/profile/ShiftRow';

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function useElapsedSeconds(active: boolean, startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active || !startedAt) {
      setElapsed(0);
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);
  return elapsed;
}

type RoleOption = 'member' | 'trainer' | 'owner' | 'operations';

const ROLE_META: Record<RoleOption, { label: string; icon: React.ReactNode; description: string }> = {
  member: { label: 'Member', icon: <UserIcon size={16} color="$brand" />, description: 'Personal training, classes, profile' },
  trainer: { label: 'Trainer', icon: <Dumbbell size={16} color="$brand" />, description: 'Today, schedule, clients, earnings' },
  owner: { label: 'Owner', icon: <Building2 size={16} color="$brand" />, description: 'KPIs, operations, members, approvals' },
  operations: { label: 'Operations', icon: <ShieldCheck size={16} color="$brand" />, description: 'Scanner, classes, support, incidents' },
};

export default function OpsProfileScreen() {
  const router = useRouter();
  const { session, signOut, switchRole } = useAuth();
  const toast = useToast();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [handoverText, setHandoverText] = useState(
    'Two members flagged for follow-up: Mohammed Ali (INC-2028) and Priya Sharma (QNX-4921).'
  );

  const activeShift = useConvexQuery(api.queries.users.getMyActiveShift, {});
  const shifts = useConvexQuery(api.queries.users.getMyShifts, { limit: 10 });

  const startShift = useConvexMutation(api.mutations.operations.startShift);
  const endShift = useConvexMutation(api.mutations.operations.endShift);
  const switchRoleMutation = useConvexMutation(api.mutations.users.switchRole);

  const shiftStart = activeShift?.startsAt ?? null;
  const shiftActive = Boolean(activeShift);
  const elapsed = useElapsedSeconds(shiftActive, shiftStart);

  const handleStartShift = async () => {
    try {
      await startShift({ role: 'front_desk' });
      toast.success('Shift started');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to start shift');
    }
  };

  const handleEndShift = async () => {
    try {
      await endShift({});
      toast.success('Shift ended');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to end shift');
    }
  };

  const handleSwitchRole = async (role: RoleOption) => {
    if (!session?.roles.includes(role)) {
      toast.error(`You don't have the ${role} role`);
      return;
    }
    try {
      await switchRoleMutation({ role });
      await switchRole(role);
      toast.success(`Switched to ${ROLE_META[role].label}`);
      setRoleSheetOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to switch role');
    }
  };

  // Map Convex shifts → UI shape
  const shiftHistory: Shift[] = useMemo(() => {
    if (!shifts) return [];
    return (shifts as any[]).map((s) => {
      const start = s.startsAt as number;
      const end = (s.endsAt as number) ?? Date.now();
      const completed = s.status === 'completed';
      const active = s.status === 'active';
      return {
        id: s._id,
        date: formatDate(start),
        start: formatTime(start),
        end: active ? '—' : formatTime(end),
        hoursLogged: formatDuration(end - start),
        status: active ? 'active' : completed ? 'completed' : 'upcoming',
      };
    });
  }, [shifts]);

  const thisWeekMs = useMemo(() => {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    return (shifts ?? [])
      .filter((s: any) => s.status === 'completed' && Date.now() - s.startsAt < oneWeek)
      .reduce((acc: number, s: any) => acc + ((s.endsAt ?? Date.now()) - s.startsAt), 0);
  }, [shifts]);

  return (
    <Screen padded={false}>
      <Header title="Profile" subtitle="Operations role" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Identity card */}
        <YStack paddingHorizontal="$4" marginTop="$2">
          <Card variant="elevated" padding="lg">
            <XStack alignItems="center" gap="$3">
              <Avatar
                name={session?.fullName ?? 'Hala Al-Suwaidi'}
                size="xl"
                src={session?.avatarUrl}
                fallbackColor="$brand"
              />
              <YStack flex={1} gap="$1">
                <Text variant="h2" numberOfLines={1}>
                  {session?.fullName ?? 'Hala Al-Suwaidi'}
                </Text>
                <XStack alignItems="center" gap="$2" flexWrap="wrap">
                  <Badge label="Operations" variant="info" />
                  <Badge label="Front desk" variant="neutral" />
                </XStack>
                <Text variant="caption" color="muted">
                  ID OPS-{(session?.userId ?? '').slice(-5).toUpperCase() || '40219'}
                </Text>
              </YStack>
            </XStack>
            <Divider marginVertical="$3" />
            <YStack gap="$2">
              <ContactRow
                icon={<Mail size={14} color="$textMuted" />}
                label="Email"
                value={session?.email ?? 'hala.alsuwaidi@queenix.ae'}
              />
              <ContactRow
                icon={<Phone size={14} color="$textMuted" />}
                label="Phone"
                value="+971 50 882 4710"
              />
              <ContactRow
                icon={<IdCard size={14} color="$textMuted" />}
                label="Employee since"
                value="March 2024"
              />
            </YStack>
          </Card>
        </YStack>

        {/* Shift panel */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$2">Current shift</Text>
          <Card
            variant="elevated"
            padding="md"
            backgroundColor={shiftActive ? '$brand50' : '$surface'}
          >
            <XStack justifyContent="space-between" alignItems="center">
              <YStack gap="$0.5">
                <Text variant="caption" color="muted" textTransform="uppercase">
                  {shiftActive ? 'On shift' : 'Off shift'}
                </Text>
                <Text variant="h2" color={shiftActive ? 'brand' : 'primary'}>
                  {shiftActive
                    ? formatElapsed(elapsed)
                    : 'Not started'}
                </Text>
                {shiftActive && shiftStart && (
                  <XStack alignItems="center" gap="$1.5">
                    <Clock size={12} color="$brand" />
                    <Text variant="caption" color="brand" weight="600">
                      Started at {formatTime(shiftStart)}
                    </Text>
                  </XStack>
                )}
              </YStack>
              <YStack
                width={48}
                height={48}
                borderRadius="$full"
                alignItems="center"
                justifyContent="center"
                backgroundColor={shiftActive ? '$danger' : '$brand'}
                accessibilityLabel={shiftActive ? 'Shift in progress' : 'Shift not started'}
              >
                {shiftActive ? (
                  <StopCircle size={24} color="$textOnBrand" />
                ) : (
                  <Play size={24} color="$textOnBrand" />
                )}
              </YStack>
            </XStack>
            <YStack marginTop="$3">
              {shiftActive ? (
                <Button
                  label="End shift"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleEndShift}
                  accessibilityLabel="End current shift"
                />
              ) : (
                <Button
                  label="Start shift"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={handleStartShift}
                  accessibilityLabel="Start a new shift"
                />
              )}
            </YStack>
            <XStack alignItems="center" gap="$2" marginTop="$3">
              <ShieldCheck size={14} color="$success500" />
              <Text variant="caption" color="secondary">
                Geofenced to Queenix Dubai Marina
              </Text>
            </XStack>
          </Card>
        </YStack>

        {/* Stats row */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack gap="$3">
            <ShiftStat
              icon={<Clock size={18} color="$brand" />}
              label="This week"
              value={formatDuration(thisWeekMs)}
              flex={1}
            />
            <ShiftStat
              icon={<Calendar size={18} color="$success500" />}
              label="Shifts"
              value={`${shiftHistory.filter((s) => s.status === 'completed').length}`}
              flex={1}
            />
            <ShiftStat
              icon={<Check size={18} color="$info500" />}
              label="Active"
              value={shiftActive ? 'Yes' : 'No'}
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Settings */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$2">Settings</Text>
          <YStack gap="$2">
            <SettingsRow
              icon={<Fingerprint size={18} color="$textPrimary" />}
              label="Punch clock"
              description="In/out, hours today & this week"
              onPress={() => router.push('/(ops)/punch')}
            />
            <SettingsRow
              icon={<Bell size={18} color="$textPrimary" />}
              label="Push notifications"
              description="Door alerts, incidents, shift reminders"
              right={
                <Switch
                  value={notifEnabled}
                  onValueChange={setNotifEnabled}
                  accessibilityLabel="Toggle push notifications"
                />
              }
            />
            <SettingsRow
              icon={<FileText size={18} color="$textPrimary" />}
              label="Handover notes"
              description="Leave notes for the next shift"
              onPress={() => setHandoverOpen(true)}
            />
            <SettingsRow
              icon={<ShieldCheck size={18} color="$textPrimary" />}
              label="Documents"
              description="Certifications, ID, contracts"
              onPress={() => {}}
            />
            <SettingsRow
              icon={<Crown size={18} color="$textPrimary" />}
              label="Switch role"
              description={session ? `Current: ${ROLE_META[session.activeRole].label}` : 'Pick a different role'}
              onPress={() => setRoleSheetOpen(true)}
            />
          </YStack>
        </YStack>

        {/* Shift history */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
            <Text variant="h4">Shift history</Text>
            <Text variant="bodySmall" color="brand" onPress={() => toast.info('Export coming soon')}>
              Export
            </Text>
          </XStack>
          {shifts === undefined ? (
            <YStack gap="$2">
              <Skeleton height={64} borderRadius={12} />
              <Skeleton height={64} borderRadius={12} />
              <Skeleton height={64} borderRadius={12} />
            </YStack>
          ) : shifts === null ? (
            <ErrorState onRetry={() => {}} />
          ) : shiftHistory.length === 0 ? (
            <Card variant="outlined" padding="md">
              <Text variant="bodySmall" color="muted" textAlign="center">
                No shifts yet. Tap "Start shift" to begin your first one.
              </Text>
            </Card>
          ) : (
            <YStack gap="$2">
              {shiftHistory.map((s) => (
                <ShiftRow key={s.id} shift={s} />
              ))}
            </YStack>
          )}
        </YStack>

        {/* Sign out */}
        <YStack paddingHorizontal="$4" marginTop="$5">
          <Button
            label="Sign out"
            variant="outline"
            size="md"
            fullWidth
            icon={<LogOut size={18} color="$danger500" />}
            onPress={() => signOut()}
            accessibilityLabel="Sign out of operations account"
          />
          <Text variant="caption" color="muted" textAlign="center" marginTop="$3">
            Queenix Operations • v1.0.0
          </Text>
        </YStack>
      </ScrollView>

      {/* Handover notes sheet */}
      <Sheet open={handoverOpen} onOpenChange={setHandoverOpen}>
        <YStack gap="$3">
          <YStack gap="$0.5" marginBottom="$1">
            <Text variant="h2">Handover notes</Text>
            <Text variant="bodySmall" color="secondary">
              Visible to the next shift
            </Text>
          </YStack>
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Notes
            </Text>
            <YStack
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius="$md"
              padding="$3"
              backgroundColor="$surface"
              minHeight={160}
            >
              <textarea
                value={handoverText}
                onChange={(e: any) => setHandoverText(e.target.value)}
                placeholder="Anything the next team should know…"
                style={{
                  width: '100%',
                  minHeight: 140,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 14,
                  color: 'inherit',
                  fontFamily: 'inherit',
                  resize: 'none',
                }}
                aria-label="Handover note text"
              />
            </YStack>
          </YStack>
          <XStack gap="$2">
            <Button
              label="Discard"
              variant="outline"
              size="md"
              flex={1}
              icon={<X size={16} color="$textPrimary" />}
              onPress={() => setHandoverOpen(false)}
              accessibilityLabel="Discard handover note"
            />
            <Button
              label="Save note"
              variant="primary"
              size="md"
              flex={1}
              icon={<Check size={16} color="$textOnBrand" />}
              onPress={() => {
                toast.success('Handover saved');
                setHandoverOpen(false);
              }}
              accessibilityLabel="Save handover note"
            />
          </XStack>
        </YStack>
      </Sheet>

      {/* Switch role sheet */}
      <Sheet open={roleSheetOpen} onOpenChange={setRoleSheetOpen}>
        <YStack gap="$3">
          <YStack gap="$0.5" marginBottom="$1">
            <Text variant="h2">Switch role</Text>
            <Text variant="bodySmall" color="secondary">
              Pick which dashboard to open
            </Text>
          </YStack>
          {(['member', 'trainer', 'owner', 'operations'] as RoleOption[]).map((r) => {
            const hasRole = session?.roles.includes(r) ?? false;
            const active = session?.activeRole === r;
            return (
              <Card
                key={r}
                variant={active ? 'elevated' : 'outlined'}
                padding="md"
                backgroundColor={active ? '$brand50' : undefined}
                onPress={() => hasRole && handleSwitchRole(r)}
                accessibilityLabel={`Switch to ${ROLE_META[r].label} role`}
                accessibilityState={{ disabled: !hasRole }}
              >
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor={active ? '$brand' : '$surfaceMuted'}
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    {ROLE_META[r].icon}
                  </YStack>
                  <YStack flex={1}>
                    <Text variant="label" weight="600">
                      {ROLE_META[r].label}
                      {active ? ' (current)' : ''}
                    </Text>
                    <Text variant="caption" color="muted">
                      {ROLE_META[r].description}
                    </Text>
                    {!hasRole && (
                      <Text variant="caption" color="warning">
                        Not enabled on your account
                      </Text>
                    )}
                  </YStack>
                  {active && <Check size={18} color="$brand" />}
                </XStack>
              </Card>
            );
          })}
        </YStack>
      </Sheet>
    </Screen>
  );
}
