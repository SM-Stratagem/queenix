import React from 'react';
import { YStack } from 'tamagui';
import { Text, Button, Input, Sheet } from '@queenix/ui';

export function FreezeSheet({
  open,
  onOpenChange,
  activeMembership,
  days,
  setDays,
  reason,
  setReason,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeMembership: { status: string } | null | undefined;
  days: string;
  setDays: (v: string) => void;
  reason: string;
  setReason: (v: string) => void;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} snapPoints={[60]}>
      <YStack gap="$3" flex={1}>
        <Text variant="h3">Freeze membership</Text>
        <Text variant="caption" color="muted">
          {activeMembership ? `Freezing the ${activeMembership.status} membership.` : 'No active membership.'}
        </Text>
        <YStack gap="$1">
          <Text variant="label">Days</Text>
          <Input value={days} onChangeText={setDays} placeholder="30" aria-label="Freeze days" />
        </YStack>
        <YStack gap="$1">
          <Text variant="label">Reason (optional)</Text>
          <Input value={reason} onChangeText={setReason} placeholder="e.g. travel" aria-label="Freeze reason" />
        </YStack>
        <Button
          label={busy ? 'Freezing…' : 'Confirm freeze'}
          onPress={onConfirm}
          variant="primary"
          size="lg"
          fullWidth
          disabled={busy}
        />
        <YStack flex={1} />
      </YStack>
    </Sheet>
  );
}
