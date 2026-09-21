# Queenix Gym — MASTER

Women's gym platform (Dubai, UAE): role-based mobile app (Expo) + web admin
(Next.js) + realtime backend (Convex) + auth (BetterAuth). Brand `#0081cc`,
light + dark mode, EN + AR-ready.

> Where anything here conflicts with code, code wins. This file is a map,
> not a spec. Last updated 2026-09-21.

## 1. Repo layout

| Path | What |
|---|---|
| `apps/web/` | Next.js 15 admin console (port 3000) |
| `apps/mobile/` | Expo SDK 53 app (iOS/Android/Web), Tamagui UI |
| `packages/convex/` | Backend: `convex/` functions + schema; `src/index.ts` re-exports generated `api` |
| `packages/auth/` | BetterAuth server/client config, roles (`src/roles.ts` is canonical) |
| `packages/ui/` | 24 Tamagui components (Screen, Text, Card, Button, Input, Badge, …) |
| `packages/theme/` | Brand tokens, Tamagui config |
| `packages/types/` | Shared TS types + Zod schemas |
| `packages/payments/` | Stripe + Tap adapters, provider router, webhook verifiers |
| `packages/receipts/` | HTML receipt renderer (UAE VAT) |
| `packages/i18n/` | EN + AR strings |
| `scripts/` | `dev-up.sh` (full local stack), `seed-demo-users.mjs`, `migrate-auth-db.mjs`, `init-env.mjs` |
| `docs/` | `role-matrix.md`, `PAYMENTS.md`, `RUNBOOK.md`, `SCANNER_SETUP.md` |

## 2. Web admin routes (`apps/web/src/app`)

| Route | Purpose |
|---|---|
| `/` | Owner dashboard: KPIs, revenue + venue sales, total-members graph, occupancy, classes, check-ins |
| `/login` | Staff login (BetterAuth email+password; demo accounts in `.env.testing`) |
| `/members`, `/members/[id]` | Directory (search/filter/export) + 360 view (lifetime value, open tasks, freeze/unfreeze/cancel) |
| `/trainers` | Directory + detail (clients, classes, inflows, cert validity) |
| `/team` | Staff directory, timings/shifts, time-off decisions, roles & permissions, CSV export |
| `/approvals` | Membership/payment/document/trainer/access/payout approval queue |
| `/finance` | Ledger, books P&L + journal + CSV import/export, refunds, payouts (decide), voids, daily close, audit |
| `/crm` | Lead pipeline, lead edit, conversion-to-member, WhatsApp/email links, tasks, CSV export |
| `/classes` | Upcoming schedule + today's roster + CSV export |
| `/coffee`, `/salon` | Venue dashboards: KPIs, menu/service CRUD + remove, queue with full status steps, gateway settings, payment links, cash-paid, counter sales, CSV-ready rows |
| `/reports` | Revenue analytics, P&L, retention (CSV export) |
| `/audit` | Audit log (CSV export) |
| `/branches`, `/events` | Branch + event CRUD |
| `/notifications`, `/sales-push` | Broadcast / promo push composer + history |
| `/promotions`, `/partners`, `/documents` | Referrals, partners, document templates/signatures |
| `/valet` | Live valet queue + capacity |
| `/api/auth/[...all]` | BetterAuth handler (shared web + mobile) |
| `/api/convex/token`, `/api/jwks`, `/.well-known/openid-configuration` | Convex JWT mint + verification |
| `/api/admin/users/[id]/role` | Role assignment (`QUEENIX_ADMIN_TOKEN`) |
| `/api/commerce/payment-link` | Venue payment-link creation (Tap/Stripe) |
| `/api/payments/create-intent`, `/[id]/receipt`, `/stripe/webhook`, `/tap/webhook` | Intents, receipts, provider webhooks |
| `/api/scanner/register|qr|fingerprint|health` | Physical scanner bridge |

Shared UI: `src/components/admin/` (AdminShell, AdminNav, DashboardHome, charts),
`src/components/finance/` (tables, `CsvExport`, `CsvImport`), `src/components/commerce/VenuePayments.tsx`,
`src/lib/crm-contact.ts` (WhatsApp/mailto builders + stage templates).

## 3. Mobile routes (`apps/mobile/app`)

- `(auth)`: login, signup, OTP, onboarding.
- `(member)`: home, gym QR, class browse/book, plans, payments, trainers, salon (pay at salon),
  coffee (pay at counter), valet, rewards, documents, profile.
- `(trainer)`: today (complete/cancel sessions), schedule, clients + detail,
  sessions/new (schedule w/ member search), earnings + early-payout request, documents
  (certs + validity), profile.
- `(owner)`: overview KPIs, operations live, members + 360, approvals, profile.
- `(ops)`: scanner, classes roster, salon/coffee queues, valet, punch clock,
  incidents, support, profile.

## 4. Backend (`packages/convex/convex`)

- `schema/` per domain: access, branches, classes, commerce (+`venuePaymentSettings`,
  order `paymentProvider/paymentLink/paidAt`), crm, documents, events, finance
  (+`journalEntries`, `payouts`), identity, member, membership, operations, org,
  payments (+`invoices`), people, training (`trainerProfiles` w/ certifications,
  `ptSessions`, `trainerEarnings`, `trainerNotes`), valet.
- Queries: per-domain reads (`commerceOps.getCommerceSummary` = venue roll-up,
  `financeReports.getProfitAndLoss`, `crm.member360`, `users.getMyClients`, …).
- Mutations: bookings, commerce (catalogue, order status, cash-paid, counter
  sales, gateway settings, order payment link), crm (leads, tasks, conversion),
  finance (payouts incl. `decidePayout`, journal, voids), membershipAdmin,
  teamOrg (roles, time-off, branches), training (`scheduleSession`,
  `updateSessionStatus`), users (auth sync, trainer profile, certs, approvals).
- Auth: `requireUser` / `requireRole`; `internalQuery/Mutation` for deploy-key routes.

## 5. Money rules (read before touching payments)

- `cash` payment mode is **counter-only**: enforced server-side in
  `orderCoffee`/`bookSalon` (non-staff `cash` rejected). Members order with
  `counter` (pay on pickup). Counter sales (`createCounterCoffeeOrder`,
  `createCounterSalonBooking`) are staff-only, cash, instantly paid.
- Venue gateways (`cash | tap | stripe` + currency) live in
  `venuePaymentSettings`; secrets stay in env vars, never the DB.
- Provider auto-route: AED → Tap (if key), else Stripe. Webhooks verify
  signatures and settle via `recordPaymentSuccess`.
- Completing a PT session never creates money; earnings rows come from payments.

## 6. Roles & auth

Roles (`packages/auth/src/roles.ts`): superadmin > admin > owner >
operations > salon = coffee = trainer > member. Mobile home routes by
highest-ranked role; web `RequireAuth` gates sign-in, Convex enforces
per-function roles. Demo accounts + password in `.env.testing`
(`owner|ops|trainer|member @queenix.test` / `QueenixDemo123!`).

## 7. Run it locally

```bash
./scripts/dev-up.sh            # Convex + web + Expo + seed (needs Docker)
node scripts/seed-demo-users.mjs
npm run typecheck --workspaces --if-present
npm run test --workspaces --if-present
npm run build --workspace @queenix/web
```

Env: `.env.testing` (local), `.env.docker`, `.env.platform.example`
(production keys). After `npx convex dev`, generated `api.d.ts` refreshes and
the temporary `as any` shims (finance refs, training calls, commerceOps) can go.

## 8. Current gaps (known, not built)

- Payroll-rate math (no pay fields on staff profiles).
- Raw staff punch log has no UI (timings + time-off cover attendance).
- Member payment-method management / class-booking cancel + history (member-side).
- Vendor accounts-payable ledger (outflow runs via payouts + journal).
