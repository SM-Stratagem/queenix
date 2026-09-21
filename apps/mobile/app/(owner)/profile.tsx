import React from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Avatar, Badge, Button } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@queenix/ui';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';
import {
  Building2,
  DollarSign,
  Users,
  FileBarChart,
  LogOut,
  ChevronRight,
  HelpCircle,
  Megaphone,
  Repeat,
  Briefcase,
} from '@tamagui/lucide-icons';

export default function FinanceProfile() {
  const router = useRouter();
  const { session, signOut, switchRole } = useAuth();
  const toast = useToast();

  const branches = useConvexQuery(api.queries.branches.branchesList, {});
  const plans = useConvexQuery(api.queries.membershipAdmin.listAllPlans, {});
  const staff = useConvexQuery((api.queries as any).org.staffDirectory, { limit: 500 });
  const coffeePay = useConvexQuery((api.queries as any).commerce.getVenuePaymentSettings, { venue: 'coffee' });
  const salonPay = useConvexQuery((api.queries as any).commerce.getVenuePaymentSettings, { venue: 'salon' });

  const branchList: any[] = branches ?? [];
  const branch = branchList.find((b) => b.isActive) ?? branchList[0];
  const planList: any[] = plans ?? [];
  const staffList: any[] = staff ?? [];
  const trainerCount = staffList.filter((s) => s.user.activeRole === 'trainer').length;
  const deskCount = staffList.filter((s) => ['operations', 'coffee', 'salon'].includes(s.user.activeRole)).length;

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
          <Badge label="Finance" variant="brand" />
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

        {/* Gym business info — live data */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="caption" color="muted" marginBottom="$2" textTransform="uppercase">
            Business
          </Text>
          <YStack gap="$2">
            <SettingsItem
              icon={<Building2 size={20} color="$textPrimary" />}
              title="Gym info"
              subtitle={branch ? `${branch.name} — ${branch.city}` : 'Loading…'}
              onPress={() => router.push('/(owner)/branch')}
            />
            <SettingsItem
              icon={<DollarSign size={20} color="$textPrimary" />}
              title="Pricing & plans"
              subtitle={plans === undefined ? 'Loading…' : `${planList.filter((p: any) => p.isActive).length} active plans`}
              onPress={() => router.push('/(owner)/overview')}
            />
            <SettingsItem
              icon={<Users size={20} color="$textPrimary" />}
              title="Staff management"
              subtitle={staff === undefined ? 'Loading…' : `${trainerCount} trainers · ${deskCount} front desk/venues`}
              onPress={() => router.push('/(owner)/staff')}
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
              onPress={() => router.push('/(owner)/announce')}
            />
            <SettingsItem
              icon={<FileBarChart size={20} color="$textPrimary" />}
              title="Reports & exports"
              subtitle="Revenue, attendance, retention"
              onPress={() => router.push('/(owner)/overview')}
            />
            <SettingsItem
              icon={<Briefcase size={20} color="$textPrimary" />}
              title="Approvals inbox"
              subtitle="Decide requests"
              onPress={() => router.push('/(owner)/approvals')}
            />
          </YStack>
        </YStack>

        {/* Venue gateways — live status */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="caption" color="muted" marginBottom="$2" textTransform="uppercase">
            Venue payments
          </Text>
          <Card variant="outlined" padding="sm">
            <YStack gap="$1">
              <XStack justifyContent="space-between">
                <Text variant="body" weight="500">Coffee shop</Text>
                <Text variant="caption" color="muted">
                  {coffeePay === undefined ? '…' : `${coffeePay.provider} · ${coffeePay.currency}${coffeePay.enabled ? '' : ' · off'}`}
                </Text>
              </XStack>
              <XStack justifyContent="space-between">
                <Text variant="body" weight="500">Salon</Text>
                <Text variant="caption" color="muted">
                  {salonPay === undefined ? '…' : `${salonPay.provider} · ${salonPay.currency}${salonPay.enabled ? '' : ' · off'}`}
                </Text>
              </XStack>
            </YStack>
          </Card>
        </YStack>

        {/* Security & support */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <SettingsItem
            icon={<HelpCircle size={20} color="$textPrimary" />}
            title="Help & support"
            subtitle="Contact Concierge"
            onPress={() => router.push('/(owner)/support')}
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
