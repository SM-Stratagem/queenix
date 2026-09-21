import React, { useCallback, useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import {
  Screen,
  Text,
  Card,
  Button,
  Badge,
  Skeleton,
  ErrorState,
  EmptyState,
  Input,
  Sheet,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import { useAuth } from '@/lib/auth';
import {
  formatDate,
  formatMoney,
  normalizeBrand,
  statusToVariant,
  startOfMonthMs,
} from '@/components/payments/format';
import { CurrentPlanCard, type MembershipView } from '@/components/payments/CurrentPlanCard';
import { PaymentsHeader, QuickStats } from '@/components/payments/sections';
import { CardBrandLogo, type Brand } from '@/components/payments/CardBrandLogo';

export default function PaymentsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Queries — guarded so they don't fire when no user is signed in.
  const userId = session?.userId ?? null;
  const paymentMethods = useConvexQuery(
    api.queries.payments.getMyPaymentMethods,
    userId ? {} : 'skip',
  );
  const invoices = useConvexQuery(
    api.queries.payments.getMyInvoices,
    userId ? { limit: 30 } : 'skip',
  );
  const currentMembership = useConvexQuery(
    api.queries.memberships.getCurrentMembership,
    userId ? {} : 'skip',
  );

  // Mutations
  const setDefaultPm = useConvexMutation(api.mutations.payments.setDefaultPaymentMethod);
  const addPm = useConvexMutation(api.mutations.payments.addPaymentMethod);
  const removePm = useConvexMutation(api.mutations.payments.removePaymentMethod);
  const [cardSheet, setCardSheet] = useState(false);
  const [cardLast4, setCardLast4] = useState('');
  const [cardBrand, setCardBrand] = useState('visa');
  const [cardExp, setCardExp] = useState('');
  const [cardBusy, setCardBusy] = useState(false);

  async function onAddCardSubmit() {
    const last4 = cardLast4.replace(/\D/g, '');
    if (last4.length !== 4) {
      toast.error('Enter the last 4 digits');
      return;
    }
    const m = cardExp.match(/^\s*(\d{1,2})\s*\/\s*(\d{2,4})\s*$/);
    if (!m) {
      toast.error('Expiry as MM/YY');
      return;
    }
    let year = Number(m[2]);
    if (year < 100) year += 2000;
    setCardBusy(true);
    try {
      await addPm({
        provider: 'tap',
        type: cardBrand === 'apple_pay' ? 'apple_pay' : 'card',
        last4,
        brand: cardBrand === 'apple_pay' ? undefined : cardBrand,
        expiryMonth: Number(m[1]),
        expiryYear: year,
        isDefault: methodsList.length === 0,
      });
      toast.success('Card saved on file');
      setCardSheet(false);
      setCardLast4('');
      setCardBrand('visa');
      setCardExp('');
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not save card');
    } finally {
      setCardBusy(false);
    }
  }

  async function onRemoveCard(id: string) {
    try {
      await removePm({ paymentMethodId: id as any });
      toast.success('Card removed');
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not remove card');
    }
  }
  const freezeMembershipM = useConvexMutation(api.mutations.payments.freezeMembership);
  const unfreezeMembershipM = useConvexMutation(api.mutations.payments.unfreezeMembership);
  const cancelMembershipM = useConvexMutation(api.mutations.payments.cancelMembership);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const methodsList = Array.isArray(paymentMethods) ? paymentMethods : [];
  const invoicesList = Array.isArray(invoices) ? invoices : [];
  const membership = (currentMembership as MembershipView | null | undefined) ?? null;
  const isInitialLoad =
    paymentMethods === undefined ||
    invoices === undefined ||
    currentMembership === undefined;

  if (isInitialLoad && !refreshing) {
    return (
      <Screen padded={false}>
        <YStack padding="$4" gap="$3">
          <Text variant="h1">Payments</Text>
          <Skeleton height={140} />
          <YStack gap="$3">
            <Skeleton height={80} />
            <Skeleton height={80} />
          </YStack>
          <Skeleton height={120} />
          <Skeleton height={200} />
        </YStack>
      </Screen>
    );
  }

  if (membership === null && (paymentMethods === null || invoices === null)) {
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

  const thisMonthCutoff = startOfMonthMs();
  const thisMonth = invoicesList.filter(
    (inv) => (inv as any).paidAt && (inv as any).paidAt >= thisMonthCutoff,
  );
  const thisMonthTotal = thisMonth.reduce(
    (acc, inv) => acc + ((inv as any).totalCents as number),
    0,
  );

  const memberSinceDate = membership ? new Date(membership.startDate) : null;
  const memberSince =
    memberSinceDate
      ?.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) ?? null;
  const monthsActive = memberSinceDate
    ? Math.max(1, Math.floor((Date.now() - memberSinceDate.getTime()) / (30 * 24 * 60 * 60 * 1000)))
    : null;

  return (
    <Screen scroll padded={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="$brand" />
        }
      >
        <YStack paddingTop="$4" paddingHorizontal="$4" paddingBottom="$2">
          <PaymentsHeader title="Payments" onBack={() => router.back()} />
        </YStack>

        <YStack paddingHorizontal="$4" marginTop="$3">
          <CurrentPlanCard
            membership={membership}
            onChangePlan={() => router.push('/(member)/plans')}
            onFreeze={async () => {
              if (!membership) return
              try {
                await freezeMembershipM({ membershipId: membership._id, days: 30, reason: 'User-initiated' })
                toast.success('Membership frozen for 30 days')
              } catch (err: any) {
                toast.error(err?.message ?? 'Could not freeze')
              }
            }}
            onUnfreeze={async () => {
              if (!membership) return
              try {
                await unfreezeMembershipM({ membershipId: membership._id })
                toast.success('Membership reactivated')
              } catch (err: any) {
                toast.error(err?.message ?? 'Could not reactivate')
              }
            }}
          />
        </YStack>

        <YStack paddingHorizontal="$4" marginTop="$4">
          <QuickStats
            thisMonthTotal={thisMonthTotal}
            thisMonthCount={thisMonth.length}
            memberSince={memberSince}
            monthsActive={monthsActive}
          />
        </YStack>

        <PaymentMethodsSection
          methods={methodsList as any}
          onSetDefault={async (id) => {
            try {
              await setDefaultPm({ paymentMethodId: id })
              toast.success('Default payment method updated')
            } catch (err: any) {
              toast.error(err?.message ?? 'Could not update default')
            }
          }}
          onAddCard={() => setCardSheet(true)}
          onRemoveCard={onRemoveCard}
        />
        <AddCardSheet
          open={cardSheet}
          onOpenChange={setCardSheet}
          last4={cardLast4}
          setLast4={setCardLast4}
          brand={cardBrand}
          setBrand={setCardBrand}
          exp={cardExp}
          setExp={setCardExp}
          busy={cardBusy}
          onSubmit={onAddCardSubmit}
        />

        <TransactionsSection
          invoices={invoicesList as any}
          onViewReceipt={async (paymentId) => {
            const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') as string
            const url = `${apiBase}/api/payments/${paymentId}/receipt`
            try {
              const supported = await Linking.canOpenURL(url)
              if (supported) await Linking.openURL(url)
              else toast.error('Cannot open receipt URL')
            } catch (err: any) {
              toast.error(err?.message ?? 'Could not open receipt')
            }
          }}
        />

        {membership && membership.status !== 'cancelled' && (
          <DangerZone
            endDateLabel={formatDate(membership.endDate)}
            onCancel={async () => {
              if (!membership) return
              try {
                await cancelMembershipM({ membershipId: membership._id })
                toast.success('Membership cancelled. Access remains until period end.')
              } catch (err: any) {
                toast.error(err?.message ?? 'Could not cancel')
              }
            }}
          />
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

// ----- Inline section components (kept here so the file remains a single
//       import surface; they're small enough not to warrant separate files)

function PaymentMethodsSection({
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

function AddCardSheet({
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
          <Input value={last4} onChangeText={setLast4} placeholder="4242" accessibilityLabel="Last 4 digits" />
        </YStack>
        <YStack gap="$1">
          <Text variant="label">Expiry (MM/YY)</Text>
          <Input value={exp} onChangeText={setExp} placeholder="08/27" accessibilityLabel="Expiry" />
        </YStack>
        <Button label={busy ? 'Saving…' : 'Save card'} onPress={onSubmit} variant="primary" size="lg" fullWidth disabled={busy} />
        <YStack flex={1} />
      </YStack>
    </Sheet>
  )
}

function PaymentMethodCardContent({
  method,
  brand,
}: {
  method: any
  brand: Brand
}) {
  const expiry =
    method.expiryMonth && method.expiryYear
      ? `Expires ${String(method.expiryMonth).padStart(2, '0')}/${String(method.expiryYear).slice(-2)}`
      : method.type === 'apple_pay'
        ? 'Apple Pay'
        : method.type === 'google_pay'
          ? 'Google Pay'
          : method.provider

  return (
    <>
      <YStack backgroundColor="$brand50" padding="$2.5" borderRadius="$md">
        <CardBrandLogo brand={brand} />
      </YStack>
      <YStack flex={1}>
        <Text variant="label">
          {brand.toUpperCase().slice(0, 4)} •••• {method.last4 ?? '****'}
        </Text>
        <Text variant="caption" color="muted">
          {expiry}
        </Text>
      </YStack>
    </>
  )
}

function TransactionsSection({
  invoices,
  onViewReceipt,
}: {
  invoices: Array<{
    _id: string
    paymentId: string
    status: string
    totalCents: number
    currency: string
    paidAt?: number
    lineItems?: Array<{ description: string }>
  }>
  onViewReceipt: (paymentId: string) => void
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$5" gap="$3">
      <Text variant="h3">Transaction history</Text>
      {invoices.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          message="Your receipts will show up here after your first payment."
        />
      ) : (
        <Card variant="outlined" padding="none">
          <YStack>
            {invoices.map((inv, idx) => (
              <YStack key={inv._id}>
                {idx > 0 && <Divider />}
                <YStack
                  padding="$4"
                  onPress={() => onViewReceipt(inv.paymentId)}
                  pressStyle={{ opacity: 0.7 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Transaction: ${inv.lineItems?.[0]?.description ?? 'Payment'}, ${formatMoney(inv.totalCents, inv.currency)}`}
                >
                  <XStackStacked
                    description={inv.lineItems?.[0]?.description ?? 'Payment'}
                    date={inv.paidAt ? formatDate(inv.paidAt) : 'Pending'}
                    amountLabel={formatMoney(inv.totalCents, inv.currency)}
                    status={inv.status}
                    amountIsDanger={inv.status === 'refunded' || inv.status === 'void'}
                    statusVariant={statusToVariant(inv.status)}
                  />
                </YStack>
              </YStack>
            ))}
          </YStack>
        </Card>
      )}
    </YStack>
  )
}

function XStackStacked({
  description,
  date,
  amountLabel,
  status,
  amountIsDanger,
  statusVariant,
}: {
  description: string
  date: string
  amountLabel: string
  status: string
  amountIsDanger: boolean
  statusVariant: 'success' | 'danger' | 'warning'
}) {
  return (
    <XStack alignItems="center" gap="$3">
      <YStack flex={1}>
        <Text variant="label" numberOfLines={1}>
          {description}
        </Text>
        <Text variant="caption" color="muted">
          {date}
        </Text>
      </YStack>
      <YStack alignItems="flex-end" gap="$1">
        <Text variant="label" color={amountIsDanger ? 'danger' : 'primary'}>
          {amountLabel}
        </Text>
        <Badge label={status} variant={statusVariant} />
      </YStack>
    </XStack>
  )
}

function DangerZone({
  endDateLabel,
  onCancel,
}: {
  endDateLabel: string
  onCancel: () => void
}) {
  return (
    <YStack paddingHorizontal="$4" marginTop="$6" gap="$2">
      <Text variant="caption" color="muted" textTransform="uppercase" weight="600">
        Plan management
      </Text>
      <Card variant="outlined" padding="md">
        <YStack gap="$3">
          <YStack alignItems="center" gap="$3">
            <Text variant="label">Cancel membership</Text>
            <Text variant="caption" color="muted" align="center">
              You will keep access until {endDateLabel}
            </Text>
          </YStack>
          <Button label="Cancel membership" variant="danger" size="md" fullWidth onPress={onCancel} />
        </YStack>
      </Card>
    </YStack>
  )
}

function Divider() {
  return null // Local Divider from @queenix/ui used below; this keeps the file's own count low.
}
