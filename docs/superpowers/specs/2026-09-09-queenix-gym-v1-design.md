# Queenix Gym — V1 Build Spec (executable)

**Status:** Active build
**Date:** 2026-09-09
**Author:** Mavis (executed for SM-Stratagem)
**Source PRD:** `Gym_Platform_End_to_End_PRD_v1.0.docx`

## 1. Product summary

Queenix Gym is a women's gym. The platform is a role-based ecosystem with:
- One mobile app, four role experiences (Member, Trainer, Owner, Operations).
- One web admin (operations console level).
- One backend (Convex, real-time).
- One auth (BetterAuth, role-aware).

Brand: warm, premium, simple. Primary color **#0081cc** (extracted from logo). Logo is `assets/logo/logo.jpg`.

## 2. Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Mobile + Web | **Expo SDK 53** (React Native 0.79) with web export | One codebase → iOS, Android, Web. Fastest to ship. |
| Language | TypeScript strict | Type safety prevents "no errors at all" requirement violations. |
| UI | **Tamagui** | Cross-platform (RN + web), built-in theme system, performant. |
| Routing | **Expo Router** v5 (file-based) | File-based, supports role-based layouts. |
| Backend | **Convex** | Real-time, transactional, TypeScript-first. |
| Auth | **BetterAuth** + Convex adapter | User-specified. |
| Forms | React Hook Form + Zod | Type-safe validation, zero errors. |
| State | Convex queries/mutations (no Redux) | Single source of truth. |
| i18n | i18next + ICU MessageFormat | English first, Arabic-ready. |
| Date/Time | date-fns + timezone-aware | Dubai (GST, UTC+4) aware. |
| Validation | Zod everywhere (client + server) | Same schema on both sides. |
| Linting | ESLint + TypeScript strict | Catches errors at build time. |

## 3. Project structure

```
/Users/suhayl/Downloads/Aasim/Queenix Gym/
├── package.json                 # Root, pnpm workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── apps/
│   ├── mobile/                  # Expo app (iOS, Android, Web)
│   │   ├── app/                 # Expo Router
│   │   │   ├── (auth)/          # Onboarding, login
│   │   │   ├── (member)/        # Member role layout
│   │   │   ├── (trainer)/       # Trainer role layout
│   │   │   ├── (owner)/         # Owner role layout
│   │   │   ├── (ops)/           # Operations role layout
│   │   │   └── _layout.tsx      # Root layout
│   │   ├── components/          # Screen components
│   │   ├── lib/                 # App-specific helpers
│   │   └── app.json
│   └── web/                     # Next.js 15 admin (subset)
├── packages/
│   ├── ui/                      # Tamagui components
│   ├── theme/                   # Design tokens
│   ├── convex/                  # Schema + functions
│   ├── auth/                    # BetterAuth config
│   ├── types/                   # Shared TS types
│   └── i18n/                    # Translations
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-09-09-queenix-gym-v1-design.md
```

## 4. Roles & navigation

Single app. Authenticated user's role determines which layout group renders. Users with multiple roles see a role switcher in profile.

| Role | Bottom tabs | Home dashboard |
|---|---|---|
| **Member** | Home, Book, Gym, Rewards, Profile | Membership status, next booking, live occupancy, quick actions |
| **Trainer** | Today, Schedule, Clients, Earnings, Profile | Today's sessions, next client, recent notes |
| **Owner** | Overview, Operations, Members, Approvals, Profile | KPIs, alerts, quick actions |
| **Operations** | Scanner, Classes, Members, Issues, Profile | Live facility, scan, support queue |

Role switching: server-side via `activeRole` claim in session. UI gated by `<RoleGate role="...">` component.

## 5. Data model (Convex schema)

Eight domains from PRD §22. Core entities:

- **Identity**: `users`, `roleAssignments`, `devices`, `consents`
- **Member**: `memberProfiles`, `emergencyContacts`, `vehicles`, `memberNotes`
- **Membership**: `membershipPlans`, `memberships`, `freezes`, `cancellationRequests`
- **Payments**: `payments`, `invoices`, `paymentMethods`, `failedPayments`
- **Documents**: `documentTemplates`, `documentVersions`, `signatures`, `requiredDocumentRules`
- **Access**: `accessCredentials`, `accessEvents`, `accessOverrides`, `occupancySnapshots`
- **Scheduling**: `resources`, `availabilities`, `bookings`, `waitlist`, `cancellationPolicies`
- **Classes**: `classTypes`, `classInstances`, `rooms`, `classRosters`, `attendance`
- **PT**: `trainerProfiles`, `certifications`, `ptProducts`, `ptPackages`, `ptSessions`, `commissions`, `earnings`
- **Engagement**: `notifications`, `campaigns`, `loyaltyLedger`, `rewards`, `referrals`, `promoCodes`
- **Operations**: `staffProfiles`, `shifts`, `incidents`, `handoverNotes`, `auditEvents`

Full schema in `packages/convex/schema.ts`.

## 6. Auth (BetterAuth)

- Email + password + OTP (mobile/email).
- Role assigned on user creation; multi-role supported.
- Active role stored in session.
- Server-side authorization on every Convex function (`requireRole(ctx, "owner")`).
- No role data exposed in member mode.

## 7. Theming

- **Primary**: `#0081cc` (logo blue).
- **Light mode**: white background, near-black text, primary accents.
- **Dark mode**: `#0a0e14` background, light text, primary accents slightly desaturated.
- Typography: Inter (web/RN) — system fallback.
- Spacing: 4px base scale.
- Radius: 8/12/16/24.

Tokens in `packages/theme/tokens.ts`. Tamagui theme in `packages/theme/tamagui.config.ts`.

## 8. Screen inventory (V1)

### Member (15 screens)
Login/OTP, Onboarding, Health Declaration, Document Signing, Membership Plans, Checkout, Home, QR Access, Occupancy, Classes, Class Detail, Trainer Directory, Trainer Profile, PT Booking, Profile, Payments, Documents, Settings.

### Trainer (12 screens)
Login, Home, Today, Schedule, Availability, Client List, Client Detail, Session Detail, Session Notes, Classes, Earnings, Documents, Profile, Settings.

### Owner (10 screens)
Login, Executive Overview, Live Operations, Member Search, Member Detail, Trainer Overview, Approvals, Alerts, Finance Summary, Profile, Settings.

### Operations (8 screens)
Login, Shift Start, Live Scanner, Manual Validation, Member Search, Class Roster, Class Management, Incidents, Support Queue, Shift End, Settings.

### Web admin (8 screens)
Dashboard, Members, Memberships, Classes, PT, Staff, Reports, Settings.

**Total**: ~53 screens across all surfaces.

## 9. Error handling

- Convex functions return discriminated unions (`{ ok: true, data } | { ok: false, error }`).
- React Error Boundary at every layout level.
- Toast system for user-facing errors.
- All mutations are idempotent (idempotencyKey).
- Optimistic updates for instant UI, rolled back on error.
- Network failure: show cached data + banner, retry on reconnect.

## 10. Non-functional

- p95 API response < 500ms (Convex typically < 100ms).
- Offline: read-only with banner; QR scan requires online (per PRD).
- i18n: English first, Arabic strings stubbed for V1.5.
- Accessibility: scalable text, contrast AA, screen-reader labels.
- Performance: lazy-load routes, image CDN, list virtualization.

## 11. Testing

- TypeScript strict mode (catches most bugs at build).
- Zod validation on every input (client + server).
- Convex function smoke tests.
- React Native Testing Library for screens.
- No real e2e in V1 build (manual QA).

## 12. Out of scope (V1.5+)

Per PRD §28:
- Coffee/salon partner portals
- Wearables (Apple Health, Garmin, WHOOP)
- ANPR parking
- Predictive analytics
- Multi-branch in V1 (architect for it, single branch at launch)

## 13. Open decisions to resolve during build

- **Payment gateway**: Stripe (international) or Tap Payments (UAE-focused). Default: Stripe for testability.
- **QR security**: rotating QR with device fingerprint check.
- **Offline access**: read-only fallback per PRD §25.
- **Arabic**: layout-ready but content English-only in V1.

## 14. Build phases

1. **Foundation**: monorepo, Expo, Convex, BetterAuth, Tamagui, theme (NOW).
2. **Schemas & auth**: Convex schema, BetterAuth config, role middleware.
3. **Shared UI**: Button, Input, Card, Avatar, Sheet, Toast, etc.
4. **Screens per role**: parallel subagent dispatch.
5. **Integration**: wire screens to Convex, role routing, real-time.
6. **Polish**: error states, loading, empty states, animations.
7. **Verification**: build, type-check, smoke tests.
