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
 * Staff only (BetterAuth session): coffee → coffee/operations/finance,
 * salon → salon/operations/finance; superadmin/admin always. Convex is
 * reached with the admin key (internal functions). Without provider keys
 * configured the route reports which gateway is missing instead of failing
 * silently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@queenix/payments';
import { convexAdmin } from '@queenix/auth/convex-admin';
import { hasStaffRole, sessionUser } from '@/lib/session-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PaymentLinkRequest {
  venue?: string;
  orderId?: string;
}

export async function POST(req: NextRequest) {
  const user = await sessionUser(req);
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

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
  if (!hasStaffRole(user, ['finance', 'operations', venue])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const settings = await convexAdmin<any>('query', 'queries/commerce:getVenueSettingsInternal', { venue });
    if (!settings?.enabled) {
      return NextResponse.json({ error: `Online payments are disabled for ${venue}` }, { status: 409 });
    }
    if (settings.provider !== 'tap' && settings.provider !== 'stripe') {
      return NextResponse.json(
        { error: `${venue} is set to cash — switch its gateway to Tap or Stripe first` },
        { status: 409 }
      );
    }
    const mock = process.env.PAYMENTS_PROVIDER === 'mock'; // createPayment fakes the charge
    if (!mock && settings.provider === 'tap' && !process.env.TAP_SECRET_KEY) {
      return NextResponse.json({ error: 'TAP_SECRET_KEY is not configured' }, { status: 409 });
    }
    if (!mock && settings.provider === 'stripe' && !process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY is not configured' }, { status: 409 });
    }

    const order = await convexAdmin<any>('query', 'queries/commerce:getOrderForPayment', {
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

    await convexAdmin('mutation', 'mutations/commerce:setOrderPaymentLink', {
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
