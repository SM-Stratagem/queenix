# Queenix Gym — Setup Guide

## Prerequisites

- Node.js 24 LTS+
- pnpm 10+
- iOS: Xcode 15+ (macOS)
- Android: Android Studio + SDK
- Convex account (free): https://convex.dev

## 1. Install dependencies

```bash
pnpm install
```

## 2. Set up Convex

```bash
# Login to Convex (one time)
npx convex login

# Initialize Convex deployment (one time)
cd packages/convex
npx convex dev --once
```

This will create a new Convex project and print the deployment URL. Copy it.

## 3. Configure environment

```bash
# Mobile app
cp apps/mobile/.env.example apps/mobile/.env
# Edit .env and add:
#   EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Convex deployment keys
cd packages/convex
npx convex env set AUTH_BASE_URL http://localhost:8081
npx convex env set AUTH_SECRET $(openssl rand -base64 32)
```

## 4. Start Convex dev server

```bash
cd packages/convex
pnpm dev
```

Leave this running in one terminal.

## 5. Start the mobile app

In a new terminal:

```bash
# Start Expo dev server
pnpm dev
```

Then:
- iOS: press `i` in terminal, or scan QR code with iPhone camera
- Android: press `a` in terminal, or scan QR code with Expo Go
- Web: press `w` in terminal, or visit http://localhost:8081

## 6. Start the web admin

In a new terminal:

```bash
cd apps/web
pnpm dev
```

Visit http://localhost:3000

## 7. Seed demo data (optional, never in production)

`./scripts/dev-up.sh` seeds the demo accounts + dataset automatically. To re-run it:

```bash
docker compose --env-file .env.docker up -d --force-recreate --no-deps seed
```

For the production build run locally: `./scripts/prod-local.sh --demo`.

## Troubleshooting

### "Module not found" errors

```bash
pnpm clean
pnpm install
```

### Metro bundler issues

```bash
rm -rf apps/mobile/.expo apps/mobile/node_modules/.cache
pnpm dev
```

### Convex connection issues

Verify `EXPO_PUBLIC_CONVEX_URL` is set in `apps/mobile/.env` and matches the URL from `npx convex dev`.

## Production deployment

### Mobile

```bash
# iOS
cd apps/mobile
eas build --platform ios

# Android
eas build --platform android
```

### Web admin

```bash
cd apps/web
pnpm build
# Deploy to Vercel: vercel --prod
```

### Backend

```bash
cd packages/convex
npx convex deploy
```
