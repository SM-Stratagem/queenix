import React, { useCallback, useState } from 'react';
import { YStack, ScrollView } from 'tamagui';
import { RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Skeleton,
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import { useAuth } from '@/lib/auth';
import { openReceipt } from '@/lib/receipt';
import { formatDate, startOfMonthMs } from '@/components/payments/format';
import { CurrentPlanCard, type MembershipView } from '@/components/payments/CurrentPlanCard';
import {
  PaymentsHeader,
  QuickStats,
  TransactionsSection,
  DangerZone,
} from '@/components/payments/sections';
import { PaymentMethodsSection } from '@/components/payments/PaymentMethodsSection';
import { AddCardSheet } from '@/components/payments/AddCardSheet';

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
            try {
              await openReceipt(paymentId)
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
