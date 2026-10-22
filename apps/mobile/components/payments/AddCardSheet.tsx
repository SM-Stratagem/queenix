import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text, Button, Input, Sheet } from '@queenix/ui';

export function AddCardSheet({
  open,
  onOpenChange,
  last4,
  setLast4,
  brand,
  setBrand,
  exp,
  setExp,
  busy,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  last4: string
  setLast4: (v: string) => void
  brand: string
  setBrand: (v: string) => void
  exp: string
  setExp: (v: string) => void
  busy: boolean
  onSubmit: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} snapPoints={[70]}>
      <YStack gap="$3" flex={1}>
        <Text variant="h3">Add card on file</Text>
        <Text variant="caption" color="muted">
          Used for membership billing when a charge is due. Enter only the last 4 digits.
        </Text>
        <YStack gap="$1">
          <Text variant="label">Card brand</Text>
          <XStack gap="$2" flexWrap="wrap">
            {['visa', 'mastercard', 'amex', 'apple_pay'].map((b) => (
              <Button
                key={b}
                size="sm"
                variant={brand === b ? 'primary' : 'secondary'}
                onPress={() => setBrand(b)}
              >
                {b === 'apple_pay' ? ' Apple Pay' : b}
              </Button>
            ))}
          </XStack>
        </YStack>
        <YStack gap="$1">
          <Text variant="label">Last 4 digits</Text>
          <Input value={last4} onChangeText={setLast4} placeholder="4242" aria-label="Last 4 digits" />
        </YStack>
        <YStack gap="$1">
          <Text variant="label">Expiry (MM/YY)</Text>
          <Input value={exp} onChangeText={setExp} placeholder="08/27" aria-label="Expiry" />
        </YStack>
        <Button label={busy ? 'Saving…' : 'Save card'} onPress={onSubmit} variant="primary" size="lg" fullWidth disabled={busy} />
        <YStack flex={1} />
      </YStack>
    </Sheet>
  )
}
