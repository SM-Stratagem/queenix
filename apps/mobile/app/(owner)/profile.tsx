import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Avatar, Badge, Button, Divider, Switch } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@queenix/ui';
import {
  Building2,
  Clock,
  DollarSign,
  Users,
  Plug,
  FileBarChart,
  LogOut,
  ChevronRight,
  Bell,
  Lock,
  HelpCircle,
  Shield,
  Megaphone,
  Repeat,
  Briefcase,
} from '@tamagui/lucide-icons';

export default function OwnerProfile() {
  const router = useRouter();
  const { session, signOut, switchRole } = useAuth();
  const toast = useToast();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [biometric, setBiometric] = useState(true);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSwitchRole = (role: string) => {
    switchRole(role as any);
    toast.success(`Switched to ${role}`);
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <YStack alignItems="center" paddingTop="$6" paddingBottom="$4" gap="$2">
          <Avatar name={session?.fullName ?? 'Layla Al-Mansoori'} size="2xl" />
          <Text variant="h2" marginTop="$3">{session?.fullName ?? 'Layla Al-Mansoori'}</Text>
          <Text variant="bodySmall" color="muted">{session?.email ?? 'layla@queenix.ae'}</Text>
          <Badge label="Owner" variant="brand" />
        </YStack>

        {/* Role switcher */}
        {session?.roles && session.roles.length > 1 && (
          <YStack paddingHorizontal="$4" marginTop="$2">
            <Card variant="filled">
              <XStack alignItems="center" gap="$2" marginBottom="$2">
                <Repeat size={16} color="$textSecondary" />
                <Text variant="label">Switch role</Text>
              </XStack>
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

        {/* Gym business info */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="caption" color="muted" marginBottom="$2" textTransform="uppercase">
            Business
          </Text>
          <YStack gap="$2">
            <SettingsItem
              icon={<Building2 size={20} color="$textPrimary" />}
              title="Gym info"
              subtitle="Queenix Gym — Jumeirah, Dubai"
              onPress={() => toast.info('Edit gym details coming soon')}
            />
            <SettingsItem
              icon={<Clock size={20} color="$textPrimary" />}
              title="Business hours"
              subtitle="Mon–Fri 6 AM – 10 PM • Sat–Sun 8 AM – 8 PM"
              onPress={() => toast.info('Edit hours coming soon')}
            />
            <SettingsItem
              icon={<DollarSign size={20} color="$textPrimary" />}
              title="Pricing & plans"
              subtitle="4 plans, 3 add-ons"
              onPress={() => toast.info('Pricing editor coming soon')}
            />
            <SettingsItem
              icon={<Users size={20} color="$textPrimary" />}
              title="Staff management"
              subtitle="6 active trainers, 3 front desk"
              onPress={() => toast.info('Staff manager coming soon')}
            />
          </YStack>
        </YStack>

        {/* Operations */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="caption" color="muted" marginBottom="$2" textTransform="uppercase">
            Operations
          </Text>
          <YStack gap="$2">
            <SettingsItem
              icon={<Megaphone size={20} color="$textPrimary" />}
              title="Announcements"
              subtitle="Send push to all members"
              onPress={() => toast.info('Composer coming soon')}
            />
            <SettingsItem
              icon={<FileBarChart size={20} color="$textPrimary" />}
              title="Reports & exports"
              subtitle="Revenue, attendance, retention"
              onPress={() => router.push('/(owner)/overview')}
            />
            <SettingsItem
              icon={<Briefcase size={20} color="$textPrimary" />}
              title="Approvals policy"
              subtitle="Auto-approve under AED 100"
              onPress={() => toast.info('Policy editor coming soon')}
            />
            <SettingsItem
              icon={<Plug size={20} color="$textPrimary" />}
              title="Integrations"
              subtitle="Stripe, Zoho, WhatsApp connected"
              onPress={() => toast.info('Integrations manager coming soon')}
            />
          </YStack>
        </YStack>

        {/* Preferences */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <Text variant="label" marginBottom="$3">Preferences</Text>
            <Switch
              label="Push notifications"
              description="Approvals, incidents, low occupancy"
              value={pushEnabled}
              onValueChange={setPushEnabled}
            />
            <Divider />
            <Switch
              label="Quiet hours"
              description="10 PM – 7 AM Dubai time"
              value={quietHours}
              onValueChange={setQuietHours}
            />
            <Divider />
            <Switch
              label="Biometric sign-in"
              description="Face ID for app access"
              value={biometric}
              onValueChange={setBiometric}
            />
            <Divider />
            <XStack justifyContent="space-between" alignItems="center" paddingVertical="$2">
              <XStack alignItems="center" gap="$3">
                <Bell size={20} color="$textPrimary" />
                <YStack>
                  <Text variant="body" weight="500">Alerts & sounds</Text>
                  <Text variant="caption" color="muted">Default Queenix chime</Text>
                </YStack>
              </XStack>
              <Text
                variant="bodySmall"
                color="brand"
                fontWeight="600"
                onPress={() => toast.info('Sound picker coming soon')}
              >
                Change
              </Text>
            </XStack>
          </Card>
        </YStack>

        {/* Security & support */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <SettingsItem
            icon={<Shield size={20} color="$textPrimary" />}
            title="Roles & permissions"
            subtitle="Manager, trainer, front desk scopes"
            onPress={() => toast.info('RBAC manager coming soon')}
          />
          <SettingsItem
            icon={<Lock size={20} color="$textPrimary" />}
            title="Privacy & security"
            subtitle="Audit log, data export, sessions"
            onPress={() => toast.info('Security center coming soon')}
          />
          <SettingsItem
            icon={<HelpCircle size={20} color="$textPrimary" />}
            title="Help & support"
            subtitle="Owner help center, contact Concierge"
            onPress={() => toast.info('Support coming soon')}
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
          <Text variant="caption" color="muted" align="center" marginTop="$3">
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
