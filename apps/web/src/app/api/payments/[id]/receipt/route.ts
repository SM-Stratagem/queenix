/**
 * Queenix Gym — Payment receipt (HTML)
 * Renders a print-friendly HTML receipt for a payment (members can
 * print-to-PDF from the browser).
 *
 *   GET  /api/payments/[id]/receipt          BetterAuth session: the payment's
 *                                            owner, or finance/admin staff.
 *   POST /api/payments/[id]/receipt          same auth → { token } valid 5 min
 *   GET  /api/payments/[id]/receipt?t=token  no session needed
 *
 * The token exists for the mobile app: it opens the receipt in the system
 * browser, which has no session cookie. The app mints a token with its
 * session (authClient.$fetch) and opens the ?t= URL. Tokens are an HMAC of
 * (paymentId, expiry) under AUTH_SECRET — short-lived and bound to one receipt.
 */

import { createHmac } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { computeVat, renderReceiptHtml } from '@queenix/receipts';
import { convexAdmin } from '@queenix/auth/convex-admin';
import { safeEqual, secret } from '@queenix/auth/env';
import { hasStaffRole, sessionUser } from '@/lib/session-user';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BRAND_NAME = 'Queenix Gym';
const BRAND_ADDRESS = 'Dubai, UAE';
const BRAND_VAT = process.env.QUEENIX_VAT_NUMBER ?? '';
const TOKEN_TTL_MS = 5 * 60 * 1000;

interface ReceiptContext {
  payment: any;
  invoice: any;
  member: any;
  defaultPaymentMethod: any;
}

function sign(paymentId: string, exp: number): string {
  return createHmac('sha256', secret('AUTH_SECRET', 'dev-secret-replace-in-production-min-32-chars'))
    .update(`receipt:${paymentId}:${exp}`)
    .digest('base64url');
}

function tokenOk(paymentId: string, token: string): boolean {
  const [expRaw, mac] = token.split('.');
  const exp = Number(expRaw);
  return Boolean(mac) && exp > Date.now() && safeEqual(mac!, sign(paymentId, exp));
}

const DENIED: Record<number, [string, string]> = {
  401: ['Sign in required', 'Sign in to view this receipt, or open it again from the app.'],
  403: ['Not allowed', 'You do not have permission to view this receipt.'],
  404: ['Receipt not available', 'This receipt does not exist.'],
  409: ['Receipt not available yet', 'This payment has not been completed, so there is no receipt.'],
};

/** Only money actually taken gets a receipt. */
const RECEIPT_STATUSES = new Set(['succeeded', 'refunded']);

function htmlError(status: number) {
  const [title, text] = DENIED[status] ?? ['Error', 'Something went wrong.'];
  return new NextResponse(
    `<!doctype html><html><body style="font-family:system-ui;padding:32px"><h1>${title}</h1><p>${text}</p></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

const loadContext = (id: string) =>
  convexAdmin<ReceiptContext | null>('query', 'queries/payments:getReceiptContext', { paymentId: id });

/** Session auth + owner-or-finance check → the receipt context, or an HTTP status. */
async function authorize(req: NextRequest, id: string): Promise<ReceiptContext | number> {
  const user = await sessionUser(req);
  if (!user) return 401;
  const ctx = await loadContext(id);
  if (!ctx?.payment) return 404;
  if (ctx.payment.userId !== user._id && !hasStaffRole(user, ['finance'])) return 403;
  return ctx;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await authorize(req, id);
  if (typeof ctx === 'number') return NextResponse.json({ error: DENIED[ctx]?.[0] }, { status: ctx });
  const exp = Date.now() + TOKEN_TTL_MS;
  return NextResponse.json({ token: `${exp}.${sign(id, exp)}`, expiresAt: exp });
}

function describePaymentMethod(pm: any): string {
  if (!pm) return 'Card on file';
  if (pm.type === 'apple_pay') return 'Apple Pay';
  if (pm.type === 'google_pay') return 'Google Pay';
  const brand = (pm.brand ?? 'CARD').toUpperCase();
  const last4 = pm.last4 ?? '****';
  return `${brand} **** ${last4}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('t');
  const ctx = token ? (tokenOk(id, token) ? ((await loadContext(id)) ?? 404) : 401) : await authorize(req, id);
  if (typeof ctx === 'number') return htmlError(ctx);
  if (!ctx.payment) return htmlError(404);
  if (!RECEIPT_STATUSES.has(ctx.payment.status)) return htmlError(409);

  const { payment, invoice, member } = ctx;
  const lineItems = invoice?.lineItems ?? [
    {
      description: payment.description,
      quantity: 1,
      unitPriceCents: payment.amountCents,
      totalCents: payment.amountCents,
    },
  ];
  // Prices are VAT-inclusive: recompute the split from the line items (their
  // totals are the amount charged) so pre-fix invoices that added 5% on top
  // still render a total equal to what was paid.
  const vatRate = invoice?.vatRate ?? (String(payment.currency).toUpperCase() === 'AED' ? 0.05 : 0);
  const { subtotalCents, vatCents, totalCents } = computeVat(lineItems, vatRate);

  const html = renderReceiptHtml({
    invoiceNumber: invoice?.invoiceNumber ?? `QNX-${payment._id.slice(-6).toUpperCase()}`,
    memberName: member?.fullName ?? 'Valued Member',
    memberEmail: member?.email,
    paymentId: payment._id,
    paidAt: invoice?.paidAt ?? payment.updatedAt ?? payment.createdAt,
    lineItems,
    subtotalCents,
    vatRate,
    vatCents,
    totalCents,
    currency: payment.currency,
    paymentMethodLabel: describePaymentMethod(ctx.defaultPaymentMethod),
    brandName: BRAND_NAME,
    brandAddress: BRAND_ADDRESS,
    vatNumber: BRAND_VAT,
    logoUrl: process.env.QUEENIX_LOGO_URL,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, max-age=60',
    },
  });
}
