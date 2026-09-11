import React, { useState } from 'react';
import { YStack, XStack, ScrollView, RefreshControl } from 'tamagui';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Divider,
  Skeleton,
  ErrorState,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import { useAuth } from '@/lib/auth';
import {
  CreditCard,
  Plus,
  Download,
  Receipt,
  Banknote,
  Wallet,
  ShieldCheck,
  Star,
  Gift,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  X,
} from '@tamagui/lucide-icons';
import { PlanBenefit } from '@/components/payments/PlanBenefit';
import { CardBrandLogo, type Brand } from '@/components/payments/CardBrandLogo';

// ============================================================
// Local view types
// ============================================================

function normalizeBrand(b?: string): Brand {
  const v = (b ?? '').toLowerCase();
  if (v.includes('master')) return 'mastercard';
  if (v.includes('amex') || v.includes('american')) return 'amex';
  return 'visa';
}

const brandLabel: Record<Brand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
};

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMoney(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

function statusToVariant(s: string): 'success' | 'danger' | 'warning' {
  if (s === 'succeeded' || s === 'paid') return 'success';
  if (s === 'failed' || s === 'cancelled') return 'danger';
  return 'warning';
}

// ============================================================
// Screen
// ============================================================

export default function PaymentsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const paymentMethods = useConvexQuery(api.queries.payments.getMyPaymentMethods, {});
  const invoices = useConvexQuery(api.queries.payments.getMyInvoices, { limit: 50 });
  const currentMembership = useConvexQuery(api.queries.memberships.getCurrentMembership, {});

  const setDefaultPm = useConvexMutation(api.mutations.payments.setDefaultPaymentMethod);
  const freezeMembershipM = useConvexMutation(api.mutations.payments.freezeMembership);
  const unfreezeMembershipM = useConvexMutation(api.mutations.payments.unfreezeMembership);
  const cancelMembershipM = useConvexMutation(api.mutations.payments.cancelMembership);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const isInitialLoad =
    paymentMethods === undefined ||
    invoices === undefined ||
    currentMembership === undefined;
  const hasError =
    paymentMethods === null || invoices === null || currentMembership === null;

  if (isInitialLoad && !refreshing) {
    return (
      <Screen padded={false}>
        <YStack padding="$4" gap="$3">
          <Text variant="h1">Payments</Text>
          <Skeleton height={140} />
          <XStack gap="$3">
            <Skeleton height={80} flex={1} />
            <Skeleton height={80} flex={1} />
          </XStack>
          <Skeleton height={120} />
          <Skeleton height={200} />
        </YStack>
      </Screen>
    );
  }

  if (hasError) {
    return (
      <Screen padded={false}>
        <ErrorState
          title="Could not load billing"
          message="Pull to refresh, or try again."
          onRetry={onRefresh}
        />
      </Screen>
    );
  }

  const safeMethods = paymentMethods ?? [];
  const safeInvoices = invoices ?? [];
  const safeMembership = currentMembership ?? null;

  // Quick stats
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const thisMonthInvoices = safeInvoices.filter(
    (inv) => inv.paidAt && inv.paidAt >= startOfMonth.getTime()
  );
  const thisMonthTotal = thisMonthInvoices.reduce((acc, inv) => acc + inv.totalCents, 0);

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultPm({ paymentMethodId: id as any });
      toast.success('Default payment method updated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not update default');
    }
  };

  const handleFreeze = async () => {
    if (!safeMembership) return;
    try {
      await freezeMembershipM({
        membershipId: safeMembership._id,
        days: 30,
        reason: 'User-initiated from app',
      });
      toast.success('Membership frozen for 30 days');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not freeze');
    }
  };

  const handleUnfreeze = async () => {
    if (!safeMembership) return;
    try {
      await unfreezeMembershipM({ membershipId: safeMembership._id });
      toast.success('Membership reactivated');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not reactivate');
    }
  };

  const handleCancel = async () => {
    if (!safeMembership) return;
    try {
      await cancelMembershipM({ membershipId: safeMembership._id });
      toast.success('Membership cancelled. Access remains until period end.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not cancel');
    }
  };

  const handleUpdateCard = () => {
    toast.info('Stripe integration coming in V1.5 — using test card 4242 4242 4242 4242');
  };

  const handleAddCard = () => {
    toast.info('Add card coming in V1.5');
  };

  const handleViewReceipt = async (paymentId: string) => {
    const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') as string;
    const url = `${apiBase}/api/payments/${paymentId}/receipt`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else toast.error('Cannot open receipt URL');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not open receipt');
    }
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
            {safeMembership ? (
              <YStack gap="$3">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack gap="$1">
                    <XStack alignItems="center" gap="$2">
                      <Crown size={16} color="$brand" />
                      <Text variant="caption" color="brand" weight="700" textTransform="uppercase">
                        {(safeMembership as any).plan?.name ?? 'Active'}
                      </Text>
                    </XStack>
                    <Text variant="h2">
                      {formatMoney(
                        (safeMembership as any).plan?.priceCents ?? 0,
                        (safeMembership as any).plan?.currency ?? 'AED'
                      )}
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {safeMembership.status === 'frozen'
                        ? `Frozen until ${formatDate(safeMembership.endDate)}`
                        : `renews ${formatDate(safeMembership.endDate)}`}
                    </Text>
                  </YStack>
                  <Badge
                    label={safeMembership.status}
                    variant={
                      safeMembership.status === 'active'
                        ? 'success'
                        : safeMembership.status === 'frozen'
                          ? 'warning'
                          : 'danger'
                    }
                  />
                </XStack>

                <Divider />

                <YStack gap="$2">
                  {(((safeMembership as any).plan?.features as string[]) ?? []).map(
                    (f: string, idx: number) => (
                      <PlanBenefit key={idx} text={f} />
                    )
                  )}
                </YStack>

                <XStack gap="$2" marginTop="$2">
                  <Button
                    label="Change plan"
                    variant="outline"
                    size="sm"
                    onPress={() => router.push('/(member)/plans')}
                  />
                  {safeMembership.status === 'active' ? (
                    <Button
                      label="Pause"
                      variant="secondary"
                      size="sm"
                      icon={<Pause size={14} color="$textPrimary" />}
                      onPress={handleFreeze}
                    />
                  ) : safeMembership.status === 'frozen' ? (
                    <Button
                      label="Resume"
                      variant="secondary"
                      size="sm"
                      icon={<Play size={14} color="$textPrimary" />}
                      onPress={handleUnfreeze}
                    />
                  ) : null}
                </XStack>
              </YStack>
            ) : (
              <YStack gap="$3" alignItems="center">
                <Text variant="h3">No active membership</Text>
                <Text variant="bodySmall" color="secondary" align="center">
                  Choose a plan to start training with us.
                </Text>
                <Button
                  label="View plans"
                  variant="primary"
                  icon={<RefreshCw size={16} color="white" />}
                  onPress={() => router.push('/(member)/plans')}
                />
              </YStack>
            )}
          </Card>
        </YStack>

        {/* Quick stats */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack gap="$3">
            <Card variant="outlined" padding="md" flex={1}>
              <Text variant="caption" color="muted">This month</Text>
              <Text variant="h3" marginTop="$1">
                {formatMoney(thisMonthTotal, 'AED')}
              </Text>
              <Text variant="caption" color="success">
                {thisMonthInvoices.length} {thisMonthInvoices.length === 1 ? 'charge' : 'charges'}
              </Text>
            </Card>
            <Card variant="outlined" padding="md" flex={1}>
              <Text variant="caption" color="muted">Member since</Text>
              <Text variant="h3" marginTop="$1">
                {safeMembership
                  ? new Date(safeMembership.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      year: '2-digit',
                    })
                  : '—'}
              </Text>
              <Text variant="caption" color="muted">
                {safeMembership
                  ? `${Math.max(
                      1,
                      Math.floor(
                        (Date.now() - safeMembership.startDate) / (30 * 24 * 60 * 60 * 1000)
                      )
                    )} months`
                  : '—'}
              </Text>
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
              onPress={handleAddCard}
            />
          </XStack>

          {safeMethods.length === 0 ? (
            <EmptyState
              title="No payment methods"
              message="Add a card to manage your membership."
              actionLabel="Add card"
              onAction={handleAddCard}
            />
          ) : (
            <YStack gap="$2">
              {safeMethods.map((m) => {
                const brand = normalizeBrand(m.brand);
                return (
                  <Card
                    key={m._id}
                    variant="outlined"
                    padding="md"
                    onPress={() => handleSetDefault(m._id)}
                    accessibilityLabel={`Set ${brandLabel[brand]} ending ${m.last4 ?? '****'} as default`}
                  >
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        backgroundColor="$brand50"
                        padding="$2.5"
                        borderRadius="$md"
                      >
                        <CardBrandLogo brand={brand} />
                      </YStack>
                      <YStack flex={1}>
                        <XStack alignItems="center" gap="$2">
                          <Text variant="label">
                            {brandLabel[brand]} •••• {m.last4 ?? '****'}
                          </Text>
                          {m.isDefault && <Badge label="Default" variant="brand" />}
                        </XStack>
                        <Text variant="caption" color="muted">
                          {m.expiryMonth && m.expiryYear
                            ? `Expires ${String(m.expiryMonth).padStart(2, '0')}/${String(m.expiryYear).slice(-2)}`
                            : m.type === 'apple_pay'
                              ? 'Apple Pay'
                              : m.type === 'google_pay'
                                ? 'Google Pay'
                                : m.provider}
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
                );
              })}
            </YStack>
          )}

          <Button
            label="Update payment method"
            variant="outline"
            size="md"
            fullWidth
            icon={<CreditCard size={16} color="$brand" />}
            onPress={handleUpdateCard}
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

          {safeInvoices.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              message="Your receipts will show up here after your first payment."
            />
          ) : (
            <Card variant="outlined" padding="none">
              <YStack>
                {safeInvoices.map((inv, idx) => (
                  <YStack key={inv._id}>
                    {idx > 0 && <Divider />}
                    <XStack
                      alignItems="center"
                      gap="$3"
                      padding="$4"
                      onPress={() => handleViewReceipt(inv.paymentId)}
                      pressStyle={{ opacity: 0.7 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Transaction: ${inv.lineItems[0]?.description ?? 'Payment'}, ${formatMoney(inv.totalCents, inv.currency)}`}
                    >
                      <YStack
                        backgroundColor={
                          inv.status === 'paid'
                            ? '$success50'
                            : inv.status === 'refunded' || inv.status === 'void'
                              ? '$danger50'
                              : '$warning50'
                        }
                        padding="$2.5"
                        borderRadius="$md"
                      >
                        <Calendar
                          size={18}
                          color={
                            inv.status === 'paid'
                              ? '$success700'
                              : inv.status === 'refunded' || inv.status === 'void'
                                ? '$danger'
                                : '$warning'
                          }
                        />
                      </YStack>
                      <YStack flex={1}>
                        <Text variant="label" numberOfLines={1}>
                          {inv.lineItems[0]?.description ?? 'Payment'}
                        </Text>
                        <Text variant="caption" color="muted">
                          {inv.paidAt ? formatDate(inv.paidAt) : 'Pending'}
                        </Text>
                      </YStack>
                      <YStack alignItems="flex-end" gap="$1">
                        <Text
                          variant="label"
                          color={inv.status === 'refunded' ? 'danger' : 'primary'}
                        >
                          {formatMoney(inv.totalCents, inv.currency)}
                        </Text>
                        <Badge label={inv.status} variant={statusToVariant(inv.status)} />
                      </YStack>
                    </XStack>
                  </YStack>
                ))}
              </YStack>
            </Card>
          )}

          <Button
            label="Download all invoices"
            variant="ghost"
            size="sm"
            icon={<Download size={14} color="$brand" />}
            onPress={() => toast.info('Bulk download coming soon')}
          />
        </YStack>

        {/* Danger zone */}
        {safeMembership && safeMembership.status !== 'cancelled' && (
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
                      You will keep access until {formatDate(safeMembership.endDate)}
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
        )}

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

