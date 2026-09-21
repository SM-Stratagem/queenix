import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Avatar, Button, Badge, Divider, Spacer, Switch } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@queenix/ui';
import { useConvexMutation, useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  CreditCard,
  FileText,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Globe,
  Car,
  Heart,
} from '@tamagui/lucide-icons';

export default function MemberProfile() {
  const router = useRouter();
  const { session, signOut, switchRole } = useAuth();
  const toast = useToast();
  const switchRoleMutation = useConvexMutation(api.mutations.users.switchRole);
  const memberProfile = useConvexQuery((api.queries as any).users.getMemberProfile, {});
  const saveProfile = useConvexMutation((api.mutations as any).users.updateMyProfile);
  const [notifications, setNotifications] = React.useState(true);
  const [marketing, setMarketing] = React.useState(false);
  const [prefsPrimed, setPrefsPrimed] = React.useState(false);

  React.useEffect(() => {
    const prefs = (memberProfile as any)?.preferences;
    if (prefs && !prefsPrimed) {
      setNotifications(prefs.notifications);
      setMarketing(prefs.marketing);
      setPrefsPrimed(true);
    }
  }, [memberProfile, prefsPrimed]);

  async function persistPrefs(nextNotifications: boolean, nextMarketing: boolean) {
    try {
      await saveProfile({ preferences: { notifications: nextNotifications, marketing: nextMarketing, language: 'en' as const } });
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not save preference');
    }
  }

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSwitchRole = async (role: string) => {
    try {
      await switchRoleMutation({ role: role as any });
      await switchRole(role as any);
      toast.success(`Switched to ${role}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not switch role');
    }
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <YStack alignItems="center" paddingTop="$6" paddingBottom="$4" gap="$2">
          <Avatar name={session?.fullName} size="2xl" />
          <Text variant="h2" marginTop="$3">{session?.fullName}</Text>
          <Text variant="bodySmall" color="muted">{session?.email}</Text>
          <Badge label="Premium Member" variant="brand" />
        </YStack>

        {/* Role switcher (if multi-role) */}
        {session?.roles && session.roles.length > 1 && (
          <YStack paddingHorizontal="$4" marginTop="$2">
            <Card variant="filled">
              <Text variant="label" marginBottom="$2">Switch role</Text>
              <XStack gap="$2" flexWrap="wrap">
                {session.roles.map((r) => (
                  <Button
                    key={r}
                    label={r.charAt(0).toUpperCase() + r.slice(1)}
                    onPress={() => handleSwitchRole(r)}
                    variant={session.activeRole === r ? 'primary' : 'outline'}
                    size="sm"
                  />
                ))}
              </XStack>
            </Card>
          </YStack>
        )}

        {/* Settings list */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <SettingsItem
            icon={<CreditCard size={20} color="$textPrimary" />}
            title="Payments & membership"
            subtitle="Manage plan, view invoices"
            onPress={() => router.push('/(member)/payments')}
          />
          <SettingsItem
            icon={<FileText size={20} color="$textPrimary" />}
            title="Documents"
            subtitle="Agreements, waivers, health forms"
            onPress={() => router.push('/(member)/documents')}
          />
          <SettingsItem
            icon={<Heart size={20} color="$textPrimary" />}
            title="Health & preferences"
            subtitle="Emergency contact, DOB, gender"
            onPress={() => router.push('/(member)/health')}
          />
          <SettingsItem
            icon={<Car size={20} color="$textPrimary" />}
            title="Vehicles & parking"
            subtitle="Plates the valet recognises"
            onPress={() => router.push('/(member)/vehicles')}
          />
        </YStack>

        {/* Preferences */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <Text variant="label" marginBottom="$3">Preferences</Text>
            <Switch
              label="Push notifications"
              description="Class reminders, booking updates"
              value={notifications}
              onValueChange={(v) => {
                setNotifications(v);
                persistPrefs(v, marketing);
              }}
            />
            <Divider />
            <Switch
              label="Marketing emails"
              description="Offers, news, events"
              value={marketing}
              onValueChange={(v) => {
                setMarketing(v);
                persistPrefs(notifications, v);
              }}
            />
            <Divider />
            <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
              <XStack alignItems="center" gap="$3">
                <Globe size={20} color="$textPrimary" />
                <YStack>
                  <Text variant="body" weight="500">Language</Text>
                  <Text variant="caption" color="muted">English</Text>
                </YStack>
              </XStack>
              <Text variant="caption" color="muted">
                English · Arabic soon
              </Text>
            </XStack>
          </Card>
        </YStack>

        {/* Support */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <SettingsItem
            icon={<Bell size={20} color="$textPrimary" />}
            title="Notifications"
            subtitle="Inbox from the club"
            onPress={() => router.push('/(member)/notifications')}
          />
          <SettingsItem
            icon={<Lock size={20} color="$textPrimary" />}
            title="Privacy & security"
            subtitle="Change password, sign out devices"
            onPress={() => router.push('/(member)/security')}
          />
          <SettingsItem
            icon={<HelpCircle size={20} color="$textPrimary" />}
            title="Help & support"
            subtitle="File a request, track replies"
            onPress={() => router.push('/(member)/support')}
          />
        </YStack>

        {/* Sign out */}
        <YStack paddingHorizontal="$4" marginTop="$6">
          <Button
            label="Sign out"
            onPress={handleSignOut}
            variant="danger"
            size="lg"
            fullWidth
            icon={<LogOut size={18} color="white" />}
          />
          <Spacer size="md" />
          <Text variant="caption" color="muted" align="center">
            Queenix Gym v1.0.0 • Dubai, UAE
          </Text>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function SettingsItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Card variant="outlined" padding="sm" onPress={onPress}>
      <XStack alignItems="center" gap="$3">
        <YStack backgroundColor="$surfaceMuted" padding="$2.5" borderRadius="$md">
          {icon}
        </YStack>
        <YStack flex={1}>
          <Text variant="body" weight="500">{title}</Text>
          {subtitle && <Text variant="caption" color="muted">{subtitle}</Text>}
        </YStack>
        <ChevronRight size={18} color="$textMuted" />
      </XStack>
    </Card>
  );
}
