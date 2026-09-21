# PAYMENTS TODO — salon + coffee (cash / test-mode only)

Implemented: `paymentMode: 'cash' | 'test'` on `salonBookings` and
`coffeeOrders`. Totals are computed server-side from the operator's own
menu/service prices. No processor SDK is called anywhere in
`queries/commerce.ts` / `mutations/commerce.ts`.

## Keys to connect (do NOT hardcode — env only)

Stripe:

- `STRIPE_SECRET_KEY` — server-side charges / payment intents.
- `STRIPE_PUBLISHABLE_KEY` (+ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for web,
  `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` for mobile) — client-side Elements.
- `STRIPE_WEBHOOK_SECRET` — webhook signature verification endpoint.

Tap (MENA):

- `TAP_SECRET_KEY` — server-side charge API.
- `TAP_PUBLISHABLE_KEY` (+ `NEXT_PUBLIC_TAP_PUBLISHABLE_KEY`,
  `EXPO_PUBLIC_TAP_PUBLISHABLE_KEY`) — client SDK.
- `TAP_WEBHOOK_SECRET` — webhook verification, if enabled.

## What remains before real money

1. Add `paymentRef` / `paymentStatus` fields to `salonBookings` + `coffeeOrders`.
2. Create intent on booking/order, confirm via Stripe/Tap client SDK.
3. Webhook handler flips `paymentStatus`; staff queues gate fulfilment on it.
4. Keep the `cash` path for in-store settlement.
