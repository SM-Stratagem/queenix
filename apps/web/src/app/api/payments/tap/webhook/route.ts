/**
 * Queenix Gym — Tap Payments webhook handler
 * Receives charge status updates from Tap and forwards them to Convex.
 * Mounted at /api/payments/tap/webhook.
 *
 * Tap sends an HMAC-SHA256 signature in the `hashstring` header. We verify
 * it against TAP_WEBHOOK_SECRET before processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTapWebhook } from '@queenix/payments';

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

interface TapWebhookBody {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  reference?: { transaction?: string };
  transaction?: { status?: string };
  metadata?: Record<string, string>;
  payment_method?: { brand?: string; last4?: string; card_type?: string };
}

export async function POST(req: NextRequest) {
  const secret = process.env.TAP_WEBHOOK_SECRET;
  const signature = req.headers.get('hashstring') ?? req.headers.get('x-tap-signature');

  const body = await req.text();

  // If a secret is configured, verify the HMAC. If not, log a warning and proceed
  // (useful in development; production must always have a secret).
  if (secret) {
    const ok = verifyTapWebhook(body, signature, secret);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid Tap signature' }, { status: 400 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'TAP_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  let payload: TapWebhookBody;
  try {
    payload = JSON.parse(body);
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid JSON: ${err.message}` }, { status: 400 });
  }

  if (!payload.id) {
    return NextResponse.json({ error: 'Missing charge id' }, { status: 400 });
  }

  const status = payload.transaction?.status ?? payload.status;
  const amountCents = Math.round((payload.amount ?? 0) * 100);
  const currency = payload.currency ?? 'AED';
  const paymentMethodLabel = payload.payment_method
    ? `${(payload.payment_method.brand ?? 'CARD').toUpperCase()} **** ${payload.payment_method.last4 ?? '****'}`
    : undefined;

  try {
    switch (status) {
      case 'CAPTURED':
      case 'PAID':
        await callConvexMutation('mutations/payments:recordPaymentSuccess', {
          tapChargeId: payload.id,
          amountCents,
          currency,
          paymentMethodLabel,
          metadata: payload.metadata,
        });
        break;
      case 'FAILED':
      case 'DECLINED':
      case 'CANCELLED':
      case 'EXPIRED':
      case 'ABANDONED':
        await callConvexMutation('mutations/payments:recordPaymentFailure', {
          tapChargeId: payload.id,
          failureReason: status,
        });
        break;
      case 'REFUNDED':
        await callConvexMutation('mutations/payments:recordRefund', {
          tapChargeId: payload.id,
          amountCents,
          reason: 'requested_by_customer',
        });
        break;
      default:
        // Ignore intermediate states
        break;
    }
  } catch (err: any) {
    console.error('[tap-webhook] handler error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
