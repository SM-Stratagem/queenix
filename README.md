# Queenix Gym

Women's gym platform — role-based mobile app + web admin built on React Native (Expo) + Convex.

## Roles

- **Member** — join, sign, pay, access, book classes/PT, rewards
- **Trainer** — schedule, sessions, clients, earnings
- **Owner** — KPIs, operations, members, approvals
- **Operations** — scanner, classes, members, issues

## Stack

- Expo (React Native + Web)
- Tamagui (UI)
- Convex (backend, real-time)
- BetterAuth (auth)
- TypeScript strict
- Zod (validation)

## Quick start

```bash
pnpm install
pnpm convex:dev          # in one terminal
pnpm dev                  # in another
```

## Project structure

- `apps/mobile/` — Expo app (iOS, Android, Web)
- `packages/convex/` — backend schema + functions
- `packages/ui/` — Tamagui component library
- `packages/theme/` — design tokens
- `packages/auth/` — BetterAuth config
- `packages/types/` — shared TypeScript types
- `packages/i18n/` — translations (EN, AR-ready)

## Docs

- [V1 Build Spec](docs/superpowers/specs/2026-09-09-queenix-gym-v1-design.md)
- [Source PRD](Gym_Platform_End_to_End_PRD_v1.0.docx)

## Brand

- Primary: `#0081cc`
- Logo: `assets/logo/logo.jpg`
- Light + dark mode

## License

Proprietary — Queenix Gym, Dubai, UAE.
