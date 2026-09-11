/**
 * Queenix Gym — Stripe webhook handler
 * Receives `payment_intent.*` events from Stripe and forwards them to Convex.
 * Mounted at /api/payments/stripe/webhook.
 *
 * Configure in Stripe Dashboard:
 *   Endpoint URL: https://<host>/api/payments/stripe/webhook
 *   Events to send: payment_intent.succeeded, payment_intent.payment_failed,
 *                   charge.refunded
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { verifyStripeWebhook } from '@queenix/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function callConvexMutation(path: string, args: Record<string, unknown>) {
  const siteUrl = process.env.CONVEX_SITE_URL;
  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  if (!siteUrl || !deployKey) {
    throw new Error('CONVEX_SITE_URL and CONVEX_DEPLOY_KEY must be set');
  }
  const res = await fetch(`${siteUrl}/api/mutation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Convex ${deployKey}`,
    },
    body: JSON.stringify({ path, args }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Convex ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json(
      { error: 'Missing stripe-signature or STRIPE_WEBHOOK_SECRET' },
      { status: 400 }
    );
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(body, signature, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await callConvexMutation('mutations/payments:recordPaymentSuccess', {
          stripePaymentIntentId: pi.id,
          amountCents: pi.amount,
          currency: pi.currency.toUpperCase(),
          paymentMethodLabel: pi.payment_method
            ? await describeStripePaymentMethod(pi.payment_method as string)
            : undefined,
          metadata: pi.metadata,
        });
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await callConvexMutation('mutations/payments:recordPaymentFailure', {
          stripePaymentIntentId: pi.id,
          failureReason: pi.last_payment_error?.message ?? 'Unknown error',
        });
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await callConvexMutation('mutations/payments:recordRefund', {
            stripePaymentIntentId: charge.payment_intent as string,
            amountCents: charge.amount_refunded,
            reason: (charge as any).reason ?? undefined,
          });
        }
        break;
      }
      default:
        // Ignore unhandled event types
        break;
    }
  } catch (err: any) {
    console.error('[stripe-webhook] handler error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function describeStripePaymentMethod(pmId: string): Promise<string | undefined> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.type === 'card' && pm.card) {
      return `${pm.card.brand.toUpperCase()} **** ${pm.card.last4}`;
    }
    if ((pm.type as string) === 'apple_pay') return 'Apple Pay';
    if ((pm.type as string) === 'google_pay') return 'Google Pay';
    return pm.type;
  } catch {
    return undefined;
  }
}
