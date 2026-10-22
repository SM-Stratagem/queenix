/**
 * Queenix Gym — Create payment intent
 * Server-side route that calls Stripe or Tap to create a real PaymentIntent
 * for a payment record previously created in Convex.
 *
 * The mobile app:
 *   1. calls `mutations/payments:createMembershipCheckout` (or
 *      `createPaymentIntent`) to get a `paymentId`,
 *   2. POSTs `{ paymentId, name?, email?, phone? }` here with its BetterAuth
 *      session (authClient.$fetch attaches the Expo session cookie),
 *   3. receives back `{ clientSecret, redirectUrl, provider }`,
 *   4. opens Stripe PaymentSheet or the Tap redirect URL.
 *
 * The caller must be signed in and own the payment. Amount, currency and
 * description always come from the Convex record, never the request body.
 * PAYMENTS_PROVIDER=mock returns a fake intent for local testing (never in
 * production). No usable gateway → 503 "Payment gateway not configured".
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPayment, gatewayMode, pickProvider } from '@queenix/payments';
import { convexAdmin } from '@queenix/auth/convex-admin';
import { sessionUser } from '@/lib/session-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateIntentRequest {
  paymentId?: string;
  name?: string;
  email?: string;
  phone?: string;
  redirectUrl?: string;
  metadata?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: CreateIntentRequest;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid JSON: ${err.message}` }, { status: 400 });
  }
  const { paymentId } = body;
  if (!paymentId) return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });

  try {
    const ctx = await convexAdmin<{ payment: any } | null>('query', 'queries/payments:getReceiptContext', {
      paymentId,
    });
    const payment = ctx?.payment;
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.userId !== user._id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (payment.status !== 'pending') {
      return NextResponse.json({ error: `Payment is ${payment.status}` }, { status: 409 });
    }

    const currency = String(payment.currency ?? 'AED').toUpperCase();
    if (!gatewayMode(pickProvider(currency))) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 });
    }

    const intent = await createPayment({
      amountCents: payment.amountCents,
      currency,
      userId: user._id,
      description: payment.description,
      redirectUrl: body.redirectUrl,
      idempotencyKey: payment.idempotencyKey,
      metadata: { ...(body.metadata ?? {}), paymentId },
      customerEmail: body.email ?? user.email,
      customerPhone: body.phone,
      customerName: body.name ?? user.fullName,
    });

    // Persist the provider intent back onto the Convex record.
    await convexAdmin('mutation', 'mutations/payments:attachProviderIntent', {
      paymentId,
      provider: intent.provider,
      stripePaymentIntentId: intent.provider === 'stripe' ? intent.id : undefined,
      tapChargeId: intent.provider === 'tap' ? intent.id : undefined,
    });

    return NextResponse.json({
      provider: intent.provider,
      paymentIntentId: intent.id,
      clientSecret: intent.clientSecret,
      redirectUrl: intent.redirectUrl,
      status: intent.status,
    });
  } catch (err: any) {
    console.error('[create-intent] error', err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
