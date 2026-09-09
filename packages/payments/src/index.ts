/**
 * Queenix Gym — Payment integration layer
 * Provider-agnostic payment service for Queenix Gym.
 * Supports Stripe (international) and Tap Payments (UAE/MENA).
 *
 * Designed to run on the Next.js server (apps/web). Stripe uses the official
 * SDK; Tap uses REST. A simple router auto-picks based on currency and env.
 */

import Stripe from 'stripe';

// ============================================================
// Types
// ============================================================

export type PaymentProvider = 'stripe' | 'tap';

export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export interface PaymentIntent {
  id: string;
  provider: PaymentProvider;
  clientSecret?: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, string>;
  redirectUrl?: string; // for Tap hosted page
  raw?: unknown;
}

export type PaymentMethodType = 'card' | 'apple_pay' | 'google_pay';

export interface PaymentMethod {
  id: string;
  provider: PaymentProvider;
  type: PaymentMethodType;
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface Receipt {
  id: string;
  paymentId: string;
  memberId: string;
  amountCents: number;
  currency: string;
  description: string;
  paidAt: number;
  pdfUrl?: string;
  invoiceNumber: string;
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Lazily construct a Stripe client. Reads from env each time to keep tests easy.
 */
function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(key, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
  });
}

function getAppUrl(): string {
  return process.env.APP_URL ?? 'http://localhost:3000';
}

function getTapBaseUrl(): string {
  return process.env.TAP_BASE_URL ?? 'https://api.tap.company';
}

function mapTapStatus(status: string | undefined): PaymentStatus {
  switch (status) {
    case 'CAPTURED':
    case 'PAID':
      return 'succeeded';
    case 'FAILED':
    case 'DECLINED':
    case 'CANCELLED':
    case 'EXPIRED':
    case 'ABANDONED':
    case 'UNATTEMPTED':
      return 'failed';
    case 'INITIATED':
    case 'IN_PROGRESS':
    case 'AUTHORIZED':
    case '3DS_SECURE_OTP':
    case '3DS_VERIFY':
    case 'IN_REVIEW':
      return 'requires_confirmation';
    default:
      return 'requires_payment_method';
  }
}

// ============================================================
// Stripe adapter
// ============================================================

export interface CreateStripeIntentParams {
  amountCents: number;
  currency: string;
  userId: string;
  description: string;
  metadata?: Record<string, string>;
  idempotencyKey: string;
  receiptEmail?: string;
}

export const createStripePayment = async (
  params: CreateStripeIntentParams
): Promise<PaymentIntent> => {
  const stripe = getStripeClient();
  const intent = await stripe.paymentIntents.create(
    {
      amount: params.amountCents,
      currency: params.currency.toLowerCase(),
      description: params.description,
      receipt_email: params.receiptEmail,
      automatic_payment_methods: { enabled: true },
      metadata: { userId: params.userId, ...(params.metadata ?? {}) },
    },
    { idempotencyKey: params.idempotencyKey }
  );

  return {
    id: intent.id,
    provider: 'stripe',
    clientSecret: intent.client_secret ?? undefined,
    amountCents: intent.amount,
    currency: intent.currency.toUpperCase(),
    status: intent.status as PaymentStatus,
    metadata: (intent.metadata as Record<string, string>) ?? {},
    raw: intent,
  };
};

export const confirmStripePayment = async (
  paymentIntentId: string
): Promise<PaymentIntent> => {
  const stripe = getStripeClient();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return {
    id: intent.id,
    provider: 'stripe',
    clientSecret: intent.client_secret ?? undefined,
    amountCents: intent.amount,
    currency: intent.currency.toUpperCase(),
    status: intent.status as PaymentStatus,
    metadata: (intent.metadata as Record<string, string>) ?? {},
    raw: intent,
  };
};

export const createStripeRefund = async (
  paymentIntentId: string,
  amountCents?: number,
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
) => {
  const stripe = getStripeClient();
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
    reason,
  });
};

// ============================================================
// Tap Payments adapter (UAE / MENA)
// Docs: https://developers.tap.company/reference/charge-create
// ============================================================

export interface CreateTapChargeParams {
  amountCents: number;
  currency: string;
  userId: string;
  description: string;
  redirectUrl: string;
  idempotencyKey: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  metadata?: Record<string, string>;
}

interface TapChargeResponse {
  id: string;
  status?: string;
  transaction?: {
    url?: string;
    status?: string;
  };
  metadata?: Record<string, string>;
  amount?: number;
  currency?: string;
}

export const createTapCharge = async (
  params: CreateTapChargeParams
): Promise<PaymentIntent> => {
  const secret = process.env.TAP_SECRET_KEY;
  if (!secret) {
    throw new Error('TAP_SECRET_KEY is not set');
  }

  const response = await fetch(`${getTapBaseUrl()}/v2/charges`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: params.amountCents / 100,
      currency: params.currency,
      threeDSSecure: true,
      description: params.description,
      reference: { transaction: params.idempotencyKey },
      receipt: { email: false, sms: false },
      customer: {
        id: params.userId,
        email: params.customerEmail,
        phone: params.customerPhone
          ? { country_code: '971', number: params.customerPhone.replace(/^\+?971/, '') }
          : undefined,
        name: params.customerName,
      },
      source: { id: 'src_card' },
      redirect: { url: params.redirectUrl },
      post: { url: `${getAppUrl()}/api/payments/tap/webhook` },
      metadata: { userId: params.userId, ...(params.metadata ?? {}) },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tap charge failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as TapChargeResponse;
  const status = data.transaction?.status ?? data.status;
  return {
    id: data.id,
    provider: 'tap',
    redirectUrl: data.transaction?.url,
    amountCents: params.amountCents,
    currency: params.currency,
    status: mapTapStatus(status),
    metadata: data.metadata ?? params.metadata,
    raw: data,
  };
};

export const retrieveTapCharge = async (chargeId: string): Promise<PaymentIntent> => {
  const secret = process.env.TAP_SECRET_KEY;
  if (!secret) {
    throw new Error('TAP_SECRET_KEY is not set');
  }
  const response = await fetch(`${getTapBaseUrl()}/v2/charges/${chargeId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tap retrieve failed: ${response.status} ${text}`);
  }
  const data = (await response.json()) as TapChargeResponse;
  return {
    id: data.id,
    provider: 'tap',
    redirectUrl: data.transaction?.url,
    amountCents: Math.round((data.amount ?? 0) * 100),
    currency: data.currency ?? 'AED',
    status: mapTapStatus(data.transaction?.status ?? data.status),
    metadata: data.metadata,
    raw: data,
  };
};

// ============================================================
// Provider router — auto-pick based on currency
// ============================================================

export interface CreatePaymentParams {
  amountCents: number;
  currency: string;
  userId: string;
  description: string;
  redirectUrl?: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
}

/**
 * Create a payment via the appropriate provider. AED (UAE) routes to Tap
 * when configured, otherwise Stripe. All other currencies always go to Stripe.
 */
export const createPayment = async (params: CreatePaymentParams): Promise<PaymentIntent> => {
  const isAED = params.currency.toUpperCase() === 'AED';
  const hasTap = Boolean(process.env.TAP_SECRET_KEY);

  if (isAED && hasTap) {
    return createTapCharge({
      amountCents: params.amountCents,
      currency: params.currency,
      userId: params.userId,
      description: params.description,
      idempotencyKey: params.idempotencyKey,
      redirectUrl: params.redirectUrl ?? `${getAppUrl()}/payments/success`,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      metadata: params.metadata,
    });
  }

  return createStripePayment({
    amountCents: params.amountCents,
    currency: params.currency,
    userId: params.userId,
    description: params.description,
    idempotencyKey: params.idempotencyKey,
    metadata: params.metadata,
    receiptEmail: params.customerEmail,
  });
};

/**
 * Choose provider without actually creating a charge. Useful for UI hints.
 */
export const pickProvider = (currency: string): PaymentProvider => {
  if (currency.toUpperCase() === 'AED' && process.env.TAP_SECRET_KEY) {
    return 'tap';
  }
  return 'stripe';
};

// ============================================================
// Invoice number generator
// ============================================================

/**
 * Generate a Queenix invoice number like QNX-2026-00001.
 * The caller is responsible for ensuring uniqueness — append a per-tenant
 * counter from the database in production.
 */
export const generateInvoiceNumber = (sequence: number, year = new Date().getFullYear()): string => {
  const padded = String(sequence).padStart(5, '0');
  return `QNX-${year}-${padded}`;
};

// ============================================================
// Webhook signature verification
// ============================================================

export const verifyStripeWebhook = (
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
  return stripe.webhooks.constructEvent(payload, signature, secret);
};

/**
 * Tap webhooks are signed via HMAC-SHA256 over the raw body using a secret
 * (Tap-Secret header). We expose a helper so the route handler can verify.
 * Reference: https://developers.tap.company/docs/webhooks
 */
export const verifyTapWebhook = (
  rawBody: string,
  signature: string | null,
  secret: string,
  encoding: Stripe.Webhook.Encoding = 'utf8'
): boolean => {
  if (!signature) return false;
  // Lazy require so this file stays browser-safe.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const crypto = require('node:crypto') as typeof import('node:crypto');
  const hmac = crypto.createHmac('sha256', secret).update(rawBody, encoding).digest('hex');
  // timing-safe compare
  const a = Buffer.from(hmac);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};
