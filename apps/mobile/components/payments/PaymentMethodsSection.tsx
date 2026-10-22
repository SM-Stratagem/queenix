import React from 'react';
import { YStack, XStack } from 'tamagui';
import { Text, Card, Button, EmptyState } from '@queenix/ui';
import { normalizeBrand } from './format';
import { type Brand } from './CardBrandLogo';
import { PaymentMethodCardContent } from './MethodCardContent';

export function PaymentMethodsSection({
  methods,
  onSetDefault,
  onAddCard,
  onRemoveCard,
}: {
  methods: Array<{
    _id: string
    brand?: string
    type?: string
    provider?: string
    last4?: string | null
    expiryMonth?: number | null
    expiryYear?: number | null
    isDefault?: boolean
  }>
  onSetDefault: (id: string) => void
  onAddCard: () => void
  onRemoveCard: (id: string) => void
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$5" gap="$3">
      <Text variant="h3">Payment methods</Text>
      {methods.length === 0 ? (
        <EmptyState
          title="No payment methods"
          message="Add a card to manage your membership."
          actionLabel="Add card"
          onAction={onAddCard}
        />
      ) : (
        <YStack gap="$2">
          {methods.map((m) => {
            const brand: Brand = normalizeBrand(m.brand)
            return (
              <YStack key={m._id} gap="$1">
                <Card
                  variant="outlined"
                  padding="md"
                  onPress={() => onSetDefault(m._id)}
                  accessibilityLabel={`Set ${brand} ending ${m.last4 ?? '****'} as default`}
                >
                  <PaymentMethodCardContent method={m} brand={brand} />
                </Card>
                <XStack justifyContent="flex-end">
                  <Text
                    variant="bodySmall"
                    color="danger"
                    onPress={() => onRemoveCard(m._id)}
                    accessibilityLabel={`Remove card ending ${m.last4 ?? '****'}`}
                  >
                    Remove
                  </Text>
                </XStack>
              </YStack>
            )
          })}
        </YStack>
      )}
      <Button label="Update payment method" variant="outline" size="md" fullWidth onPress={onAddCard} />
      <Text variant="caption" color="muted" align="center">
        Cards are saved on file for membership billing. Full PANs never touch our servers.
      </Text>
    </YStack>
  )
}
