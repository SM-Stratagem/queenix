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
 * reached with the admin key (internal functions).
 *
 * Gateway policy: no usable gateway (keys missing, or PAYMENTS_PROVIDER=mock
 * in production) → 503 "Payment gateway not configured". Only a hosted
 * payment page URL (Tap) is a shareable link; Stripe needs Checkout /
 * Payment Links, which are not built yet → 501. A Stripe client secret is
 * never returned or stored as a link. Mock mode (dev only) returns a
 * `mock:` placeholder link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPayment, gatewayMode } from '@queenix/payments';
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
    const mode = gatewayMode(settings.provider);
    if (!mode) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 });
    }
    if (mode === 'live' && settings.provider === 'stripe') {
      return NextResponse.json(
        { error: 'Stripe payment links are not available yet — use Tap or cash' },
        { status: 501 }
      );
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
    // Reuse only a real hosted page (or a mock link in mock mode). Legacy
    // `stripe:<id>:<clientSecret>` values are not links: never hand them out.
    const stored = String(order.paymentLink ?? '');
    if (/^https?:\/\//.test(stored) || (mode === 'mock' && stored.startsWith('mock:'))) {
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

    // Only a hosted page is shareable; a client secret is never a link.
    const paymentLink = intent.redirectUrl ?? (mode === 'mock' ? `mock:${intent.id}` : null);
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
