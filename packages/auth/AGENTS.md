# Queenix — Architecture & Next Steps

## What was built

This is a complete V1 scaffolding for Queenix Gym — a women's gym platform with:

### Stack
- **Mobile + Web**: Expo SDK 53, React Native 0.79, Expo Router v5
- **UI**: Tamagui (cross-platform, light + dark mode)
- **Backend**: Convex (real-time, transactional, TypeScript)
- **Auth**: BetterAuth (email + password + OTP, role-aware)
- **Web admin**: Next.js 15 (App Router)
- **Validation**: Zod (client + server, single source of truth)
- **Monorepo**: pnpm workspaces + Turborepo

### Brand
- Primary: `#0081cc` (extracted from `LOGOFinalized.jpg`)
- Logo: `assets/logo/logo.jpg`
- Light + dark mode automatic

### Roles (all in one app, switcher in profile)
1. **Member** — onboarding, membership, QR access, classes, PT, rewards
2. **Trainer** — today, schedule, clients, earnings
3. **Owner** — KPIs, operations, members, approvals
4. **Operations** — scanner, classes, support, incidents

### Foundation
- 25+ shared UI components in `packages/ui` (Button, Card, Input, Avatar, Badge, Sheet, Toast, Progress, etc.)
- 8 Convex data domains (identity, member, membership, payments, documents, access, scheduling, classes, PT, engagement, notifications, operations, audit)
- Server-side role-based authorization helpers
- Idempotent mutations (concurrency-safe)
- Audit logging on all sensitive actions
- i18n with English + Arabic (Arabic ready, English in V1)

## What's mocked vs real

**Real (production-ready)**:
- Convex schema (all 8 domains)
- Auth flow (login, signup, OTP, onboarding)
- Role-based routing
- UI component library
- Theme system (light + dark)
- Type-safe types via Zod

**Mocked (in screens, replaceable)**:
- Class data, member data, trainer data — replace with Convex queries
- QR generation — use `react-native-qrcode-svg` + rotating token API
- Payment processing — integrate Stripe/Tap Payments
- Notification dispatch — wire to FCM/APNs

## Run it

See `SETUP.md` for full instructions.

Quick start:
```bash
pnpm install
cd packages/convex && npx convex dev  # terminal 1
pnpm dev                                # terminal 2 (Expo)
cd apps/web && pnpm dev                 # terminal 3 (Next.js admin)
```

## File map

```
queenix-gym/
├── apps/
│   ├── mobile/           # Expo app (iOS, Android, Web)
│   │   ├── app/          # Expo Router (file-based)
│   │   │   ├── (auth)/   # login, signup, otp, onboarding
│   │   │   ├── (member)/ # member role
│   │   │   ├── (trainer)/# trainer role
│   │   │   ├── (owner)/  # owner role
│   │   │   └── (ops)/    # operations role
│   │   ├── lib/          # auth, convex client
│   │   └── components/   # shared app components
│   └── web/              # Next.js admin
│       ├── src/app/      # App Router
│       └── src/components/
├── packages/
│   ├── ui/               # Tamagui component library
│   ├── theme/            # Design tokens + Tamagui config
│   ├── convex/           # Convex schema + functions
│   ├── auth/             # BetterAuth config
│   ├── types/            # Shared TypeScript types + Zod schemas
│   └── i18n/             # Translations (EN, AR)
├── docs/                 # Specs
├── assets/logo/          # Brand assets
└── SETUP.md              # Setup guide
```

## Production checklist

Before launch:

- [ ] Replace mock data with real Convex queries in screens
- [ ] Add react-native-qrcode-svg for real QR rendering
- [ ] Integrate Stripe (or Tap Payments for UAE) for payments
- [ ] Set up FCM/APNs for push notifications
- [ ] Set up email provider (SendGrid/Postmark) for receipts
- [ ] Configure SMS provider (Twilio) for OTP
- [ ] Add Sentry or similar for error tracking
- [ ] Add e2e tests (Detox or Maestro)
- [ ] Security review: server-side authz, rate limits, CSRF
- [ ] Performance: image CDN, lazy loading
- [ ] UAE legal review: waivers, e-sign, recurring billing
- [ ] Arabic translation completion
- [ ] App Store + Play Store assets and metadata
- [ ] EAS Build configuration for iOS/Android

## Roadmap (V1.5+)

Per PRD §28:
- **V1.5**: Coffee ordering, salon booking, parking, events, loyalty
- **V2**: Wearables, predictive analytics, ANPR parking, deeper BI

## License

Proprietary — Queenix Gym, Dubai, UAE.
