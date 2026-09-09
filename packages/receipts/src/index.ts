/**
 * Queenix Gym — Receipt rendering
 * Generates an HTML receipt string for a payment/invoice.
 * The web route at /api/payments/[id]/receipt returns this HTML so the mobile
 * app can render it in a WebView, and members can print-to-PDF from the browser.
 *
 * UAE VAT (5%) is computed and displayed on the receipt.
 */

export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface ReceiptInput {
  invoiceNumber: string;
  memberName: string;
  memberEmail?: string;
  paymentId: string;
  paidAt: number; // unix ms
  lineItems: ReceiptLineItem[];
  subtotalCents: number;
  vatRate?: number; // default 0.05 (UAE)
  vatCents: number;
  totalCents: number;
  currency: string;
  paymentMethodLabel: string; // e.g. "Visa **** 4242"
  brandName?: string; // e.g. "Queenix Gym"
  brandAddress?: string; // e.g. "Dubai, UAE"
  vatNumber?: string; // TRN
  logoUrl?: string;
}

const BRAND_COLOR = '#0081cc';
const BRAND_DARK = '#006699';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2);
  return `${currency} ${amount}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Render a self-contained, print-friendly HTML receipt.
 */
export const renderReceiptHtml = (input: ReceiptInput): string => {
  const brandName = input.brandName ?? 'Queenix Gym';
  const brandAddress = input.brandAddress ?? 'Dubai, UAE';
  const vatRate = input.vatRate ?? 0.05;
  const vatPct = `${(vatRate * 100).toFixed(0)}%`;

  const logo = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(brandName)}" class="logo" />`
    : `<div class="logo-fallback">${escapeHtml(brandName)}</div>`;

  const lineRows = input.lineItems
    .map(
      (li, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(li.description)}</td>
          <td class="num">${li.quantity}</td>
          <td class="num">${formatMoney(li.unitPriceCents, input.currency)}</td>
          <td class="num">${formatMoney(li.totalCents, input.currency)}</td>
        </tr>
      `
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Receipt ${escapeHtml(input.invoiceNumber)} — ${escapeHtml(brandName)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    background: #f6f7f9;
    padding: 32px 16px;
  }
  .receipt {
    max-width: 720px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    overflow: hidden;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 28px 32px;
    background: linear-gradient(135deg, ${BRAND_COLOR} 0%, ${BRAND_DARK} 100%);
    color: #fff;
  }
  .logo { max-height: 56px; }
  .logo-fallback {
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  .header-meta { text-align: right; font-size: 13px; opacity: 0.9; }
  .header-meta .invoice-no { font-size: 18px; font-weight: 700; opacity: 1; margin-bottom: 2px; }

  .body { padding: 28px 32px; }
  .row { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
  .col { flex: 1; }
  .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #6b7280; margin-bottom: 4px; }
  .value { font-size: 14px; font-weight: 600; color: #1a1a1a; }

  table { width: 100%; border-collapse: collapse; margin: 16px 0 24px; }
  th {
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #6b7280;
    padding: 8px 12px;
    border-bottom: 2px solid #e5e7eb;
  }
  th.num, td.num { text-align: right; }
  td {
    padding: 12px;
    font-size: 14px;
    border-bottom: 1px solid #f1f2f4;
  }

  .totals { margin-left: auto; width: 280px; }
  .totals .row { margin: 6px 0; }
  .totals .row.total {
    border-top: 2px solid #1a1a1a;
    margin-top: 12px;
    padding-top: 12px;
    font-size: 18px;
    font-weight: 700;
  }

  .footer {
    padding: 20px 32px;
    background: #f9fafb;
    text-align: center;
    color: #6b7280;
    font-size: 13px;
  }
  .footer .thanks {
    font-size: 16px;
    color: ${BRAND_COLOR};
    font-weight: 700;
    margin-bottom: 6px;
  }
  .print-btn {
    display: inline-block;
    margin-top: 16px;
    padding: 10px 20px;
    background: ${BRAND_COLOR};
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .receipt { box-shadow: none; border-radius: 0; max-width: 100%; }
    .print-btn { display: none; }
  }
</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      ${logo}
      <div class="header-meta">
        <div class="invoice-no">${escapeHtml(input.invoiceNumber)}</div>
        <div>${escapeHtml(formatDate(input.paidAt))}</div>
      </div>
    </div>
    <div class="body">
      <div class="row">
        <div class="col">
          <div class="label">Billed to</div>
          <div class="value">${escapeHtml(input.memberName)}</div>
          ${input.memberEmail ? `<div style="color:#6b7280;font-size:13px;margin-top:2px">${escapeHtml(input.memberEmail)}</div>` : ''}
        </div>
        <div class="col">
          <div class="label">From</div>
          <div class="value">${escapeHtml(brandName)}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:2px">${escapeHtml(brandAddress)}</div>
          ${input.vatNumber ? `<div style="color:#6b7280;font-size:13px">TRN ${escapeHtml(input.vatNumber)}</div>` : ''}
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="label">Payment method</div>
          <div class="value">${escapeHtml(input.paymentMethodLabel)}</div>
        </div>
        <div class="col">
          <div class="label">Payment ID</div>
          <div class="value" style="font-family:ui-monospace,Menlo,monospace;font-size:12px">${escapeHtml(input.paymentId)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th class="num">Qty</th>
            <th class="num">Unit</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lineRows || `<tr><td colspan="5" style="text-align:center;color:#6b7280">No items</td></tr>`}
        </tbody>
      </table>

      <div class="totals">
        <div class="row">
          <span class="label" style="margin:0">Subtotal</span>
          <span class="value">${formatMoney(input.subtotalCents, input.currency)}</span>
        </div>
        <div class="row">
          <span class="label" style="margin:0">VAT (${vatPct})</span>
          <span class="value">${formatMoney(input.vatCents, input.currency)}</span>
        </div>
        <div class="row total">
          <span>Total</span>
          <span>${formatMoney(input.totalCents, input.currency)}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="thanks">Thank you for training with us</div>
      <div>Questions? Email <a href="mailto:hello@queenixgym.com" style="color:${BRAND_COLOR};text-decoration:none">hello@queenixgym.com</a></div>
      <button class="print-btn" onclick="window.print()">Print or save as PDF</button>
    </div>
  </div>
</body>
</html>`;
};

/**
 * Compute UAE VAT breakdown from a list of line items.
 * Subtotal is the sum of line item totals; VAT is 5% of subtotal (rounded to
 * nearest fils). Total = subtotal + VAT.
 */
export const computeVat = (
  lineItems: ReceiptLineItem[],
  rate = 0.05
): { subtotalCents: number; vatCents: number; totalCents: number } => {
  const subtotalCents = lineItems.reduce((acc, li) => acc + li.totalCents, 0);
  const vatCents = Math.round(subtotalCents * rate);
  return { subtotalCents, vatCents, totalCents: subtotalCents + vatCents };
};
