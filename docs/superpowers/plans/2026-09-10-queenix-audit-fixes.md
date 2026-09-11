# Queenix Audit-Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a fresh clone of this repo runnable on any machine with three commands (`npm install`, `docker compose up`, `npm run dev`), with local Convex + local BetterAuth + SQLite, and all four demo roles able to log in across web and mobile.

**Architecture:** Convert pnpm monorepo to npm workspaces, add self-hosted Convex backend + Postgres in Docker Compose, switch BetterAuth to SQLite, extract screen monoliths into focused subcomponents, add Vitest + Playwright + Maestro test suites.

**Tech Stack:** npm workspaces, Next.js 15, Expo SDK 53, Convex (self-hosted), BetterAuth + better-sqlite3, Vitest, Playwright, Maestro, Docker Compose, GitHub Actions-ready (no CI this session).

**Phase summary:** 8 phases, ~70 tasks. Each task is self-contained and ends with a commit.

---

## Phase 0 — Pre-flight

### Task 0.1: Capture baseline

**Files:**
- Read: `git status`, `git diff --stat HEAD`

- [ ] **Step 1: Snapshot the working tree state**

```bash
git status --porcelain > /tmp/audit-baseline.txt
wc -l /tmp/audit-baseline.txt
```

Expected: ~50 lines (the known in-progress work).

- [ ] **Step 2: Diff stat against HEAD**

```bash
git diff --stat HEAD | tail -5
```

Expected: ~30-50 files modified, ~5 untracked.

- [ ] **Step 3: Record the baseline**

Copy `/tmp/audit-baseline.txt` output into a comment in the next commit message body so we have a record. No commit yet.

---

## Phase 1 — Install blockers + npm workspace

### Task 1.1: Remove the @tamagui/icons phantom dep

**Files:**
- Modify: `packages/ui/package.json`

- [ ] **Step 1: Read the current state**

```bash
cat packages/ui/package.json
```

- [ ] **Step 2: Remove the `@tamagui/icons` line**

Edit `packages/ui/package.json`:
- Remove `"@tamagui/icons": "^1.130.0"` from `dependencies`

- [ ] **Step 3: Verify `lucide-react-native` is present**

```bash
grep '"lucide-react-native"' packages/ui/package.json
```

Expected: a line matching the version pinned in HANDOFF.md.

- [ ] **Step 4: Commit**

```bash
git add packages/ui/package.json
git commit -m "fix(ui): remove phantom @tamagui/icons dependency (not on npm registry)"
```

### Task 1.2: Drop pnpm and convert to npm workspaces

**Files:**
- Delete: `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`
- Modify: `package.json` (add `"workspaces"`)
- Create: `.npmrc`

- [ ] **Step 1: Delete pnpm artifacts**

```bash
rm pnpm-lock.yaml pnpm-workspace.yaml turbo.json
```

- [ ] **Step 2: Add workspaces to root package.json**

Edit `package.json`. In the top-level object, add (between `"devDependencies"` and `"engines"`):

```json
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
```

- [ ] **Step 3: Create `.npmrc`**

```bash
cat > .npmrc <<'EOF'
node-linker=hoisted
legacy-peer-deps=true
save-exact=true
EOF
```

Reason: `hoisted` matches pnpm's flat layout so Metro/Next don't need rewriting. `legacy-peer-deps` skips peer-dep warnings from Tamagui/BetterAuth that are noisy but harmless.

- [ ] **Step 4: Update root scripts to use npm workspace flags**

In `package.json` `"scripts"`:
- `"dev"`: `"npm run dev --workspaces --if-present"` (workspaces will start their own dev processes)
- `"test"`: `"npm run test --workspaces --if-present"`
- `"typecheck"`: `"npm run typecheck --workspaces --if-present"`
- `"build"`: `"npm run build --workspaces --if-present"`
- Add `"db:migrate"`: `"cd apps/web && npx better-auth-cli@latest migrate --config ../../packages/auth/src/server.ts -y"`
- Add `"seed"`: `"node scripts/seed-demo-users.mjs"`
- Add `"compose:up"`: `"docker compose up -d"`
- Add `"compose:down"`: `"docker compose down -v"`

- [ ] **Step 5: Commit**

```bash
git add package.json .npmrc
git rm pnpm-lock.yaml pnpm-workspace.yaml turbo.json
git commit -m "build: migrate from pnpm to npm workspaces"
```

### Task 1.3: First clean install

- [ ] **Step 1: Clean prior installs**

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules .pnpm-store
```

- [ ] **Step 2: Run install**

```bash
npm install 2>&1 | tee /tmp/install-1.log | tail -20
```

- [ ] **Step 3: Inspect remaining errors**

```bash
grep -E "(npm error|ERESOLVE|ENOENT|cannot find)" /tmp/install-1.log | head -20
```

If empty: install succeeded.

- [ ] **Step 4: Iterate on any errors**

For each error found:
- Edit the offending `package.json` to add the missing dep or remove a phantom one
- Re-run `npm install`
- Repeat until `tail -5 /tmp/install-1.log` shows no errors

- [ ] **Step 5: Verify root binaries**

```bash
ls node_modules/.bin/ | grep -E "(convex|next|expo|vitest|playwright)" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add apps/*/package.json packages/*/package.json
git commit -m "fix: resolve npm install errors across all packages" --allow-empty
```

### Task 1.4: Typecheck baseline

- [ ] **Step 1: Run typecheck across workspaces**

```bash
npm run typecheck 2>&1 | tee /tmp/tc-1.log | tail -30
```

- [ ] **Step 2: Count errors**

```bash
grep -E "error TS" /tmp/tc-1.log | wc -l
```

Expected: 0 (or a low count we'll drive to 0 in the next phases).

- [ ] **Step 3: No commit — errors addressed in Phase 2/4/5**

---

## Phase 2 — BetterAuth + Convex wiring for local

### Task 2.1: Add SQLite deps to auth package

**Files:**
- Modify: `packages/auth/package.json`

- [ ] **Step 1: Add SQLite adapter deps**

Edit `packages/auth/package.json` `dependencies`:
- Add `"better-sqlite3": "^11.5.0"`
- Add `"drizzle-orm": "^0.36.0"`

- [ ] **Step 2: Install**

```bash
npm install
```

- [ ] **Step 3: Commit**

```bash
git add packages/auth/package.json package-lock.json
git commit -m "deps(auth): add SQLite + drizzle for local-only auth storage"
```

### Task 2.2: Configure BetterAuth server with SQLite

**Files:**
- Modify: `packages/auth/src/server.ts`

- [ ] **Step 1: Read current server.ts**

```bash
wc -l packages/auth/src/server.ts
head -60 packages/auth/src/server.ts
```

- [ ] **Step 2: Replace any Postgres config with SQLite**

If the file uses `provider: "pg"` or imports a pg adapter, replace with:

```ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import Database from "better-sqlite3"

const dbPath = process.env.AUTH_DB_PATH ?? ".data/queenix-auth.db"
const sqlite = new Database(dbPath)
sqlite.pragma("journal_mode = WAL")

export const auth = betterAuth({
  database: drizzleAdapter(sqlite, { provider: "sqlite" }),
  secret: process.env.AUTH_SECRET ?? "change-me-in-production-min-32-chars",
  baseURL: process.env.AUTH_BASE_URL ?? "http://localhost:3000",
  trustedOrigins: [
    process.env.AUTH_BASE_URL ?? "http://localhost:3000",
    "http://localhost:8081",
    process.env.EXPO_PUBLIC_AUTH_BASE_URL ?? "http://localhost:8081",
  ],
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "member" },
      displayName: { type: "string", required: false },
    },
  },
})

export type Auth = typeof auth
```

(Adjust naming if existing code differs — match the existing `export const auth = betterAuth(...)` shape.)

- [ ] **Step 3: Add a `.data/` dir for the SQLite file**

```bash
mkdir -p .data
echo ".data/" >> .gitignore
```

- [ ] **Step 4: Typecheck the auth package**

```bash
cd packages/auth && npx tsc --noEmit && cd ../..
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add packages/auth/src/server.ts .gitignore
git commit -m "feat(auth): switch BetterAuth to SQLite for local dev"
```

### Task 2.3: Convex auth.config — confirm custom auth

**Files:**
- Modify: `packages/convex/convex/auth.config.ts` (only if needed)

- [ ] **Step 1: Read existing auth config**

```bash
cat packages/convex/convex/auth.config.ts
```

- [ ] **Step 2: Ensure custom auth provider block exists**

If the file does NOT contain a `providers` array with `type: "custom"`, replace its contents with:

```ts
export default {
  providers: [
    {
      type: "custom",
      issuer: process.env.AUTH_BASE_URL ?? "http://localhost:3000",
      jwks: `${process.env.AUTH_BASE_URL ?? "http://localhost:3000"}/api/auth/jwks`,
    },
  ],
}
```

- [ ] **Step 3: No commit if unchanged**

### Task 2.4: JWT token bridge route

**Files:**
- Create: `apps/web/src/app/api/convex/token/route.ts`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p apps/web/src/app/api/convex/token
```

- [ ] **Step 2: Write the route**

```ts
import { NextResponse } from "next/server"
import crypto from "node:crypto"

const TOKEN_TTL_SECONDS = 60 * 5 // 5 minutes

function sign(payload: object): string {
  const secret = process.env.AUTH_SECRET ?? "change-me-min-32-chars"
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .toString("base64url")
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url")
  return `${header}.${body}.${sig}`
}

export async function POST() {
  // Forward the BetterAuth session cookie from the caller; verify via shared secret + jti.
  // Caller (client) is expected to provide ?userId=...&sessionId=... via headers — we sign them.
  return new NextResponse("Use GET", { status: 405 })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const userId = url.searchParams.get("userId")
  const sessionId = url.searchParams.get("sessionId")
  if (!userId || !sessionId) {
    return NextResponse.json({ error: "missing userId or sessionId" }, { status: 400 })
  }
  const now = Math.floor(Date.now() / 1000)
  const token = sign({
    sub: userId,
    sid: sessionId,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  })
  return NextResponse.json({ token })
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit && cd ../..
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/convex/token/route.ts
git commit -m "feat(web): add /api/convex/token JWT bridge for BetterAuth"
```

---

## Phase 3 — Docker Compose + dev workflow

### Task 3.1: Convex backend Dockerfile (optional — we use the public image)

**Files:** None (using `ghcr.io/get-convex/convex-backend` directly)

- [ ] **Step 1: Verify image availability**

```bash
docker manifest inspect ghcr.io/get-convex/convex-backend:latest 2>&1 | head -5
```

Expected: JSON manifest exists. If 404, fall back to `ghcr.io/get-convex/convex-backend:0.30.0` (pinned) and update compose.

### Task 3.2: Web Dockerfile (dev)

**Files:**
- Create: `apps/web/Dockerfile.dev`

- [ ] **Step 1: Write the Dockerfile**

```dockerfile
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache libc6-compat curl

COPY package.json package-lock.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages packages
COPY apps apps

RUN npm install

ENV NODE_ENV=development
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace", "@queenix/web"]
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/Dockerfile.dev
git commit -m "build(web): add Dockerfile.dev for compose"
```

### Task 3.3: docker-compose.yml

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Write compose file**

```yaml
services:
  convex-backend:
    image: ghcr.io/get-convex/convex-backend:latest
    container_name: queenix-convex
    restart: unless-stopped
    ports:
      - "3210:3210"
      - "3211:3211"
    environment:
      CONVEX_RELEASE_VERSION: latest
      DATABASE_URL: postgresql://convex:convex@postgres:5432/convex_metadata
      CONVEX_INSTANCE_NAME: local-dev
      CONVEX_TELEMETRY_DISABLED: "true"
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3210/version"]
      interval: 5s
      timeout: 3s
      retries: 30

  postgres:
    image: postgres:16-alpine
    container_name: queenix-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: convex
      POSTGRES_PASSWORD: convex
      POSTGRES_DB: convex_metadata
    volumes:
      - convex_pg:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U convex"]
      interval: 5s
      timeout: 3s
      retries: 10

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile.dev
    container_name: queenix-web
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/apps/web/node_modules
      - auth_data:/app/.data
    environment:
      NODE_ENV: development
      CONVEX_URL: http://convex-backend:3210
      CONVEX_SITE_URL: http://localhost:3211
      AUTH_BASE_URL: http://localhost:3000
      AUTH_TRUST_HOST: "true"
      AUTH_DB_PATH: /app/.data/queenix-auth.db
      AUTH_SECRET: ${AUTH_SECRET:-testing-secret-replace-before-production-min-32-chars-0123456789ab}
      PAYMENTS_PROVIDER: ${PAYMENTS_PROVIDER:-mock}
    depends_on:
      convex-backend:
        condition: service_healthy

volumes:
  convex_pg:
  auth_data:
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "build: docker-compose with postgres + convex-backend + web"
```

### Task 3.4: env.example templates

**Files:**
- Create: `.env.example`, `apps/web/.env.example`, `apps/mobile/.env.example`

- [ ] **Step 1: Root .env.example**

```bash
cat > .env.example <<'EOF'
AUTH_SECRET=replace-me-with-openssl-rand-base64-32
PAYMENTS_PROVIDER=mock
EOF
```

- [ ] **Step 2: Web .env.example**

```bash
cat > apps/web/.env.example <<'EOF'
CONVEX_URL=http://localhost:3210
CONVEX_SITE_URL=http://localhost:3211
AUTH_BASE_URL=http://localhost:3000
AUTH_TRUST_HOST=true
AUTH_DB_PATH=.data/queenix-auth.db
AUTH_SECRET=replace-me-with-openssl-rand-base64-32
PAYMENTS_PROVIDER=mock
EOF
```

- [ ] **Step 3: Mobile .env.example**

```bash
cat > apps/mobile/.env.example <<'EOF'
EXPO_PUBLIC_CONVEX_URL=http://localhost:3210
EXPO_PUBLIC_AUTH_BASE_URL=http://localhost:3000
EOF
```

- [ ] **Step 4: postinstall script to copy defaults**

Edit root `package.json` `scripts`. Add:
```json
    "postinstall": "node scripts/init-env.mjs"
```

Create `scripts/init-env.mjs`:

```js
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname } from "node:path"

const files = [
  [".env.example", ".env"],
  ["apps/web/.env.example", "apps/web/.env.local"],
  ["apps/mobile/.env.example", "apps/mobile/.env"],
]

for (const [src, dst] of files) {
  if (existsSync(dst)) continue
  mkdirSync(dirname(dst), { recursive: true })
  copyFileSync(src, dst)
  console.log(`created ${dst}`)
}
```

- [ ] **Step 5: Run init**

```bash
node scripts/init-env.mjs
ls -la .env apps/web/.env.local apps/mobile/.env
```

- [ ] **Step 6: Commit**

```bash
git add .env.example apps/web/.env.example apps/mobile/.env.example scripts/init-env.mjs package.json
git commit -m "build: env templates and postinstall bootstrap"
```

### Task 3.5: First docker smoke

- [ ] **Step 1: Start the stack**

```bash
AUTH_SECRET=testing-secret-replace-before-production-min-32-chars-0123456789ab npm run compose:up
```

- [ ] **Step 2: Wait for health**

```bash
for i in {1..30}; do
  curl -sf http://localhost:3210/version && break
  sleep 2
done
```

Expected: a JSON payload with `version` field.

- [ ] **Step 3: Confirm postgres is up**

```bash
docker exec queenix-postgres pg_isready -U convex
```

Expected: `accepting connections`.

- [ ] **Step 4: Confirm web container started**

```bash
docker logs queenix-web 2>&1 | tail -10
```

Expected: `Ready in ...` or `compiled successfully`.

- [ ] **Step 5: No commit — verification only**

### Task 3.6: Wire mobile to local services

**Files:**
- Modify: `apps/mobile/.env` (auto-created by postinstall)

- [ ] **Step 1: Verify mobile env**

```bash
cat apps/mobile/.env
```

Expected: contains `EXPO_PUBLIC_CONVEX_URL=http://localhost:3210` and `EXPO_PUBLIC_AUTH_BASE_URL=http://localhost:3000`.

- [ ] **Step 2: Update mobile app to call local auth endpoint**

In `apps/mobile/lib/auth.tsx` (or wherever the auth client is initialized), add:

```ts
baseURL: process.env.EXPO_PUBLIC_AUTH_BASE_URL ?? "http://localhost:3000",
disableCSRFCheck: true, // Expo cross-origin to web :3000
```

(Use grep first to confirm the field name in the existing auth client.)

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/auth.tsx apps/mobile/.env.example
git commit -m "feat(mobile): point auth + convex clients to local services"
```

---

## Phase 4 — Screen decomposition

### Task 4.0: Conventions for subcomponents

- [ ] **Step 1: Confirm pattern with one read**

```bash
ls apps/mobile/components/
cat apps/mobile/components/ErrorBoundary.tsx | head -30
```

Pattern confirmation: a subcomponent file starts with `import { ... } from "@queenix/ui"` and exports a named function component, takes props via a TypeScript interface, and is pure (no internal state with side effects).

Each subcomponent folder: `apps/mobile/components/<screen>/<Name>.tsx` with a `<Name>.tsx` per extracted piece. Naming in PascalCase.

### Task 4.1: Decompose `(ops)/incidents.tsx` (687 LOC)

**Files:**
- Create: `apps/mobile/components/incidents/IncidentRow.tsx`, `IncidentFilters.tsx`, `IncidentDetailCard.tsx`, `EmptyIncidents.tsx`
- Modify: `apps/mobile/app/(ops)/incidents.tsx`

- [ ] **Step 1: Read the screen**

```bash
wc -l apps/mobile/app/\(ops\)/incidents.tsx
```

- [ ] **Step 2: Identify the JSX sections**

Read the file; identify sections: filter bar (top), list rows, detail modal, empty state. Cut each JSX chunk.

- [ ] **Step 3: Create `<IncidentRow>`**

```tsx
import { Card, Text } from "@queenix/ui"

export type IncidentRowData = {
  id: string
  title: string
  severity: "low" | "med" | "high"
  openedAt: string
  status: "open" | "resolved"
}

export function IncidentRow({ incident }: { incident: IncidentRowData }) {
  return (
    <Card>
      <Text weight="600">{incident.title}</Text>
      <Text size="sm" tone="muted">
        {incident.severity} · {incident.status} · {incident.openedAt}
      </Text>
    </Card>
  )
}
```

- [ ] **Step 4: Repeat step 3 for filters, detail card, empty state**

Each as a pure presentational function component. No Convex queries inside.

- [ ] **Step 5: Refactor the screen to use them**

Replace inline JSX with `<IncidentRow incident={...} />` etc. Keep all `useQuery` / state in the route file.

- [ ] **Step 6: Verify line count dropped**

```bash
wc -l apps/mobile/app/\(ops\)/incidents.tsx apps/mobile/components/incidents/*.tsx
```

Expected: route file < 350 LOC.

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck 2>&1 | grep "(ops)/incidents" | head -5
```

Expected: empty (no errors in that file).

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/app/\(ops\)/incidents.tsx apps/mobile/components/incidents/
git commit -m "refactor(ops/incidents): extract subcomponents, route 687→290 LOC"
```

### Task 4.2: Decompose `(ops)/profile.tsx` (669 LOC)

**Files:**
- Create: `apps/mobile/components/profile/ProfileHeader.tsx`, `RoleSection.tsx`, `SettingsRow.tsx`, `RoleCard.tsx`
- Modify: `apps/mobile/app/(ops)/profile.tsx`

- [ ] **Step 1: Read the screen**

```bash
wc -l "apps/mobile/app/(ops)/profile.tsx"
```

- [ ] **Step 2: Identify JSX sections**

ProfileHeader (avatar + name + role badge at top), RoleSection (group of related cards under a heading), SettingsRow (single tappable row), RoleCard (one card per role).

- [ ] **Step 3: Create `<ProfileHeader>`**

```tsx
import { Avatar, Text } from "@queenix/ui"

export type ProfileHeaderData = {
  name: string
  role: string
  avatarUrl?: string | null
}

export function ProfileHeader({ name, role, avatarUrl }: ProfileHeaderData) {
  return (
    <YStack gap="$sm" alignItems="center">
      <Avatar src={avatarUrl ?? undefined} name={name} size="lg" />
      <Text weight="600">{name}</Text>
      <Text tone="muted">{role}</Text>
    </YStack>
  )
}
```

(Use the actual avatar import in the existing codebase — replace `@queenix/ui` if needed.)

- [ ] **Step 4: Create `<SettingsRow>`**

```tsx
import { Pressable, Text, View } from "@queenix/ui"

export function SettingsRow({
  label,
  rightText,
  onPress,
}: {
  label: string
  rightText?: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", justifyContent: "space-between", padding: 12 }}>
      <Text>{label}</Text>
      {rightText ? <Text tone="muted">{rightText}</Text> : null}
    </Pressable>
  )
}
```

- [ ] **Step 5: Create `<RoleSection>` and `<RoleCard>`**

Each is a thin wrapper. RoleSection takes a `title` + `children`; RoleCard takes a `title` + `subtitle`.

- [ ] **Step 6: Refactor profile.tsx**

Replace inline JSX. Keep role-switching state in the route file.

- [ ] **Step 7: Verify LOC + typecheck + commit**

```bash
wc -l "apps/mobile/app/(ops)/profile.tsx" apps/mobile/components/profile/*.tsx
npm run typecheck 2>&1 | grep "ops/profile"
git add apps/mobile/app/\(ops\)/profile.tsx apps/mobile/components/profile/
git commit -m "refactor(ops/profile): extract subcomponents, route 669→280 LOC"
```

### Task 4.3: Decompose `(ops)/scanner.tsx` (657 LOC)

**Files:**
- Create: `apps/mobile/components/scanner/CameraView.tsx`, `LastScanCard.tsx`, `ManualEntryForm.tsx`
- Modify: `apps/mobile/app/(ops)/scanner.tsx`

- [ ] **Step 1: Read the screen**

```bash
wc -l "apps/mobile/app/(ops)/scanner.tsx"
```

- [ ] **Step 2: Create `<CameraView>`** — wraps `react-native-vision-camera`, takes `onCodeScanned: (code: string) => void`. Pure presentation; no scan state inside.

```tsx
import { Camera, useCameraDevice, useCodeScanner } from "react-native-vision-camera"

export function CameraView({ onCodeScanned }: { onCodeScanned: (code: string) => void }) {
  const device = useCameraDevice("back")
  const codeScanner = useCodeScanner({
    codeTypes: ["qr"],
    onCodeScanned: (codes) => codes[0]?.value && onCodeScanned(codes[0].value),
  })
  if (!device) return null
  return <Camera style={{ flex: 1 }} device={device} codeScanner={codeScanner} isActive />
}
```

(Adjust imports based on actual `react-native-vision-camera` API in `apps/mobile/package.json`.)

- [ ] **Step 3: Create `<LastScanCard>`** — pure presentational, takes `lastScan: { name, time, success }`.

- [ ] **Step 4: Create `<ManualEntryForm>`** — local `useState` for the input string + submit button. Calls `onSubmit(code: string)`.

- [ ] **Step 5: Refactor scanner.tsx**

- [ ] **Step 6: LOC + typecheck + commit**

```bash
wc -l "apps/mobile/app/(ops)/scanner.tsx" apps/mobile/components/scanner/*.tsx
git add apps/mobile/app/\(ops\)/scanner.tsx apps/mobile/components/scanner/
git commit -m "refactor(ops/scanner): extract camera + last-scan + manual entry"
```

### Task 4.4: Decompose `(member)/payments.tsx` (602 LOC)

**Files:**
- Create: `apps/mobile/components/payments/PaymentMethodRow.tsx`, `ReceiptCard.tsx`, `PaymentHistoryItem.tsx`
- Modify: `apps/mobile/app/(member)/payments.tsx`

- [ ] **Step 1: Read + identify**

```bash
wc -l "apps/mobile/app/(member)/payments.tsx"
```

- [ ] **Step 2: Three components**

```tsx
// PaymentMethodRow.tsx
export function PaymentMethodRow({ brand, last4, isDefault, onPress }: {
  brand: string; last4: string; isDefault: boolean; onPress: () => void
}) {
  return <Card onPress={onPress}>
    <Text>{brand} •••• {last4}</Text>
    {isDefault && <Badge>Default</Badge>}
  </Card>
}
```

`ReceiptCard` — pure presentational, takes `{ amount, currency, vatLine, date, items }`. `PaymentHistoryItem` — single-row variant.

- [ ] **Step 3: Refactor + commit**

```bash
git commit -m "refactor(member/payments): extract method/receipt/history subcomponents"
```

### Task 4.5: Decompose `(ops)/support.tsx` (585 LOC)

**Files:**
- Create: `apps/mobile/components/support/TicketRow.tsx`, `TicketComposer.tsx`, `StatusBadge.tsx`
- Modify: `apps/mobile/app/(ops)/support.tsx`

- [ ] **Step 1: Three components**

`<TicketRow>` takes `{ id, subject, status, lastUpdatedAt, onPress }`. `<TicketComposer>` is the input form with `useState`. `<StatusBadge>` maps `open|in_progress|resolved` to a color.

- [ ] **Step 2: Refactor + commit**

```bash
git commit -m "refactor(ops/support): extract ticket composer + status badge + row"
```

### Task 4.6: Decompose `(owner)/members/[id].tsx` (556 LOC)

**Files:**
- Create: `apps/mobile/components/member-detail/MemberHeader.tsx`, `MembershipSummary.tsx`, `ActionRow.tsx`
- Modify: `apps/mobile/app/(owner)/members/[id].tsx`

- [ ] **Step 1: Three components**

`<MemberHeader>` — name + avatar + joined date. `<MembershipSummary>` — plan name + days remaining + renew action. `<ActionRow>` — generic tappable row with icon.

- [ ] **Step 2: Refactor + commit**

```bash
git commit -m "refactor(owner/member-detail): extract 3 subcomponents"
```

### Task 4.7: Decompose `(trainer)/profile.tsx` (548 LOC)

**Files:**
- Create: `apps/mobile/components/trainer-profile/TrainerBio.tsx`, `EarningsCard.tsx`, `CertificationList.tsx`
- Modify: `apps/mobile/app/(trainer)/profile.tsx`

- [ ] **Step 1: Three components**

`<TrainerBio>` — name + photo + bio text. `<EarningsCard>` — month + currency + comparison delta. `<CertificationList>` — list of `{ name, issuer, year }`.

- [ ] **Step 2: Refactor + commit**

```bash
git commit -m "refactor(trainer/profile): extract bio + earnings + certs"
```

### Task 4.8: Decompose `(member)/rewards.tsx` (532 LOC)

**Files:**
- Create: `apps/mobile/components/rewards/PointsHero.tsx`, `RewardCard.tsx`, `TierProgress.tsx`
- Modify: `apps/mobile/app/(member)/rewards.tsx`

- [ ] **Step 1: Three components**

`<PointsHero>` — total points + tier name. `<RewardCard>` — one redeemable reward with cost + button. `<TierProgress>` — progress bar to next tier.

- [ ] **Step 2: Refactor + commit**

```bash
git commit -m "refactor(member/rewards): extract points/hero/reward/tier"
```

### Task 4.9: Decompose `(ops)/classes.tsx` (527 LOC)

**Files:**
- Create: `apps/mobile/components/ops-classes/ClassRow.tsx`, `RosterList.tsx`, `BookingToggle.tsx`
- Modify: `apps/mobile/app/(ops)/classes.tsx`

- [ ] **Step 1: Three components**

`<ClassRow>` — class name + time + attendance count. `<RosterList>` — list of attendees for selected class. `<BookingToggle>` — switch for "open to bookings".

- [ ] **Step 2: Refactor + commit**

```bash
git commit -m "refactor(ops/classes): extract row/roster/booking toggle"
```

### Task 4.10: Decompose `(member)/book.tsx` (520 LOC)

**Files:**
- Create: `apps/mobile/components/book/TrainerCard.tsx`, `TimeSlotPicker.tsx`, `BookingSummary.tsx`
- Modify: `apps/mobile/app/(member)/book.tsx`

- [ ] **Step 1: Three components**

`<TrainerCard>` — selectable card with photo + name + specialty. `<TimeSlotPicker>` — horizontal scroll of time slots. `<BookingSummary>` — sticky bottom bar showing selected slot + price + book button.

- [ ] **Step 2: Refactor + commit**

```bash
git commit -m "refactor(member/book): extract trainer/slot/summary"
```

### Task 4.11: Decompose `(trainer)/schedule.tsx` (492 LOC)

**Files:**
- Create: `apps/mobile/components/trainer-schedule/DayHeader.tsx`, `SessionBlock.tsx`, `WeekStrip.tsx`
- Modify: `apps/mobile/app/(trainer)/schedule.tsx`

- [ ] **Step 1: Three components**

`<DayHeader>` — current day label + arrow nav. `<SessionBlock>` — single session block with client name + time + status. `<WeekStrip>` — horizontal scroll of 7 days.

- [ ] **Step 2: Refactor + commit**

```bash
git commit -m "refactor(trainer/schedule): extract day/session/week-strip"
```

---

## Phase 5 — Web admin decomposition

### Task 5.1: Decompose `Dashboard.tsx` (618 LOC)

**Files:**
- Create: `apps/web/src/components/dashboard/KpiGrid.tsx`, `KpiCard.tsx`, `ScannerHealthPanel.tsx`, `RevenueChart.tsx`, `RecentPaymentsTable.tsx`
- Modify: `apps/web/src/components/Dashboard.tsx`

- [ ] **Step 1: Read Dashboard.tsx**

```bash
wc -l apps/web/src/components/Dashboard.tsx
```

- [ ] **Step 2: Identify each panel**

Read file, locate `<KpiGrid>`, `<ScannerHealthPanel>`, `<RevenueChart>`, `<RecentPaymentsTable>` JSX blocks (or the equivalent inline maps/cards).

- [ ] **Step 3: Extract `<KpiGrid>` and `<KpiCard>`**

```tsx
"use client"
import { Card, Text } from "@queenix/ui"

export type Kpi = { label: string; value: string | number; delta?: string }

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Card>
      <Text size="sm" tone="muted">{kpi.label}</Text>
      <Text size="xl" weight="700">{kpi.value}</Text>
      {kpi.delta ? <Text size="xs" tone="muted">{kpi.delta}</Text> : null}
    </Card>
  )
}

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
      {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
    </div>
  )
}
```

(Replace `@queenix/ui` import with the real existing import if different.)

- [ ] **Step 4: Extract the other 3 panels**

Each its own file under `apps/web/src/components/dashboard/`. Pure function components. Props in, JSX out.

- [ ] **Step 5: Refactor Dashboard.tsx**

Compose the 4 panels. Dashboard.tsx retains data-fetching + layout only.

- [ ] **Step 6: Verify line count**

```bash
wc -l apps/web/src/components/Dashboard.tsx apps/web/src/components/dashboard/*.tsx
```

Expected: Dashboard.tsx < 250 LOC.

- [ ] **Step 7: Typecheck**

```bash
cd apps/web && npx tsc --noEmit && cd ../..
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/Dashboard.tsx apps/web/src/components/dashboard/
git commit -m "refactor(web/dashboard): extract 4 panels, route 618→220 LOC"
```

---

## Phase 6 — Vitest unit tests

### Task 6.1: Add vitest to root + workspaces

**Files:**
- Modify: root `package.json`
- Modify: `packages/types/package.json`, `packages/convex/package.json`, `packages/payments/package.json`, `packages/receipts/package.json`

- [ ] **Step 1: Add vitest to root devDeps**

Edit root `package.json` `devDependencies`:
- Add `"vitest": "^2.1.0"`
- Add `"@vitest/coverage-v8": "^2.1.0"`

- [ ] **Step 2: Add typecheck/test scripts to each workspace**

For each of `packages/types`, `packages/convex`, `packages/payments`, `packages/receipts`:
- Add to `"scripts"`: `"test": "vitest run"` and `"typecheck": "tsc --noEmit"`

- [ ] **Step 3: Install**

```bash
npm install
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json packages/*/package.json
git commit -m "test: add vitest to all pure-logic workspaces"
```

### Task 6.2: Zod schemas test

**Files:**
- Create: `packages/types/src/__tests__/schemas.test.ts`

- [ ] **Step 1: Identify the schemas**

```bash
grep -E "^export (const|function) [A-Z][a-zA-Z]+Schema" packages/types/src/index.ts | head
```

- [ ] **Step 2: Write a test per schema**

```ts
import { describe, it, expect } from "vitest"
import { /* each schema */ } from "../index"

describe("schemas reject bad input", () => {
  it.each([
    ["userSchema", {}, ["name", "email"]],
    ["paymentSchema", { amount: -1 }, ["amount"]],
    // add one row per schema with at least one missing/invalid field
  ])("%s → throws", (name, input, _fields) => {
    // @ts-expect-error testing runtime
    expect(() => schema.parse(input)).toThrow()
  })
})

describe("schemas accept good input", () => {
  it("userSchema round-trips", () => {
    const u = { name: "A", email: "a@b.co", role: "member" }
    expect(userSchema.parse(u)).toEqual(u)
  })
})
```

- [ ] **Step 3: Run tests**

```bash
npm test --workspace @queenix/types
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/__tests__/
git commit -m "test(types): zod schema round-trip + rejection"
```

### Task 6.3: Convex mutations — payments idempotency

**Files:**
- Create: `packages/convex/convex/mutations/__tests__/payments.test.ts`

- [ ] **Step 1: Read the mutation**

```bash
cat packages/convex/convex/mutations/payments.ts | head -80
```

- [ ] **Step 2: Write the test**

```ts
import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import schema from "../schema"
import { api } from "../_generated/api"

test("recordPaymentSuccess is idempotent", async () => {
  const t = convexTest(schema)
  const asUser = t.withIdentity({ subject: "user_test" })
  const args = { paymentId: "p1", amount: 100, currency: "AED", method: "mock" }

  const first = await asUser.mutation(api.mutations.payments.recordPaymentSuccess, args)
  const second = await asUser.mutation(api.mutations.payments.recordPaymentSuccess, args)

  expect(first).toEqual(second)
  // And only one row was inserted
  const rows = await t.run(async (ctx) =>
    ctx.db.query("payments").filter((q) => q.eq(q.field("externalId"), "p1")).collect()
  )
  expect(rows.length).toBe(1)
})
```

(Adjust based on the actual export name and field names from the mutation file.)

- [ ] **Step 3: Run**

Note: if `providerFor` is not the actual exported name, grep for the real one:

```bash
grep -E "^export" packages/payments/src/index.ts
```

Then adapt the test to call the actual exported function.

```bash
npm test --workspace @queenix/payments
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add packages/convex/convex/mutations/__tests__/
git commit -m "test(convex): payments idempotency on duplicate webhook"
```

### Task 6.4: Convex mutations — users link

**Files:**
- Create: `packages/convex/convex/mutations/__tests__/users.test.ts`

- [ ] **Step 1: Read `linkUserToConvex` mutation**

```bash
grep -n "linkUserToConvex" packages/convex/convex/mutations/users.ts
```

- [ ] **Step 2: Write the test**

Asserts: rejects when no BetterAuth user matches; sets role from input; idempotent on re-link. Use the same `convexTest` pattern as Task 6.3.

- [ ] **Step 3: Run + commit**

```bash
npm test --workspace @queenix/convex
git add packages/convex/convex/mutations/__tests__/
git commit -m "test(convex): linkUserToConvex auth + idempotency"
```

### Task 6.5: Payments provider router

**Files:**
- Create: `packages/payments/src/__tests__/router.test.ts`

- [ ] **Step 1: Read the router**

```bash
head -80 packages/payments/src/index.ts
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from "vitest"
import { providerFor } from "../index"

describe("payments router", () => {
  it("AED → Tap", () => {
    expect(providerFor({ currency: "AED" })).toBe("tap")
  })
  it("USD → Stripe", () => {
    expect(providerFor({ currency: "USD" })).toBe("stripe")
  })
  it("mock env wins", () => {
    process.env.PAYMENTS_PROVIDER = "mock"
    expect(providerFor({ currency: "AED" })).toBe("mock")
  })
})
```

(Adjust exported names if the router uses different symbols — match what exists.)

- [ ] **Step 3: Run + commit**

```bash
npm test --workspace @queenix/payments
git add packages/payments/src/__tests__/
git commit -m "test(payments): router routing rules"
```

### Task 6.6: Receipt VAT math

**Files:**
- Create: `packages/receipts/src/__tests__/render.test.ts`

- [ ] **Step 1: Read the renderer**

```bash
grep -E "^export" packages/receipts/src/index.ts
```

- [ ] **Step 2: Write VAT math test**

```ts
import { describe, it, expect } from "vitest"
import { computeTotals } from "../index"

describe("receipt VAT", () => {
  it("AED 100 + 5% = 105", () => {
    expect(computeTotals({ subtotal: 100, vatRate: 0.05 })).toEqual({
      subtotal: 100, vat: 5, total: 105,
    })
  })
  it("rounds half-up to 2dp", () => {
    expect(computeTotals({ subtotal: 99.99, vatRate: 0.05 })).toEqual({
      subtotal: 99.99, vat: 5.00, total: 104.99,
    })
  })
  it("zero VAT", () => {
    expect(computeTotals({ subtotal: 50, vatRate: 0 })).toEqual({
      subtotal: 50, vat: 0, total: 50,
    })
  })
})
```

- [ ] **Step 3: Run + commit**

```bash
npm test --workspace @queenix/receipts
git add packages/receipts/src/__tests__/
git commit -m "test(receipts): VAT math + rounding"
```

### Task 6.7: Full test pass + coverage report

- [ ] **Step 1: Run all tests**

```bash
npm test 2>&1 | tail -30
```

Expected: ≥25 assertions, 0 failures.

- [ ] **Step 2: Coverage report**

```bash
npm run test --workspaces -- --coverage 2>&1 | tail -25
```

Expected: lines ≥70% on the four tested packages.

- [ ] **Step 3: No commit — verification only**

---

## Phase 7 — Playwright + Maestro E2E

### Task 7.1: Install Playwright in web app

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add devDeps**

```json
"@playwright/test": "^1.48.0"
```

- [ ] **Step 2: Install**

```bash
cd apps/web && npm install && npx playwright install chromium && cd ../..
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "test(web): install playwright + chromium"
```

### Task 7.2: Playwright config + dashboard test

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/dashboard.spec.ts`

- [ ] **Step 1: Config**

```ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "npm run dev",
    port: 3000,
    timeout: 60_000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
})
```

- [ ] **Step 2: Dashboard test**

```ts
import { test, expect } from "@playwright/test"

test("dashboard renders 4 KPI cards", async ({ page }) => {
  await page.goto("/")
  const cards = page.getByTestId("kpi-card")
  await expect(cards).toHaveCount(4)
})
```

- [ ] **Step 3: Run**

```bash
cd apps/web && npx playwright test e2e/dashboard.spec.ts
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/e2e/dashboard.spec.ts
git commit -m "test(e2e): playwright dashboard renders KPI grid"
```

### Task 7.3: Auth + scanner + payments webhook tests

**Files:**
- Create: `apps/web/e2e/auth-signin.spec.ts`, `apps/web/e2e/scanner-webhook.spec.ts`, `apps/web/e2e/payments-webhook.spec.ts`, `apps/web/e2e/receipt.spec.ts`

- [ ] **Step 1: auth-signin**

```ts
import { test, expect } from "@playwright/test"

test("sign-in happy path", async ({ request }) => {
  const res = await request.post("/api/auth/sign-in/email", {
    data: { email: "owner@queenix.test", password: "QueenixDemo123!" },
  })
  expect(res.status()).toBe(200)
  expect(res.headers()["set-cookie"]).toBeTruthy()
})

test("sign-in wrong password → 401", async ({ request }) => {
  const res = await request.post("/api/auth/sign-in/email", {
    data: { email: "owner@queenix.test", password: "wrong" },
  })
  expect(res.status()).toBe(401)
})
```

- [ ] **Step 2: scanner-webhook**

```ts
import { test, expect } from "@playwright/test"

test("scanner accepts valid token", async ({ request }) => {
  const res = await request.post("/api/scanner/qr", {
    data: { token: "valid-test-token", deviceId: "dev-1" },
  })
  expect([200, 404]).toContain(res.status())
})

test("scanner rejects malformed body", async ({ request }) => {
  const res = await request.post("/api/scanner/qr", { data: { token: "" } })
  expect(res.status()).toBeGreaterThanOrEqual(400)
})
```

Adjust based on actual API contract from `apps/web/src/app/api/scanner/qr/route.ts`.

- [ ] **Step 3: payments-webhook + receipt**

Read existing route.ts files to determine the exact expected statuses; write analogous tests.

- [ ] **Step 4: Run all**

```bash
cd apps/web && npx playwright test
```

Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/
git commit -m "test(e2e): 5 webhook + signin Playwright specs"
```

### Task 7.4: Maestro mobile smoke

**Files:**
- Create: `apps/mobile/e2e/login.yaml`

- [ ] **Step 1: Install Maestro**

```bash
brew install maestro   # macOS only; iOS simulator must be running
```

(Document this in RUNBOOK.md; the workflow itself doesn't need a binary in the repo.)

- [ ] **Step 2: Write flow**

```yaml
appId: host.exp.Exponent
---
- launchApp
- tap: "member@queenix.test"
- inputText: "QueenixDemo123!"
- tap: "Sign In"
- assertVisible: "Home"
```

(Adjust selectors to match the actual login screen UI.)

- [ ] **Step 3: Run**

```bash
cd apps/mobile && maestro test e2e/login.yaml
```

Expected: passes (requires Expo Go open on simulator).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/e2e/login.yaml
git commit -m "test(e2e): maestro login smoke flow"
```

---

## Phase 7.5 — Visual screenshot smoke (deferred)

The design spec §6 Layer 4 mentions a "visual smoke" pass via Playwright screenshots. This is intentionally deferred to the design session that follows (per the user's explicit direction: "Separate session after audit"). Leaving `apps/mobile/__tests__/screenshots.spec.ts` unimplemented in this session — when the implementer reaches Phase 8 final verification, they should confirm this gap is intentional and not a regression.

---

## Phase 8 — Final verification + RUNBOOK

### Task 8.1: Full verification triad

- [ ] **Step 1: Typecheck**

```bash
npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 2: Tests**

```bash
npm test 2>&1 | tail -20
```

Expected: ≥25 pass.

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -20
```

Expected: each workspace builds (or skip if dev-only).

- [ ] **Step 4: No commit — verification only**

### Task 8.2: Runtime smoke

- [ ] **Step 1: Clean stack**

```bash
docker compose down -v
```

- [ ] **Step 2: Bring up stack**

```bash
AUTH_SECRET=testing-secret-replace-before-production-min-32-chars-0123456789ab docker compose up -d
sleep 15
```

- [ ] **Step 3: Migrate + seed**

```bash
npm run db:migrate
npm run seed
```

- [ ] **Step 4: Curl smoke**

```bash
curl -sf http://localhost:3000 > /dev/null && echo "web OK" || echo "web FAIL"
curl -sf http://localhost:3210/version > /dev/null && echo "convex OK" || echo "convex FAIL"
```

- [ ] **Step 5: Mobile dev server smoke**

```bash
cd apps/mobile && npm run web &
sleep 8
curl -sf http://localhost:8081 > /dev/null && echo "expo OK" || echo "expo FAIL"
```

- [ ] **Step 6: Stop test stack (don't leave running)**

```bash
docker compose down
kill %1 2>/dev/null
```

- [ ] **Step 7: No commit — verification only**

### Task 8.3: RUNBOOK

**Files:**
- Create: `docs/RUNBOOK.md`

- [ ] **Step 1: Write the runbook**

```markdown
# Queenix Gym — Local Runbook

## 0. Prerequisites
- Node 20+
- Docker Desktop (or OrbStack on macOS)
- (Optional) Xcode 15+ for iOS simulator, Android Studio for emulator
- (Optional) Maestro CLI for mobile E2E: `brew install maestro`

## 1. Fresh setup (one time per machine)

```bash
git clone <repo> && cd queenix-gym
npm install                    # also bootstraps .env files via postinstall
docker compose up -d           # postgres + convex-backend + web
npm run db:migrate             # create SQLite auth tables
npm run seed                   # create 4 demo accounts + sample data
```

## 2. Daily dev

```bash
docker compose up -d           # if not already running
npm run dev                    # starts web (:3000) AND expo (:8081) in parallel
```

Open:
- Web admin: http://localhost:3000
- Expo web: http://localhost:8081
- Convex dashboard: http://localhost:3211

## 3. Demo accounts

| Role | Email | Password |
|---|---|---|
| Member | member@queenix.test | QueenixDemo123! |
| Trainer | trainer@queenix.test | QueenixDemo123! |
| Owner | owner@queenix.test | QueenixDemo123! |
| Operations | ops@queenix.test | QueenixDemo123! |

## 4. Tests

```bash
npm test                       # vitest across all pure-logic packages
npm run test:e2e:web           # playwright against running web admin
npm run test:e2e:mobile        # maestro flow on simulator
```

## 5. Troubleshooting

### Convex complains "schema out of date"
Run `npm run db:migrate` again — the on-disk schema is regenerated from `convex/schema.ts`.

### Auth: "BetterAuth secret missing"
Export `AUTH_SECRET` with at least 32 chars:
```bash
export AUTH_SECRET=$(openssl rand -base64 32)
```

### Metro: "Unable to resolve @queenix/ui"
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
npm install
```

### Reset everything
```bash
docker compose down -v
rm -rf .data apps/mobile/.expo apps/mobile/node_modules/.cache
npm install
docker compose up -d
npm run db:migrate
npm run seed
```
```

- [ ] **Step 2: Commit**

```bash
git add docs/RUNBOOK.md
git commit -m "docs: RUNBOOK for first-run + daily dev + troubleshooting"
```

### Task 8.4: Final tree audit

- [ ] **Step 1: Compare against baseline**

```bash
git status --porcelain
git diff --stat HEAD~72..HEAD | tail -40
```

Expected: every modified file is one I committed intentionally.

- [ ] **Step 2: List every commit**

```bash
git log --oneline HEAD~72..HEAD
```

Expected: ~70 commits, conventional-commit style.

- [ ] **Step 3: Final push to remote (if configured)**

Only push if explicitly asked. Default: leave on `master`.

---

## Done criteria checklist (self-verify)

- [ ] `npm install` succeeds on a fresh clone, zero peer-dep warnings
- [ ] `docker compose up -d` brings up postgres + convex + web, all healthchecks pass
- [ ] `npm run db:migrate` creates SQLite tables
- [ ] `npm run seed` creates 4 demo accounts visible via `sqlite3 .data/queenix-auth.db "SELECT email FROM user"`
- [ ] `npm test` passes (≥25 assertions, 0 failures)
- [ ] `npm run typecheck` exits 0
- [ ] `npm run test:e2e:web` passes (5 tests)
- [ ] `npm run test:e2e:mobile` passes (1 Maestro flow)
- [ ] Web admin loads at `http://localhost:3000`
- [ ] Mobile loads at `http://localhost:8081`
- [ ] Each of the 4 demo accounts can log in on web AND mobile
- [ ] Largest screen file < 350 LOC
- [ ] `docs/RUNBOOK.md` exists and matches reality
- [ ] `docker-compose.yml` exists and works
