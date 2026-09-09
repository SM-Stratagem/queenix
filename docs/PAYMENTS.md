# Queenix Gym — Payments

> **Status:** V1 integration complete. Stripe (international) and Tap (UAE / MENA) are wired through a single provider router. The mobile `plans.tsx` screen is the entry point for buying or renewing a membership; `payments.tsx` is the member's billing dashboard.

---

## Architecture at a glance

```
┌────────────────────────────┐         ┌─────────────────────────────┐
│  Mobile app (Expo)         │         │  Web admin (Next.js)        │
│  plans.tsx                 │         │  apps/web/src/app/api/      │
│  payments.tsx              │         │    payments/                │
│                            │         │                             │
│  useConvexQuery/           │         │  /create-intent  ──┐        │
│  useConvexMutation         │         │  /stripe/webhook   │        │
└─────────────┬──────────────┘         │  /tap/webhook      │        │
              │                        │  /[id]/receipt     │        │
              │                        └──────┬─────────────┘        │
              │                               │                      │
              ▼                               ▼                      │
       ┌────────────────────────────────────────────┐                 │
       │  Convex (durable record of every payment)  │◀── webhooks ───┘
       │  payments, paymentMethods, invoices        │
       └────────────────┬───────────────────────────┘
                        │
                        ▼
            ┌─────────────────────────┐
            │  Stripe  /  Tap         │
            │  (PCI-compliant,        │
            │   tokenized)            │
            └─────────────────────────┘
```

The mobile app never talks to Stripe or Tap directly. The flow is:

1. The app calls a Convex mutation (`createMembershipCheckout` or `createPaymentIntent`) to create a `pending` payment record and reserve an idempotency key.
2. The app POSTs the `paymentId` to the Next.js server route `/api/payments/create-intent`, which calls Stripe or Tap based on currency and returns a `clientSecret` (Stripe) or `redirectUrl` (Tap).
3. The app opens the appropriate hosted UI:
   - **Tap (AED)** — the user's browser opens the Tap hosted page.
   - **Stripe (USD / EUR / …)** — V1 opens the receipt URL with a `client_secret` query param; a native `@stripe/stripe-react-native` PaymentSheet is the V1.5 follow-up.
4. The provider sends a webhook to the web app. The route calls Convex's `recordPaymentSuccess` / `recordPaymentFailure` / `recordRefund` mutations.
5. On success, Convex creates an `invoices` row with a Queenix invoice number (`QNX-YYYY-#####`) and, for `type === 'membership'`, activates a new `memberships` row.

---

## Setup

### 1. Stripe (international)

1. Create a Stripe account at <https://dashboard.stripe.com>.
2. From **Developers → API keys**, copy the **Secret key** (`sk_test_…` for testing, `sk_live_…` for production).
3. Set the following in the web app's environment (`.env.local` in `apps/web/` and the deployed environment):

   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   APP_URL=https://your-domain.example
   CONVEX_SITE_URL=https://your-deployment.convex.site
   CONVEX_DEPLOY_KEY=prod:...
   ```

4. Install the Stripe CLI for local webhook forwarding:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   stripe listen --forward-to http://localhost:3000/api/payments/stripe/webhook
   ```
   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`.

5. In **Developers → Webhooks**, add an endpoint:
   - URL: `https://your-domain.example/api/payments/stripe/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

### 2. Tap Payments (UAE / MENA)

1. Create a Tap merchant account at <https://www.tap.company>.
2. From the dashboard, copy:
   - **Secret key** (`sk_test_…` for sandbox, `sk_live_…` for production).
   - **Webhook secret** (HMAC-SHA256 key, configured under Webhooks).
3. Add to the web app's environment:
   ```bash
   TAP_SECRET_KEY=sk_test_...
   TAP_WEBHOOK_SECRET=whsec_...
   # Optional, defaults to https://api.tap.company
   TAP_BASE_URL=https://api.tap.company
   ```
4. In the Tap dashboard, register a webhook endpoint:
   - URL: `https://your-domain.example/api/payments/tap/webhook`
   - Headers: `hashstring` (HMAC-SHA256 of the raw body)
   - Events: `charge.captured`, `charge.failed`, `charge.refunded`

The provider router (`packages/payments/src/index.ts`) automatically selects Tap for `AED` whenever `TAP_SECRET_KEY` is set. Otherwise it falls back to Stripe.

### 3. Optional branding

```bash
QUEENIX_LOGO_URL=https://cdn.queenix.com/logo.png
QUEENIX_VAT_NUMBER=100123456700003
```

The VAT number is shown on every receipt (UAE TRN is mandatory on B2B invoices).

---

## Test card numbers

### Stripe

| Card                | Result                  |
|---------------------|-------------------------|
| `4242 4242 4242 4242` | Always succeeds       |
| `4000 0000 0000 0002` | Generic decline       |
| `4000 0000 0000 9995` | Insufficient funds    |
| `4000 0027 6000 3184` | Requires 3D Secure    |

Use any future expiry (e.g. `12/34`) and any CVC.

### Tap sandbox

| Card                | Result            |
|---------------------|-------------------|
| `4111 1111 1111 1111` | Success          |
| `4000 0000 0000 0002` | Declined         |
| `5123 4500 0000 0008` | 3-D Secure test  |

---

## Receipt flow

The receipt page is generated at **`GET /api/payments/[id]/receipt`** by `apps/web/src/app/api/payments/[id]/receipt/route.ts`. It returns a self-contained HTML document rendered by `@queenix/receipts`:

- Queenix logo + brand color
- Auto-generated invoice number (`QNX-YYYY-#####`)
- Member name + email
- Date paid, payment method (e.g. `Visa **** 4242`)
- Line items, subtotal, **VAT 5%** (UAE), grand total
- "Print or save as PDF" button (uses `window.print()`)

The mobile `payments.tsx` opens this URL in a `Linking.openURL` call. From the browser, members can print → "Save as PDF".

To turn this into a real PDF in V1.5, swap the HTML response for a server-side renderer (e.g. `puppeteer` or `@react-pdf/renderer`). The `ReceiptInput` and `renderReceiptHtml` exports in `@queenix/receipts` are stable.

---

## API surface

| Method | Path                                  | Purpose                                            |
|-------:|---------------------------------------|----------------------------------------------------|
| POST   | `/api/payments/create-intent`         | Create a Stripe or Tap intent for a Convex payment |
| POST   | `/api/payments/stripe/webhook`        | Stripe → Convex (`recordPaymentSuccess` / failure / refund) |
| POST   | `/api/payments/tap/webhook`           | Tap → Convex                                       |
| GET    | `/api/payments/[id]/receipt`          | HTML receipt (WebView / print-to-PDF)              |

All Convex mutations live in `packages/convex/convex/mutations/payments.ts`:

| Mutation                       | Auth | Purpose                                                  |
|--------------------------------|------|----------------------------------------------------------|
| `createPaymentIntent`          | user | Create a `pending` payment record + idempotency key      |
| `createMembershipCheckout`     | user | High-level entry point from `plans.tsx`                  |
| `recordPaymentSuccess`         | none¹| Mark payment succeeded, create invoice, activate plan    |
| `recordPaymentFailure`         | none¹| Mark payment failed, write audit event                   |
| `recordRefund`                 | none¹| Mark payment + invoice refunded                          |
| `addPaymentMethod`             | user | Persist tokenized card / wallet                          |
| `removePaymentMethod`          | user | Delete a card; auto-promote another if it was default    |
| `setDefaultPaymentMethod`      | user | Set default + clear others                               |
| `freezeMembership` / unfreeze  | user | Pause / resume (1–60 days)                               |
| `cancelMembership`             | user | Cancel (keeps access until `endDate`)                    |

¹ Webhooks authenticate via `Convex ${CONVEX_DEPLOY_KEY}` header. The deploy key has admin powers — keep it secret, rotate it via the Convex dashboard.

Convex queries in `packages/convex/convex/queries/payments.ts`:

| Query                       | Purpose                                                |
|-----------------------------|--------------------------------------------------------|
| `getMyPaymentMethods`       | All tokenized cards for the current user               |
| `getMyInvoices`             | Invoices (most recent first), includes VAT breakdown   |
| `getMyPayments`             | Raw payment records (status, provider, intent ids)     |
| `getInvoiceById`            | Single invoice + joined payment + member               |
| `getReceiptContext`         | Used by the receipt route                              |

---

## Refund process

Refunds are triggered by the provider's webhook (`charge.refunded` for Stripe, `charge.refunded` for Tap). The handler calls `recordRefund` which:

1. Sets `payments.status = 'refunded'` and records `refundedAmountCents`.
2. Sets `invoices.status = 'refunded'`.
3. Writes an `auditEvents` row (`action: 'payment.refunded'`).

Manual refunds (from the owner dashboard) should call the Stripe or Tap dashboard directly — the webhook will propagate the change to Convex.

For partial refunds, the Stripe webhook only fires once for the full refund event; the V1.5 owner UI will support partial refunds explicitly via `createStripeRefund` (`@queenix/payments`).

---

## Idempotency

Every payment carries a server-generated `idempotencyKey` that is reused as the Stripe / Tap `idempotencyKey` parameter. If the mobile app retries (poor network, app crash mid-checkout), the provider returns the same intent instead of charging twice.

Convex also stores the key with a `by_idempotencyKey` index; the `createPaymentIntent` mutation short-circuits if it sees the same key.

---

## Audit trail

Every payment event writes a row to the existing `auditEvents` table:

| action                  | entityType | notes                                       |
|-------------------------|------------|---------------------------------------------|
| `payment.intentCreated` | payment    | User initiated checkout                     |
| `checkout.created`      | payment    | Plan-selected entry point                   |
| `payment.succeeded`     | payment    | Webhook from Stripe / Tap                   |
| `payment.failed`        | payment    | Webhook from Stripe / Tap                   |
| `payment.refunded`      | payment    | Webhook refund event                        |
| `paymentMethod.added`   | paymentMethod | New card / wallet tokenized              |
| `paymentMethod.removed` | paymentMethod | Card deleted                            |
| `paymentMethod.setDefault` | paymentMethod | Default changed                       |
| `membership.frozen`     | membership | User paused                                 |
| `membership.unfrozen`   | membership | User resumed                                |
| `membership.cancelled`  | membership | User cancelled                              |

This gives the operations team a complete, queryable history of every billing change for every member.

---

## Security notes

- **Never log full card numbers** — Tap and Stripe return tokenized references (`stripePaymentMethodId`, `tapTokenId`) which are stored instead.
- **Verify webhook signatures** — Stripe uses `stripe-signature` HMAC; Tap uses `hashstring` HMAC. Both are verified before any mutation runs.
- **Use the deploy key only on the server** — `CONVEX_DEPLOY_KEY` grants admin access; never expose it to the mobile bundle. The create-intent route is the only place the web app uses it.
- **Server-side currency check** — the provider router picks Tap only when `currency === 'AED'` AND `TAP_SECRET_KEY` is set. There's no client-side override.

---

## Local development quickstart

```bash
# 1. Install dependencies
pnpm install

# 2. Run Convex
cd packages/convex
npx convex dev

# 3. In a second terminal, run the web app
cd apps/web
pnpm dev

# 4. In a third terminal, forward Stripe webhooks
stripe listen --forward-to http://localhost:3000/api/payments/stripe/webhook

# 5. In a fourth terminal, run the mobile app
cd apps/mobile
pnpm dev
```

To exercise the full flow, sign in as a member, navigate to **Profile → Payments → Change plan**, choose a plan, and complete payment with the Stripe test card `4242 4242 4242 4242`. The webhook will fire, Convex will mark the payment `succeeded`, and the receipt will be available at `/api/payments/{id}/receipt`.
