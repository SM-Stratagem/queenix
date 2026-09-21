/**
 * Queenix Gym — Role switcher modal
 * Shown when user has multiple roles.
 */

import React from 'react';
import { Sheet, Text, Button, XStack, YStack, Avatar } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@queenix/ui';
import { User, Dumbbell, BarChart3, Activity } from '@tamagui/lucide-icons';

const roleIcons = {
  member: User,
  trainer: Dumbbell,
  finance: BarChart3,
  /** @deprecated Alias of finance. */
  owner: BarChart3,
  operations: Activity,
  superadmin: BarChart3,
  admin: BarChart3,
  salon: User,
  coffee: User,
} as const satisfies Record<import('@queenix/auth').Role, unknown>;

const roleDescriptions = {
  member: 'Your personal member experience',
  trainer: 'Manage clients, sessions and earnings',
  finance: 'KPIs, operations and approvals',
  /** @deprecated Alias of finance. */
  owner: 'KPIs, operations and approvals',
  operations: 'Scanner, classes and support',
  superadmin: 'Full platform oversight',
  admin: 'Branches, staff and finance',
  salon: 'Salon queue and services',
  coffee: 'Coffee queue and menu',
} as const satisfies Record<import('@queenix/auth').Role, string>;

interface RoleSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ open, onOpenChange }) => {
  const { session, switchRole } = useAuth();
  const toast = useToast();

  if (!session || session.roles.length <= 1) return null;

  const handleSwitch = async (role: typeof session.activeRole) => {
    await switchRole(role);
    toast.success(`Switched to ${role}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} snapPoints={[50]}>
      <YStack gap="$3">
        <Text variant="h2">Switch role</Text>
        <Text variant="bodySmall" color="secondary">
          Choose how you want to use Queenix
        </Text>

        <YStack gap="$2" marginTop="$2">
          {session.roles.map((role) => {
            const Icon = roleIcons[role];
            const active = session.activeRole === role;
            return (
              <YStack
                key={role}
                backgroundColor={active ? '$brand50' : '$surfaceMuted'}
                borderColor={active ? '$brand' : '$borderColor'}
                borderWidth={1}
                borderRadius="$lg"
                padding="$3"
                onPress={() => handleSwitch(role)}
                pressStyle={{ opacity: 0.8 }}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${role}`}
                accessibilityState={{ selected: active }}
              >
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor={active ? '$brand' : '$surface'}
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    <Icon size={20} color={active ? 'white' : '$textPrimary'} />
                  </YStack>
                  <YStack flex={1}>
                    <Text variant="body" weight="600" color={active ? 'brand' : 'primary'}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Text>
                    <Text variant="caption" color="secondary">
                      {roleDescriptions[role]}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            );
          })}
        </YStack>
      </YStack>
    </Sheet>
  );
};
