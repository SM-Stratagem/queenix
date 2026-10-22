import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text, Card, Avatar, Button, Badge } from '@queenix/ui';
import { MessageCircle, Snowflake } from '@tamagui/lucide-icons-2';

export function MemberProfileCard({
  fullName,
  createdAt,
  activeMembership,
  onWhatsApp,
  onUnfreeze,
  onFreeze,
}: {
  fullName: string;
  createdAt: number;
  activeMembership: { status: string } | null | undefined;
  onWhatsApp: () => void;
  onUnfreeze: () => void;
  onFreeze: () => void;
}) {
  return (
    <Card variant="elevated" padding="lg">
      <XStack gap="$3" alignItems="flex-start">
        <Avatar name={fullName} size="xl" />
        <YStack flex={1} gap="$1.5">
          <Text variant="h2" numberOfLines={1}>
            {fullName}
          </Text>
          <XStack gap="$2" flexWrap="wrap">
            {activeMembership ? (
              <Badge label={activeMembership.status} variant="success" />
            ) : (
              <Badge label="No membership" variant="warning" />
            )}
          </XStack>
          <Text variant="caption" color="muted">
            Member since{' '}
            {new Date(createdAt).toLocaleDateString('en-GB', {
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </YStack>
      </XStack>
      <XStack gap="$2" marginTop="$3">
        <Button
          label="WhatsApp"
          variant="primary"
          size="sm"
          icon={<MessageCircle size={16} color="$textOnBrand" />}
          onPress={onWhatsApp}
          aria-label="Message member on WhatsApp"
          flex={1}
        />
        {activeMembership?.status === 'frozen' ? (
          <Button
            label="Unfreeze"
            variant="outline"
            size="sm"
            icon={<Snowflake size={16} color="$brand" />}
            onPress={onUnfreeze}
            aria-label="Unfreeze membership"
            flex={1}
          />
        ) : (
          <Button
            label="Freeze"
            variant="outline"
            size="sm"
            icon={<Snowflake size={16} color="$brand" />}
            onPress={onFreeze}
            aria-label="Freeze membership"
            disabled={!activeMembership}
            flex={1}
          />
        )}
      </XStack>
    </Card>
  );
}
