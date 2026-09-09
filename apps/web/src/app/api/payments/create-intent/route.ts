/**
 * Queenix Gym — Create payment intent
 * Server-side route that calls Stripe or Tap to create a real PaymentIntent
 * for a payment record previously created in Convex.
 *
 * The mobile app:
 *   1. calls `mutations/payments:createMembershipCheckout` (or
 *      `createPaymentIntent`) to get a `paymentId` + amount + currency,
 *   2. POSTs to this route with `{ paymentId, userId, name, email, phone }`,
 *   3. receives back `{ clientSecret, redirectUrl, provider }`,
 *   4. opens Stripe PaymentSheet or the Tap redirect URL.
 *
 * The route then attaches the provider's intent id back to the Convex record
 * via `mutations/payments:attachProviderIntent`.
 *
 * This route uses the raw Convex HTTP API (POST /api/mutation, /api/query)
 * so it works with `CONVEX_DEPLOY_KEY` without needing the generated client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@queenix/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateIntentRequest {
  paymentId: string;
  userId: string;
  description?: string;
  amountCents?: number;
  currency?: string;
  name?: string;
  email?: string;
  phone?: string;
  redirectUrl?: string;
  metadata?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  let body: CreateIntentRequest;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid JSON: ${err.message}` }, { status: 400 });
  }

  const { paymentId, userId } = body;
  if (!paymentId || !userId) {
    return NextResponse.json(
      { error: 'paymentId and userId are required' },
      { status: 400 }
    );
  }

  const siteUrl = process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  if (!siteUrl) {
    return NextResponse.json({ error: 'CONVEX_SITE_URL not configured' }, { status: 500 });
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (deployKey) headers.Authorization = `Convex ${deployKey}`;

  // Read the payment record from Convex
  let paymentRecord: any = null;
  try {
    const r = await fetch(`${siteUrl}/api/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        path: 'queries/payments:getMyPayments',
        args: { limit: 200 },
      }),
    });
    if (r.ok) {
      const data = await r.json();
      const list = (data.value as any[]) ?? [];
      paymentRecord = list.find((p) => p._id === paymentId) ?? null;
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Convex read failed: ${err.message}` }, { status: 500 });
  }

  if (!paymentRecord) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  }
  if (paymentRecord.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const amountCents = body.amountCents ?? paymentRecord.amountCents;
  const currency = (body.currency ?? paymentRecord.currency ?? 'AED').toUpperCase();
  const description = body.description ?? paymentRecord.description;

  try {
    const intent = await createPayment({
      amountCents,
      currency,
      userId,
      description,
      redirectUrl: body.redirectUrl,
      idempotencyKey: paymentRecord.idempotencyKey,
      metadata: { paymentId, ...(body.metadata ?? {}) },
      customerEmail: body.email,
      customerPhone: body.phone,
      customerName: body.name,
    });

    // Persist provider intent back to the Convex record
    await fetch(`${siteUrl}/api/mutation`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        path: 'mutations/payments:attachProviderIntent',
        args: {
          paymentId,
          provider: intent.provider,
          stripePaymentIntentId: intent.provider === 'stripe' ? intent.id : undefined,
          tapChargeId: intent.provider === 'tap' ? intent.id : undefined,
        },
      }),
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
