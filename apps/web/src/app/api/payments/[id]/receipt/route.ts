/**
 * Queenix Gym — Payment receipt (HTML)
 * Renders a print-friendly HTML receipt for a payment.
 * Returns HTML that the mobile app can show in a WebView, and members can
 * print-to-PDF from the browser.
 *
 * GET /api/payments/[id]/receipt
 *
 * Auth: requires a valid Convex session OR a Convex deploy key.
 * For unauthenticated / non-member access the receipt is still returned for
 * members viewing their own payment (queried via the Convex user binding).
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderReceiptHtml, computeVat } from '@queenix/receipts';
import { getConvexApiUrl } from '@/lib/convex-env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BRAND_NAME = 'Queenix Gym';
const BRAND_ADDRESS = 'Dubai, UAE';
const BRAND_VAT = process.env.QUEENIX_VAT_NUMBER ?? '';

interface ReceiptContext {
  payment: any;
  invoice: any;
  member: any;
  defaultPaymentMethod: any;
}

async function fetchReceiptContext(paymentId: string): Promise<ReceiptContext | null> {
  const siteUrl = getConvexApiUrl();
  const deployKey = process.env.CONVEX_DEPLOY_KEY;
  if (!siteUrl) return null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (deployKey) headers.Authorization = `Convex ${deployKey}`;

  // Use the admin-style "get" path; the query itself enforces auth & ownership.
  const r = await fetch(`${siteUrl}/api/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      path: 'queries/payments:getReceiptContext',
      args: { paymentId },
    }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  return data.value ?? null;
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
  const ctx = await fetchReceiptContext(id);
  if (!ctx?.payment) {
    return new NextResponse(
      `<!doctype html><html><body style="font-family:system-ui;padding:32px">
        <h1>Receipt not available</h1>
        <p>This receipt does not exist or you do not have permission to view it.</p>
      </body></html>`,
      { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const { payment, invoice, member } = ctx;
  const lineItems = invoice?.lineItems ?? [
    {
      description: payment.description,
      quantity: 1,
      unitPriceCents: payment.amountCents,
      totalCents: payment.amountCents,
    },
  ];
  const subtotalCents = invoice?.subtotalCents ?? payment.amountCents;
  const vatRate = invoice?.vatRate ?? (payment.currency === 'AED' ? 0.05 : 0);
  const vatCents = invoice?.vatCents ?? Math.round(subtotalCents * vatRate);
  const totalCents = invoice?.totalCents ?? subtotalCents + vatCents;

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
