import React, { useState, useEffect } from 'react';
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
  Input,
  Sheet,
  Switch,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import {
  Play,
  StopCircle,
  Bell,
  FileText,
  LogOut,
  ChevronRight,
  Clock,
  Calendar,
  Phone,
  Mail,
  IdCard,
  ShieldCheck,
  Pencil,
  Check,
  X,
} from '@tamagui/lucide-icons';

interface Shift {
  id: string;
  date: string;
  start: string;
  end: string;
  hoursLogged: string;
  status: 'completed' | 'active' | 'upcoming';
}

const SHIFT_HISTORY: Shift[] = [
  { id: 's1', date: 'Yesterday', start: '14:00', end: '22:00', hoursLogged: '8h 00m', status: 'completed' },
  { id: 's2', date: 'Tue 03 Sep', start: '06:00', end: '14:00', hoursLogged: '8h 00m', status: 'completed' },
  { id: 's3', date: 'Mon 02 Sep', start: '14:00', end: '22:00', hoursLogged: '7h 45m', status: 'completed' },
  { id: 's4', date: 'Sun 01 Sep', start: '06:00', end: '14:00', hoursLogged: '8h 00m', status: 'completed' },
  { id: 's5', date: 'Sat 31 Aug', start: '10:00', end: '18:00', hoursLogged: '8h 00m', status: 'completed' },
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

function formatElapsed(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export default function OpsProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftStart, setShiftStart] = useState<number | null>(null);
  const [shiftEnd, setShiftEnd] = useState<string | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverText, setHandoverText] = useState(
    'Two members flagged for follow-up: Mohammed Ali (INC-2028) and Priya Sharma (QNX-4921).'
  );

  const elapsed = useElapsedSeconds(shiftActive, shiftStart);

  const handleStartShift = () => {
    setShiftStart(Date.now());
    setShiftActive(true);
    setShiftEnd(null);
  };
  const handleEndShift = () => {
    setShiftEnd(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setShiftActive(false);
  };

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
                backgroundColor="$brand50"
                color="$brand"
              />
              <YStack flex={1} gap="$1">
                <Text variant="h2" numberOfLines={1}>
                  {session?.fullName ?? 'Hala Al-Suwaidi'}
                </Text>
                <XStack alignItems="center" gap="$2">
                  <Badge label="Operations" variant="info" />
                  <Badge label="Front desk" variant="neutral" />
                </XStack>
                <Text variant="caption" color="muted">
                  ID OPS-{session?.userId?.slice(-5) ?? '40219'}
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
                    : shiftEnd
                    ? `Last ended ${shiftEnd}`
                    : 'Not started'}
                </Text>
                {shiftActive && shiftStart && (
                  <XStack alignItems="center" gap="$1.5">
                    <Clock size={12} color="$brand" />
                    <Text variant="caption" color="brand" weight="600">
                      Started at{' '}
                      {new Date(shiftStart).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
              value="32h 45m"
              flex={1}
            />
            <ShiftStat
              icon={<Calendar size={18} color="$success500" />}
              label="Shifts"
              value="5 / 5"
              flex={1}
            />
            <ShiftStat
              icon={<Check size={18} color="$info500" />}
              label="On-time"
              value="100%"
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Settings */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="h4" marginBottom="$2">Settings</Text>
          <YStack gap="$2">
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
              icon={<IdCard size={18} color="$textPrimary" />}
              label="Switch role"
              description="Member, trainer, or owner view"
              onPress={() => {}}
            />
          </YStack>
        </YStack>

        {/* Shift history */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
            <Text variant="h4">Shift history</Text>
            <Text variant="bodySmall" color="brand">
              Export
            </Text>
          </XStack>
          <YStack gap="$2">
            {SHIFT_HISTORY.map((s) => (
              <ShiftRow key={s.id} shift={s} />
            ))}
          </YStack>
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
      <Sheet
        open={handoverOpen}
        onOpenChange={setHandoverOpen}
      >
        <YStack gap="$3">
          <YStack gap="$0.5" marginBottom="$1">
            <Text variant="h2">Handover notes</Text>
            <Text variant="bodySmall" color="secondary">
              Visible to the next shift
            </Text>
          </YStack>
          <Input
            label="Notes"
            placeholder="Anything the next team should know…"
            multiline
            numberOfLines={6}
            value={handoverText}
            onChangeText={setHandoverText}
            accessibilityLabel="Handover note text"
          />
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
              onPress={() => setHandoverOpen(false)}
              accessibilityLabel="Save handover note"
            />
          </XStack>
        </YStack>
      </Sheet>
    </Screen>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <XStack alignItems="center" gap="$2">
      {icon}
      <Text variant="caption" color="muted" width={90}>
        {label}
      </Text>
      <Text variant="bodySmall" weight="500" numberOfLines={1} flex={1}>
        {value}
      </Text>
    </XStack>
  );
}

function ShiftStat({
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

function SettingsRow({
  icon,
  label,
  description,
  right,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={onPress}
      accessibilityLabel={label}
    >
      <XStack alignItems="center" gap="$3">
        <YStack
          backgroundColor="$surfaceMuted"
          padding="$2.5"
          borderRadius="$md"
        >
          {icon}
        </YStack>
        <YStack flex={1} gap="$0.5">
          <Text variant="label">{label}</Text>
          {description && (
            <Text variant="caption" color="muted" numberOfLines={1}>
              {description}
            </Text>
          )}
        </YStack>
        {right ?? <ChevronRight size={18} color="$textMuted" />}
      </XStack>
    </Card>
  );
}

function ShiftRow({ shift }: { shift: Shift }) {
  return (
    <Card
      variant="outlined"
      padding="sm"
      accessibilityLabel={`${shift.date}, ${shift.start} to ${shift.end}, ${shift.hoursLogged}`}
    >
      <XStack alignItems="center" gap="$3">
        <YStack
          backgroundColor="$brand50"
          padding="$2.5"
          borderRadius="$md"
          alignItems="center"
          justifyContent="center"
        >
          <Clock size={18} color="$brand" />
        </YStack>
        <YStack flex={1} gap="$0.5">
          <Text variant="label">{shift.date}</Text>
          <Text variant="caption" color="secondary">
            {shift.start} → {shift.end}
          </Text>
        </YStack>
        <YStack alignItems="flex-end" gap="$0.5">
          <Text variant="label" color="brand">
            {shift.hoursLogged}
          </Text>
          <Badge label="Completed" variant="success" />
        </YStack>
      </XStack>
    </Card>
  );
}
