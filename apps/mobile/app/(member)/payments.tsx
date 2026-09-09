import React, { useState } from 'react';
import { YStack, XStack, ScrollView, RefreshControl } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Divider,
  useToast,
} from '@queenix/ui';
import {
  CreditCard,
  Plus,
  Check,
  Download,
  Calendar,
  Sparkles,
  ChevronRight,
  Crown,
} from '@tamagui/lucide-icons';

interface PaymentMethod {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiry: string;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  date: number;
  description: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  invoiceUrl?: string;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm1',
    brand: 'visa',
    last4: '4242',
    expiry: '08/27',
    isDefault: true,
  },
  {
    id: 'pm2',
    brand: 'mastercard',
    last4: '8821',
    expiry: '03/26',
    isDefault: false,
  },
];

const TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    date: Date.now() - 2 * 24 * 60 * 60 * 1000,
    description: 'Premium monthly membership',
    amount: 449,
    status: 'paid',
  },
  {
    id: 't2',
    date: Date.now() - 5 * 24 * 60 * 60 * 1000,
    description: 'Personal training — Maya Patel',
    amount: 220,
    status: 'paid',
  },
  {
    id: 't3',
    date: Date.now() - 12 * 24 * 60 * 60 * 1000,
    description: 'Premium monthly membership',
    amount: 449,
    status: 'paid',
  },
  {
    id: 't4',
    date: Date.now() - 18 * 24 * 60 * 60 * 1000,
    description: 'Guest pass — friend',
    amount: 75,
    status: 'paid',
  },
  {
    id: 't5',
    date: Date.now() - 30 * 24 * 60 * 60 * 1000,
    description: 'Premium monthly membership',
    amount: 449,
    status: 'paid',
  },
  {
    id: 't6',
    date: Date.now() - 40 * 24 * 60 * 60 * 1000,
    description: 'Annual locker rental',
    amount: 240,
    status: 'failed',
  },
  {
    id: 't7',
    date: Date.now() - 60 * 24 * 60 * 60 * 1000,
    description: 'Premium monthly membership',
    amount: 449,
    status: 'paid',
  },
];

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatAED(amount: number): string {
  return `AED ${amount.toFixed(2)}`;
}

const brandLabel: Record<PaymentMethod['brand'], string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
};

export default function PaymentsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [methods, setMethods] = useState<PaymentMethod[]>(PAYMENT_METHODS);

  const setDefault = (id: string) => {
    setMethods((prev) =>
      prev.map((m) => ({ ...m, isDefault: m.id === id }))
    );
    toast.success('Default payment method updated');
  };

  const handleCancel = () => {
    toast.warning('To confirm cancellation, please email hello@queenixgym.com');
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="$brand" />
        }
      >
        {/* Header */}
        <YStack paddingTop="$4" paddingHorizontal="$4" paddingBottom="$2">
          <XStack alignItems="center" gap="$2">
            <YStack
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              pressStyle={{ opacity: 0.7 }}
              padding="$2"
              borderRadius="$full"
              backgroundColor="$surfaceMuted"
            >
              <ChevronRight size={20} color="$textPrimary" style={{ transform: [{ rotate: '180deg' }] }} />
            </YStack>
            <YStack>
              <Text variant="h1">Payments</Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Current plan */}
        <YStack paddingHorizontal="$4" marginTop="$3">
          <Card variant="elevated" padding="lg">
            <YStack gap="$3">
              <XStack justifyContent="space-between" alignItems="flex-start">
                <YStack gap="$1">
                  <XStack alignItems="center" gap="$2">
                    <Crown size={16} color="$brand" />
                    <Text variant="caption" color="brand" weight="700" textTransform="uppercase">
                      Premium
                    </Text>
                  </XStack>
                  <Text variant="h2">AED 449</Text>
                  <Text variant="bodySmall" color="secondary">
                    per month • renews Sep 30
                  </Text>
                </YStack>
                <Badge label="Active" variant="success" />
              </XStack>

              <Divider />

              <YStack gap="$2">
                <PlanBenefit text="Unlimited gym access" />
                <PlanBenefit text="All group classes" />
                <PlanBenefit text="1 PT session / month" />
                <PlanBenefit text="Locker & towel service" />
              </YStack>

              <XStack gap="$2" marginTop="$2">
                <Button
                  label="Change plan"
                  variant="outline"
                  size="sm"
                  onPress={() => toast.info('Plan switcher coming soon')}
                />
                <Button
                  label="Pause"
                  variant="secondary"
                  size="sm"
                  onPress={() => toast.info('Pause request submitted')}
                />
              </XStack>
            </YStack>
          </Card>
        </YStack>

        {/* Quick stats */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack gap="$3">
            <Card variant="outlined" padding="md" flex={1}>
              <Text variant="caption" color="muted">This month</Text>
              <Text variant="h3" marginTop="$1">AED 669</Text>
              <Text variant="caption" color="success">2 charges</Text>
            </Card>
            <Card variant="outlined" padding="md" flex={1}>
              <Text variant="caption" color="muted">Member since</Text>
              <Text variant="h3" marginTop="$1">Mar '25</Text>
              <Text variant="caption" color="muted">~6 months</Text>
            </Card>
          </XStack>
        </YStack>

        {/* Payment methods */}
        <YStack paddingHorizontal="$4" marginTop="$5" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="h3">Payment methods</Text>
            <Button
              label="Add"
              variant="ghost"
              size="sm"
              icon={<Plus size={14} color="$brand" />}
              onPress={() => toast.info('Add card coming soon')}
            />
          </XStack>

          <YStack gap="$2">
            {methods.map((m) => (
              <Card
                key={m.id}
                variant="outlined"
                padding="md"
                onPress={() => setDefault(m.id)}
                accessibilityLabel={`Set ${brandLabel[m.brand]} ending ${m.last4} as default`}
              >
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor="$brand50"
                    padding="$2.5"
                    borderRadius="$md"
                  >
                    <CardBrandLogo brand={m.brand} />
                  </YStack>
                  <YStack flex={1}>
                    <XStack alignItems="center" gap="$2">
                      <Text variant="label">
                        {brandLabel[m.brand]} •••• {m.last4}
                      </Text>
                      {m.isDefault && <Badge label="Default" variant="brand" />}
                    </XStack>
                    <Text variant="caption" color="muted">
                      Expires {m.expiry}
                    </Text>
                  </YStack>
                  {m.isDefault && (
                    <YStack
                      backgroundColor="$success500"
                      padding="$1.5"
                      borderRadius="$full"
                    >
                      <Check size={14} color="white" />
                    </YStack>
                  )}
                </XStack>
              </Card>
            ))}
          </YStack>

          <Button
            label="Update payment method"
            variant="outline"
            size="md"
            fullWidth
            icon={<CreditCard size={16} color="$brand" />}
            onPress={() => toast.info('Card update flow coming soon')}
          />
        </YStack>

        {/* Transaction history */}
        <YStack paddingHorizontal="$4" marginTop="$5" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <Text variant="h3">Transaction history</Text>
            <Text variant="bodySmall" color="brand" weight="600">
              Last 90 days
            </Text>
          </XStack>

          <Card variant="outlined" padding="none">
            <YStack>
              {TRANSACTIONS.map((tx, idx) => (
                <YStack key={tx.id}>
                  {idx > 0 && <Divider />}
                  <XStack
                    alignItems="center"
                    gap="$3"
                    padding="$4"
                    onPress={() => toast.info('Invoice download coming soon')}
                    pressStyle={{ opacity: 0.7 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Transaction: ${tx.description}, ${formatAED(tx.amount)}`}
                  >
                    <YStack
                      backgroundColor={
                        tx.status === 'paid'
                          ? '$success50'
                          : tx.status === 'failed'
                            ? '$danger50'
                            : '$warning50'
                      }
                      padding="$2.5"
                      borderRadius="$md"
                    >
                      <Calendar
                        size={18}
                        color={
                          tx.status === 'paid'
                            ? '$success700'
                            : tx.status === 'failed'
                              ? '$danger'
                              : '$warning'
                        }
                      />
                    </YStack>
                    <YStack flex={1}>
                      <Text variant="label" numberOfLines={1}>
                        {tx.description}
                      </Text>
                      <Text variant="caption" color="muted">
                        {formatDate(tx.date)}
                      </Text>
                    </YStack>
                    <YStack alignItems="flex-end" gap="$1">
                      <Text
                        variant="label"
                        color={tx.status === 'failed' ? 'danger' : 'primary'}
                      >
                        {formatAED(tx.amount)}
                      </Text>
                      <Badge
                        label={tx.status}
                        variant={
                          tx.status === 'paid'
                            ? 'success'
                            : tx.status === 'failed'
                              ? 'danger'
                              : 'warning'
                        }
                      />
                    </YStack>
                  </XStack>
                </YStack>
              ))}
            </YStack>
          </Card>

          <Button
            label="Download all invoices"
            variant="ghost"
            size="sm"
            icon={<Download size={14} color="$brand" />}
            onPress={() => toast.info('Bulk download coming soon')}
          />
        </YStack>

        {/* Danger zone */}
        <YStack paddingHorizontal="$4" marginTop="$6" gap="$2">
          <Text variant="caption" color="muted" textTransform="uppercase" weight="600">
            Plan management
          </Text>
          <Card variant="outlined" padding="md">
            <YStack gap="$3">
              <XStack alignItems="center" gap="$3">
                <YStack
                  backgroundColor="$danger50"
                  padding="$2.5"
                  borderRadius="$md"
                >
                  <Sparkles size={20} color="$danger" />
                </YStack>
                <YStack flex={1}>
                  <Text variant="label">Cancel membership</Text>
                  <Text variant="caption" color="muted">
                    You will keep access until Sep 30, 2026
                  </Text>
                </YStack>
              </XStack>
              <Button
                label="Cancel membership"
                variant="danger"
                size="md"
                fullWidth
                onPress={handleCancel}
              />
            </YStack>
          </Card>
        </YStack>

        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="caption" color="muted" align="center">
            Questions about billing? Email{' '}
            <Text variant="caption" color="brand" weight="600">
              hello@queenixgym.com
            </Text>
          </Text>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function PlanBenefit({ text }: { text: string }) {
  return (
    <XStack alignItems="center" gap="$2">
      <YStack backgroundColor="$brand50" padding="$1" borderRadius="$full">
        <Check size={12} color="$brand" />
      </YStack>
      <Text variant="bodySmall" color="primary">
        {text}
      </Text>
    </XStack>
  );
}

function CardBrandLogo({ brand }: { brand: PaymentMethod['brand'] }) {
  const styles = {
    visa: { text: 'VISA', color: '$brand' },
    mastercard: { text: 'MC', color: '$warning' },
    amex: { text: 'AMEX', color: '$info700' },
  } as const;
  const s = styles[brand];
  return (
    <Text variant="caption" color={s.color as any} weight="800">
      {s.text}
    </Text>
  );
}
