/**
 * Queenix Gym — Choose a plan (member)
 * Lists all active membership plans and starts checkout.
 * On tap of "Choose", we create a Convex payment + call the Next.js server
 * route to obtain a clientSecret (Stripe) or redirectUrl (Tap), then open
 * the appropriate hosted flow.
 *
 * Stripe SDK note: the React Native client-side @stripe/stripe-react-native
 * library is not in the dependency tree yet. For V1, we open the Stripe
 * PaymentSheet via a WebView deep-link fallback (URL = the receipt URL with
 * `?client_secret=…`) or, for Tap, the hosted redirect URL.
 */

import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
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
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import { Check, Crown, Sparkles, Star, X } from '@tamagui/lucide-icons';
import { useAuth } from '@/lib/auth';

interface MembershipPlan {
  _id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  durationDays: number;
  features: string[];
  maxClassesPerMonth: number;
  maxPTSessions: number;
  isTrial: boolean;
  trialDays: number;
}

function formatPrice(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(0)}`;
}

const planEmoji: Record<string, string> = {
  Basic: '🌱',
  Premium: '👑',
  VIP: '💎',
};

export default function PlansScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const plans = useConvexQuery(api.queries.memberships.getAvailablePlans, {});
  const createCheckout = useConvexMutation(api.mutations.payments.createMembershipCheckout);

  const handleChoose = async (plan: MembershipPlan) => {
    if (!session?.userId) {
      toast.error('Please sign in to choose a plan');
      return;
    }
    setLoadingPlanId(plan._id);
    try {
      const result = await createCheckout({ planId: plan._id });
      // Call the Next.js server to create the actual provider intent.
      const apiBase = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') as string;
      const res = await fetch(`${apiBase}/api/payments/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: result.paymentId,
          userId: session.userId,
          name: session.fullName,
          email: session.email,
          phone: session.phone,
          amountCents: result.amountCents,
          currency: result.currency,
          description: `${plan.name} membership — ${plan.durationDays} days`,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? 'Failed to start checkout');
      }
      const intent = await res.json();
      // Tap charges are handled via a hosted redirect page.
      if (intent.provider === 'tap' && intent.redirectUrl) {
        await Linking.openURL(intent.redirectUrl);
        toast.info('Complete payment in your browser');
        return;
      }
      // Stripe: in V1 we surface the test-card info and open a hosted receipt URL
      // with the client_secret as a query param. A native PaymentSheet integration
      // is the V1.5 follow-up.
      toast.success('Stripe integration coming in V1.5 — using test card 4242 4242 4242 4242');
      const apiBase2 = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000') as string;
      const url = `${apiBase2}/api/payments/${result.paymentId}/receipt?client_secret=${encodeURIComponent(intent.clientSecret ?? '')}`;
      await Linking.openURL(url);
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not start checkout');
    } finally {
      setLoadingPlanId(null);
    }
  };

  if (plans === undefined) {
    return (
      <Screen padded={false}>
        <YStack padding="$4" gap="$3">
          <Text variant="h1">Choose a plan</Text>
          <Skeleton height={160} />
          <Skeleton height={160} />
          <Skeleton height={160} />
        </YStack>
      </Screen>
    );
  }

  if (plans === null) {
    return (
      <Screen padded={false}>
        <ErrorState
          title="Could not load plans"
          message="Pull down to retry, or check your connection."
          onRetry={() => router.replace('/(member)/plans')}
        />
      </Screen>
    );
  }

  if (plans.length === 0) {
    return (
      <Screen padded={false}>
        <EmptyState
          title="No plans available"
          message="Memberships are not currently available. Please check back soon."
        />
      </Screen>
    );
  }

  return (
    <Screen scroll padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
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
              <X size={20} color="$textPrimary" />
            </YStack>
            <Text variant="h1">Choose a plan</Text>
          </XStack>
          <Text variant="body" color="secondary" marginTop="$2">
            Pick the membership that fits your training rhythm. Cancel any time.
          </Text>
        </YStack>

        {/* Plans list */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          {plans.map((plan: MembershipPlan) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              loading={loadingPlanId === plan._id}
              onChoose={() => handleChoose(plan)}
            />
          ))}
        </YStack>

        <YStack paddingHorizontal="$4" marginTop="$4">
          <Text variant="caption" color="muted" align="center">
            Questions about plans? Email{' '}
            <Text variant="caption" color="brand" weight="600">
              hello@queenixgym.com
            </Text>
          </Text>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  plan,
  loading,
  onChoose,
}: {
  plan: MembershipPlan;
  loading: boolean;
  onChoose: () => void;
}) {
  const isPremium = plan.name === 'Premium';
  const isVip = plan.name === 'VIP';
  const isFeatured = isPremium || isVip;
  return (
    <Card
      variant={isFeatured ? 'elevated' : 'outlined'}
      padding="lg"
      borderColor={isFeatured ? '$brand' : undefined}
    >
      <YStack gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$2">
            <Text variant="h2">{planEmoji[plan.name] ?? '🏋️'}</Text>
            <Text variant="h2">{plan.name}</Text>
          </XStack>
          {isPremium && <Badge label="Popular" variant="brand" />}
          {isVip && <Badge label="Best value" variant="success" />}
        </XStack>
        <Text variant="bodySmall" color="secondary">
          {plan.description}
        </Text>
        <XStack alignItems="baseline" gap="$2">
          <Text variant="h1">{formatPrice(plan.priceCents, plan.currency)}</Text>
          <Text variant="bodySmall" color="muted">
            / {plan.durationDays} days
          </Text>
        </XStack>
        <YStack gap="$2">
          {plan.features.map((f, idx) => (
            <XStack key={idx} alignItems="center" gap="$2">
              <YStack backgroundColor="$brand50" padding="$1" borderRadius="$full">
                <Check size={12} color="$brand" />
              </YStack>
              <Text variant="bodySmall" color="primary">
                {f}
              </Text>
            </XStack>
          ))}
        </YStack>
        <Button
          label={loading ? 'Starting…' : `Choose ${plan.name}`}
          onPress={onChoose}
          loading={loading}
          variant={isFeatured ? 'primary' : 'outline'}
          fullWidth
          icon={isVip ? <Sparkles size={16} color={isFeatured ? 'white' : '$brand'} /> : isPremium ? <Crown size={16} color={isFeatured ? 'white' : '$brand'} /> : <Star size={16} color={isFeatured ? 'white' : '$brand'} />}
        />
      </YStack>
    </Card>
  );
}
