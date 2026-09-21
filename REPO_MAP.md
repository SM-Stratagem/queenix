# Queenix Gym — REPO MAP (read-only sweep, 2026-09-15)

## 1. Architecture diagram (text)
```
pnpm monorepo (npm workspaces: apps/*, packages/*)
|
+-- apps/mobile (Expo SDK53, expo-router, Tamagui, React 19)
|     app/(auth) | (member) | (trainer) | (ops) | (owner)
|     components/<domain> glass primitives + RoleSwitcher
|     lib/ (convex/auth client wiring)
|     --> Convex backend (packages/convex) + BetterAuth API (apps/web)
|
+-- apps/web (Next.js, port 3000)
|     src/app/{page, coffee, salon, valet, crm, finance, team}
|     src/app/api/{auth [...all] (BetterAuth), admin/users/[id]/role,
|       convex/token, payments/*, scanner/*}
|     src/components/{crm, finance, org}
|     --> Postgres/SQLite via packages/auth, Convex via NEXT_PUBLIC_CONVEX_URL
|
+-- packages/convex (Convex backend, self-hosted :3210 / site :3211)
|     convex/schema.ts assembles convex/schema/{domain}.ts
|     convex/queries/* + convex/mutations/* guarded by _helpers
|     (requireUser/requireRole) + permissions.ts
|
+-- packages/auth (BetterAuth server + db-pg.ts SQLite fallback, roles.ts)
+-- packages/{ui, theme, types, i18n, payments, receipts}
+-- docker/ + docker-compose.{yml,platform.yml} (db, convex, web)
+-- scripts/{init-env, seed-demo-users, migrate-auth-db, patch-tamagui-react19}
+-- docs/{PAYMENTS, RUNBOOK, SCANNER_SETUP, role-matrix} + HANDOFF.md
```

## 2. Services + ports table
| Service | Entry | Port / URL (local) |
|---|---|---|
| Web admin + Auth API (Next.js) | `pnpm --filter @queenix/web dev` | http://localhost:3000 ; auth at /api/auth/* |
| Mobile web (Expo) | `pnpm web` (from mobile) | http://localhost:8081 |
| Convex API (self-hosted) | `pnpm --filter @queenix/convex dev` | http://127.0.0.1:3210 (site :3211) |
| Postgres (compose `db`) | docker-compose.platform.yml | localhost:5432 (queenix/queenix-dev-only) |
| Auth DB fallback | AUTH_DB_PATH | ./.data/queenix-auth.db (SQLite) |
| Expo on device | EXPO_PUBLIC_* | phone needs LAN IP, not localhost (see DOCKER.md) |

## 3. Role -> screens matrix (FIXED CONTRACT: superadmin|admin|owner|operations|salon|coffee|trainer|member)
| Role | Mobile group | Screens | Web |
|---|---|---|---|
| member | (member) | home, gym, classes + classes/[id], book, trainers, plans, payments, rewards, documents, profile, gym extras: salon, coffee, valet | — |
| trainer | (trainer) | today, schedule, clients + clients/[id], earnings, profile | — |
| operations | (ops) | punch, scanner, classes, incidents, support, coffee-queue, salon-queue, valet, profile | /team (ops mgmt, new) |
| owner | (owner) | overview, operations, approvals, members + members/[id], profile | /crm, /finance (new) |
| salon | (ops) shared | salon-queue (ops); member salon booking | /salon (new) |
| coffee | (ops) shared | coffee-queue (ops); member coffee order | /coffee (new) |
| admin/superadmin | — (no dedicated mobile group; via RoleSwitcher + web) | — | /api/admin/users/[id]/role, /team, /crm, /finance |
| valet (domain, staff) | (ops) | valet (ops queue); member valet request | /valet (new) |
| unauth | (auth) | login, signup, onboarding, otp | web landing page.tsx |

Canonical def: `packages/auth/src/roles.ts` (ROLES, ROLE_RANK, hasRole/hasAnyRole).
Enforcement: `packages/convex/convex/_helpers.ts` + `permissions.ts`.
Matrix doc: `docs/role-matrix.md`. Debug switch: `apps/mobile/components/RoleSwitcher.tsx`.

## 4. Feature -> files index
| Feature | Convex queries | Convex mutations | Schema domain | Mobile | Web |
|---|---|---|---|---|---|
| identity/auth | users.ts | users.ts, demoAccounts.ts (new), sync.ts | schema/identity.ts (users, devices, consents) | app/(auth)/* | api/auth/[...all], api/convex/token |
| memberships/plans | memberships.ts | (users/bookings) | schema/membership.ts (membershipPlans, memberships) | (member)/plans.tsx | /team |
| classes/bookings | classes.ts | bookings.ts | schema/classes.ts (classTypes, classInstances, bookings) | (member)/book, classes/[id]; (ops)/classes | — |
| training/PT | (users.ts) | (operations?) | schema/training.ts (trainerProfiles, ptSessions, trainerEarnings, trainerNotes) | (trainer)/*, (member)/trainers | — |
| access/scanner | access.ts | access.ts | schema/access.ts (accessCredentials, accessEvents, occupancySnapshots) | (ops)/scanner, punch | api/scanner/* |
| operations/incidents/support | operations.ts | operations.ts | schema/operations.ts (loyaltyLedger, referrals, notifications, shifts, incidents, supportTickets, scannerDevices, auditEvents, approvals, punchEvents) | (ops)/incidents, support; (owner)/approvals, operations | docs/RUNBOOK |
| payments/finance | payments.ts, finance.ts (new) | payments.ts, finance.ts (new) | schema/payments.ts (payments, paymentMethods, invoices) | (member)/payments | /finance (new), api/payments/*, packages/{payments,receipts} |
| documents/approvals | — | — | schema/documents.ts (documentTemplates, signatures) | (member)/documents | — |
| member CRM | crm.ts (new) | crm.ts (new) | reuses users/memberProfiles | (owner)/members/[id] | /crm (new) |
| org/team | org.ts (new) | (users.ts role mutation) | reuses users | — | /team (new), api/admin/users/[id]/role |
| salon | commerce.ts (new) | commerce.ts (new) | schema/commerce.ts (new: salonServices, salonBookings, +) | (member)/salon; (ops)/salon-queue | /salon (new) |
| coffee | commerce.ts (new) | commerce.ts (new) | schema/commerce.ts (new: coffeeItems, coffeeOrders) | (member)/coffee; (ops)/coffee-queue | /coffee (new) |
| valet | valet.ts (new) | valet.ts (new) | valet tables TBD — see mutations/valet.ts | (member)/valet; (ops)/valet | /valet (new) |
| member profile | member.ts domain | — | schema/member.ts (memberProfiles) | (member)/profile; components/profile/* | — |
| loyalty/rewards | — | loyalty.ts | operations.loyaltyLedger/referrals | (member)/rewards | — |

Schema entry: `packages/convex/convex/schema.ts` spreads identity, member,
membership, payments, documents, access, classes, training, operations
(+ commerce/valet/crm/finance wiring TBD by maintainer — see SCHEMA ADDS).

## 5. Env var catalog
| Var | Source files | Used by |
|---|---|---|
| AUTH_SECRET | .env(.example), .env.platform.example, .env.testing | packages/auth, apps/web |
| AUTH_BASE_URL / AUTH_TRUST_HOST | .env.platform.example | apps/web (BetterAuth) |
| AUTH_DB_PATH | .env.platform.example, .env.testing | packages/auth db-pg.ts fallback |
| DATABASE_URL / POSTGRES_* | .env.platform.example, compose files | Postgres `db` service, db-pg.ts |
| WEB_PORT | .env.platform.example | compose web |
| NEXT_PUBLIC_CONVEX_URL / CONVEX_SELF_HOSTED_URL / CONVEX_SITE_URL / CONVEX_*_ORIGIN | .env.platform.example, .env.testing | apps/web, compose convex |
| EXPO_PUBLIC_CONVEX_URL / EXPO_PUBLIC_AUTH_BASE_URL | .env.platform.example, .env.testing | apps/mobile |
| PAYMENTS_PROVIDER (mock) / TAP_SECRET_KEY / STRIPE_SECRET_KEY | .env*, PAYMENTS_TODO.commerce.md | packages/payments, apps/web api/payments |
| QUEENIX_ADMIN_TOKEN | .env.platform.example | admin seeding |
| DEMO_* (4 demo accounts + DEMO_PASSWORD) | .env.testing | scripts/seed-demo-users.mjs |
| TURBO_*/EAS_* | HANDOFF/SETUP (TBD) | CI/build — verify before use |

Root `.env` currently only has AUTH_SECRET + PAYMENTS_PROVIDER=mock.
Never commit real secrets (see .env.platform.example header).

## 6. New domain files added in this run (git untracked, `git status --short`)
- Mobile member: (member)/coffee.tsx, salon.tsx, valet.tsx
- Mobile ops: (ops)/coffee-queue.tsx, salon-queue.tsx, valet.tsx
- Mobile shared: components/glass/ (GlassButton/Card/Header/Sheet)
- Web: src/app/{coffee,salon,valet,crm,finance,team}/ + components/{crm,finance,org}/
- Convex: mutations/{commerce,crm,finance,valet,demoAccounts}.ts,
  queries/{commerce,crm,finance,org,valet}.ts, schema/commerce.ts, permissions.ts
- Auth: packages/auth/src/{roles.ts, db-pg.ts}
- Platform: .env.platform.example, DOCKER.md, docker-compose.platform.yml,
  docker/, docs/role-matrix.md, PAYMENTS_TODO.commerce.md
- NOTE: role list in convex identity schema still shows 4 literals
  (member/trainer/owner/operations) — needs widening to the 8-role contract.

## 7. Test commands
```
# typecheck / lint / test (workspaces, per root package.json)
npm run typecheck --workspaces --if-present
npm run lint --workspaces --if-present
npm run test --workspaces --if-present   # vitest 4.1.11 where present
# web e2e: apps/web/e2e + playwright.config.ts (test-results/ present)
# mobile e2e: apps/mobile/e2e
# backend: pnpm --filter @queenix/convex dev (leave running)
# auth migrate + demo seed (see .env.testing section 4):
#   db:migrate (better-auth cli) then node scripts/seed-demo-users.mjs
```
