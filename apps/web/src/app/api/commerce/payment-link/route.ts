/**
 * Queenix Gym — Venue payment link.
 *
 * Staff (coffee / salon dashboard) asks for an online payment link for one
 * order/booking. The route reads the venue's gateway settings, creates a
 * real provider charge (Tap hosted page or Stripe), stores the link back
 * on the order, and returns it for the staff to share with the customer.
 *
 *   POST /api/commerce/payment-link
 *   { "venue": "coffee" | "salon", "orderId": "<id>" }
 *
 * Uses the raw Convex HTTP API with CONVEX_DEPLOY_KEY (same pattern as
 * /api/payments/create-intent). Without provider keys configured the
 * route reports which gateway is missing instead of failing silently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@queenix/payments';
import { getConvexApiUrl } from '@/lib/convex-env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PaymentLinkRequest {
  venue?: string;
  orderId?: string;
}

async function convexCall(siteUrl: string, headers: Record<string, string>, kind: 'query' | 'mutation', path: string, args: Record<string, unknown>) {
  const r = await fetch(`${siteUrl}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args }),
  });
  if (!r.ok) {
    throw new Error(`Convex ${kind} ${path} failed: ${r.status}`);
  }
  const data = await r.json();
  return data.value;
}

export async function POST(req: NextRequest) {
  let body: PaymentLinkRequest;
  try {
    body = await req.json();
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid JSON: ${err.message}` }, { status: 400 });
  }

  const venue = body.venue === 'salon' ? 'salon' : body.venue === 'coffee' ? 'coffee' : null;
  if (!venue || !body.orderId) {
    return NextResponse.json({ error: 'venue (coffee|salon) and orderId are required' }, { status: 400 });
  }

  const siteUrl = getConvexApiUrl();
  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  if (!siteUrl) {
    return NextResponse.json({ error: 'CONVEX_SITE_URL not configured' }, { status: 500 });
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (deployKey) headers.Authorization = `Convex ${deployKey}`;

  try {
    const settings = await convexCall(siteUrl, headers, 'query', 'queries/commerce:getVenueSettingsInternal', { venue });
    if (!settings?.enabled) {
      return NextResponse.json({ error: `Online payments are disabled for ${venue}` }, { status: 409 });
    }
    if (settings.provider !== 'tap' && settings.provider !== 'stripe') {
      return NextResponse.json(
        { error: `${venue} is set to cash — switch its gateway to Tap or Stripe first` },
        { status: 409 }
      );
    }
    if (settings.provider === 'tap' && !process.env.TAP_SECRET_KEY) {
      return NextResponse.json({ error: 'TAP_SECRET_KEY is not configured' }, { status: 409 });
    }
    if (settings.provider === 'stripe' && !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY is not configured' }, { status: 409 });
    }

    const order = await convexCall(siteUrl, headers, 'query', 'queries/commerce:getOrderForPayment', {
      venue,
      orderId: body.orderId,
    });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.paidAt) {
      return NextResponse.json({ error: 'Order is already paid' }, { status: 409 });
    }
    if (!order.amountCents || order.amountCents <= 0) {
      return NextResponse.json({ error: 'Order has no billable amount' }, { status: 409 });
    }
    if (order.paymentLink) {
      return NextResponse.json({ provider: order.paymentProvider, paymentLink: order.paymentLink, reused: true });
    }

    const currency = (settings.currency ?? 'AED').toUpperCase();
    const intent = await createPayment({
      amountCents: order.amountCents,
      currency,
      userId: String(order.userId),
      description: `Queenix ${venue} order ${String(order.id).slice(0, 8)}`,
      idempotencyKey: `venue-${venue}-${String(order.id)}`,
      metadata: { venue, orderId: String(order.id) },
    });

    // A shareable link: Tap gives a hosted page; Stripe gives a client
    // secret for the app sheet plus a dashboard payment URL is not
    // public — so return whichever the provider produced.
    const paymentLink =
      intent.redirectUrl ?? (intent.clientSecret ? `stripe:${intent.id}:${intent.clientSecret}` : null);
    if (!paymentLink) {
      return NextResponse.json({ error: 'Provider returned no shareable link' }, { status: 502 });
    }

    await convexCall(siteUrl, headers, 'mutation', 'mutations/commerce:setOrderPaymentLink', {
      venue,
      orderId: String(order.id),
      provider: intent.provider,
      paymentLink,
    });

    return NextResponse.json({ provider: intent.provider, paymentLink, reused: false });
  } catch (err: any) {
    console.error('[commerce/payment-link] error', err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
