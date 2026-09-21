import React, { useState, useEffect, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Header,
  Button,
  Skeleton,
  ErrorState,
  Switch,
  useToast,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import {
  LogOut,
  Bell,
  FileText,
  ShieldCheck,
  Crown,
  User as UserIcon,
  Dumbbell,
  Building2,
  Calendar,
  Clock,
  Check,
  Fingerprint,
} from '@tamagui/lucide-icons';
import {
  IdentityCard,
  type ProfileIdentity,
} from '@/components/profile/IdentityCard';
import {
  formatTime,
  formatDate,
  formatDuration,
} from '@/components/profile/format';
import { ShiftStat } from '@/components/profile/ShiftStat';
import { SettingsRow } from '@/components/profile/SettingsRow';
import { ShiftRow } from '@/components/profile/ShiftRow';
import type { Shift } from '@/components/profile/ContactRow';
import { ShiftPanel } from '@/components/profile/ShiftPanel';
import {
  HandoverSheet,
  RoleSwitcherSheet,
  type RoleMeta,
} from '@/components/profile/sheets';

type RoleOption = 'member' | 'trainer' | 'finance' | 'owner' | 'operations';

const ROLE_META: RoleMeta[] = [
  { key: 'member', label: 'Member', description: 'Personal training, classes, profile', icon: <UserIcon size={16} color="$brand" /> },
  { key: 'trainer', label: 'Trainer', description: 'Today, schedule, clients, earnings', icon: <Dumbbell size={16} color="$brand" /> },
  { key: 'finance', label: 'Finance', description: 'KPIs, operations, members, approvals', icon: <Building2 size={16} color="$brand" /> },
  { key: 'operations', label: 'Operations', description: 'Scanner, classes, support, incidents', icon: <ShieldCheck size={16} color="$brand" /> },
];

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

export default function OpsProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session, signOut, switchRole } = useAuth();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverText, setHandoverText] = useState('');
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);

  const shiftActive = useConvexQuery(
    api.queries.operations.getMyActiveShift,
    session?.userId ? {} : 'skip',
  );
  const shifts = useConvexQuery(
    api.queries.operations.getMyShifts,
    session?.userId ? {} : 'skip',
  );

  const startShift = useConvexMutation(api.mutations.operations.startShift);
  const endShift = useConvexMutation(api.mutations.operations.endShift);

  const identity = useMemo<ProfileIdentity | null>(() => {
    if (!session) return null
    const userIdTail = (session.userId ?? '').slice(-5).toUpperCase()
    return {
      fullName: session.fullName,
      email: session.email,
      phone: '+971 50 882 4710',
      employeeSince: 'March 2024',
      employeeId: userIdTail || '40219',
      avatarUrl: session.avatarUrl ?? undefined,
      primaryRole: 'Operations',
      secondaryRole: 'Front desk',
      roles: session.roles,
    }
  }, [session])

  const shiftStart: number | null = shiftActive?.startsAt ?? null
  const elapsed = useElapsedSeconds(Boolean(shiftStart), shiftStart)
  const shiftDocs = useMemo(() => (Array.isArray(shifts) ? shifts : []), [shifts])
  const shiftHistory: Shift[] = useMemo(
    () =>
      shiftDocs.map((s) => {
        const startsAt = s.startsAt ?? Date.now()
        const endsAt = s.endsAt ?? startsAt
        return {
          id: String(s._id),
          date: formatDate(startsAt),
          start: formatTime(startsAt),
          end: formatTime(endsAt),
          hoursLogged: formatDuration(Math.max(0, endsAt - startsAt)),
          status: s.status === 'completed' ? 'completed' : s.status === 'active' ? 'active' : 'upcoming',
        } as Shift
      }),
    [shiftDocs],
  )
  const thisWeekMs = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return shiftDocs
      .filter((s) => (s.startsAt ?? 0) >= cutoff)
      .reduce((acc: number, s) => acc + ((s.endsAt ?? 0) - (s.startsAt ?? 0)), 0)
  }, [shiftDocs])

  const handleStartShift = async () => {
    try {
      await startShift({})
      toast.success('Shift started')
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not start shift')
    }
  }
  const handleEndShift = async () => {
    try {
      await endShift({})
      toast.success('Shift ended. Have a great rest!')
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not end shift')
    }
  }

  const handleSwitchRole = async (roleKey: string) => {
    try {
      await switchRole(roleKey as any)
      setRoleSheetOpen(false)
      router.replace(`/${roleKey}` as any)
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not switch role')
    }
  }

  if (!session || !identity) return null

  return (
    <Screen padded={false}>
      <Header title="Profile" subtitle="Operations role" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <IdentityCard identity={identity} />

        <ShiftPanel
          active={Boolean(shiftStart)}
          elapsedSeconds={elapsed}
          startedAt={shiftStart}
          onStart={handleStartShift}
          onEnd={handleEndShift}
        />

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
              value={shiftStart ? 'Yes' : 'No'}
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
              description={`Current: ${ROLE_META.find((r) => r.key === session.activeRole)?.label ?? 'Member'}`}
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
            <YStack padding="$md" alignItems="center">
              <Text variant="bodySmall" color="muted" textAlign="center">
                No shifts yet. Tap "Start shift" to begin your first one.
              </Text>
            </YStack>
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

      <HandoverSheet
        open={handoverOpen}
        onOpenChange={setHandoverOpen}
        value={handoverText}
        onChange={setHandoverText}
        onSave={() => {
          toast.success('Handover saved')
          setHandoverOpen(false)
        }}
      />
      <RoleSwitcherSheet
        open={roleSheetOpen}
        onOpenChange={setRoleSheetOpen}
        roles={ROLE_META}
        activeRole={session.activeRole}
        availableRoles={session.roles}
        onSwitch={handleSwitchRole}
      />
    </Screen>
  )
}

// Side-effect import to keep tree-shake quiet on formatTime/formatDate.
export const __formatTimeRef = formatTime
export const __formatDateRef = formatDate
