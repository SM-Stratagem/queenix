#!/usr/bin/env node
/**
 * Queenix Gym — create the 7 demo accounts for local testing.
 *
 * Reads config from root .env.testing, then for each role (superadmin,
 * member, trainer, owner/finance, operations, salon, coffee):
 *   1. Signs the account up through the REAL BetterAuth API
 *      (falls back to sign-in if it already exists).
 *   2. Patches its roles/activeRole in the SQLite auth DB.
 *   3. Links it into Convex via the internal `seed:seedDemoUsers` mutation
 *      (creates user row + profile + membership where relevant).
 *   4. Seeds the realistic demo dataset via internal `demoDataset:seedDemoDataset`
 *      (members, classes, PT, venues, finance, CRM, documents).
 *   Steps 3–4 need the Convex admin key in CONVEX_DEPLOY_KEY.
 *
 * Prerequisites (three terminals, from the repo root):
 *   pnpm --filter @queenix/convex dev     # Convex backend  (http://127.0.0.1:3210)
 *   pnpm --filter @queenix/web dev        # Web admin + auth (http://localhost:3000)
 *
 * Usage:
 *   CONVEX_DEPLOY_KEY=<admin key> node scripts/seed-demo-users.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath (not `new URL(...).pathname`) so workspace paths with
// spaces (e.g. "Queenix Gym") don't come out URL-encoded (%20).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- load .env.testing -------------------------------------------------------
function loadEnvFile(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}
// Optional defaults file (absent in the prod-mode seed container: env comes from compose).
const envFile = path.join(ROOT, '.env.testing');
const env = fs.existsSync(envFile) ? loadEnvFile(envFile) : {};

// Shell env wins; .env.testing is the default.
const AUTH_BASE = process.env.AUTH_BASE_URL ?? env.AUTH_BASE_URL ?? 'http://localhost:3000';
const CONVEX_URL =
  process.env.EXPO_PUBLIC_CONVEX_URL ?? env.EXPO_PUBLIC_CONVEX_URL ?? 'http://127.0.0.1:3210';
// Convex admin key: the seed mutations are internal (not callable anonymously).
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY;
const PASSWORD = process.env.DEMO_PASSWORD ?? env.DEMO_PASSWORD ?? 'QueenixDemo123!';

const DEMOS = [
  { role: 'superadmin', email: env.DEMO_SUPERADMIN_EMAIL ?? 'superadmin@queenix.test', name: env.DEMO_SUPERADMIN_NAME ?? 'Super Admin' },
  { role: 'member', email: env.DEMO_MEMBER_EMAIL ?? 'member@queenix.test', name: env.DEMO_MEMBER_NAME ?? 'Amna Member' },
  { role: 'trainer', email: env.DEMO_TRAINER_EMAIL ?? 'trainer@queenix.test', name: env.DEMO_TRAINER_NAME ?? 'Layla Trainer' },
  // 'owner' is the stored alias of 'finance' (normalized app-wide).
  { role: 'owner', email: env.DEMO_OWNER_EMAIL ?? 'owner@queenix.test', name: env.DEMO_OWNER_NAME ?? 'Sara Owner' },
  { role: 'operations', email: env.DEMO_OPERATIONS_EMAIL ?? 'ops@queenix.test', name: env.DEMO_OPERATIONS_NAME ?? 'Khalid Ops' },
  { role: 'salon', email: env.DEMO_SALON_EMAIL ?? 'salon@queenix.test', name: env.DEMO_SALON_NAME ?? 'Maha Stylist' },
  { role: 'coffee', email: env.DEMO_COFFEE_EMAIL ?? 'coffee@queenix.test', name: env.DEMO_COFFEE_NAME ?? 'Rania Barista' },
];

async function api(pathname, body, method = 'POST', extraHeaders = {}) {
  // Production auth rate-limits sign-in/sign-up (a few per 10s per IP):
  // back off on 429 and retry instead of failing half-way through.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${AUTH_BASE}${pathname}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: AUTH_BASE,
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 429 && attempt < 10) {
      const wait = Number(res.headers.get('x-retry-after') ?? res.headers.get('retry-after') ?? 5);
      await new Promise((r) => setTimeout(r, Math.max(1, wait) * 1000));
      continue;
    }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }
}

async function setRoleViaAdmin(userId, role) {
  return api(
    `/api/admin/users/${userId}/role`,
    { activeRole: role, roles: [role] },
    'POST',
    { 'x-queenix-admin-token': process.env.QUEENIX_ADMIN_TOKEN ?? 'queenix-dev-admin-token' }
  );
}

async function ensureAuthUser({ email, name }) {
  let r = await api('/api/auth/sign-up/email', { email, password: PASSWORD, name, fullName: name });
  if (r.data?.user?.id) return { id: r.data.user.id, created: true };
  // Already exists (or validation) → sign in to resolve the id
  r = await api('/api/auth/sign-in/email', { email, password: PASSWORD });
  if (r.data?.user?.id) return { id: r.data.user.id, created: false };
  throw new Error(`auth failed for ${email}: HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
}

/**
 * Call an internal Convex mutation with the admin key (POST /api/mutation,
 * same on self-hosted and cloud). Retried: in compose the seed runs as soon
 * as web is healthy, but function sync can lag ~30s behind. 6 x 10s.
 */
async function convexMutation(fnPath, args) {
  let last;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fetch(`${CONVEX_URL}/api/mutation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Convex ${CONVEX_DEPLOY_KEY}` },
        body: JSON.stringify({ path: fnPath, args, format: 'json' }),
      });
      const body = await res.text().catch(() => '');
      last = `HTTP ${res.status} ${body.slice(0, 160)}`;
      if (res.ok && !body.includes('"status":"error"')) {
        console.log(`convex ${fnPath}:`, body.slice(0, 300));
        return;
      }
    } catch (e) {
      last = `${CONVEX_URL} not reachable (${e.message})`;
    }
    console.error(`  ${fnPath} attempt ${attempt}/6 → ${last}`);
    if (attempt < 6) await new Promise((r) => setTimeout(r, 10000));
  }
  console.error(`✗ Convex ${fnPath} failed at ${CONVEX_URL}. Re-run later: node scripts/seed-demo-users.mjs (idempotent).`);
  process.exit(1);
}

async function main() {
  if (!CONVEX_DEPLOY_KEY) {
    console.error('✗ CONVEX_DEPLOY_KEY is not set — the Convex admin key is required to run the internal seed mutations.');
    console.error('  Local: export CONVEX_DEPLOY_KEY=<CONVEX_SELF_HOSTED_ADMIN_KEY from packages/convex/.env.local>');
    process.exit(1);
  }

  // --- preconditions ---------------------------------------------------------
try {
      const r = await fetch(`${AUTH_BASE}/api/auth/get-session`, { headers: { Origin: AUTH_BASE } });
      if (!r.ok && r.status !== 401 && r.status !== 403) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
    console.error(`✗ Web/auth not reachable at ${AUTH_BASE} (${e.message}).`);
    console.error('  Start it first:  pnpm --filter @queenix/web dev');
    process.exit(1);
  }

  // --- 1+2. auth accounts + role patch ----------------------------------------
  // Roles go through the web admin endpoint (works on Postgres or SQLite).
  const linked = [];
  for (const demo of DEMOS) {
    const { id, created } = await ensureAuthUser(demo);
    // Apply role via admin endpoint so demo accounts have the correct role.
    await setRoleViaAdmin(id, demo.role);
    linked.push({
      email: demo.email,
      betterAuthUserId: id,
      fullName: demo.name,
      roles: [demo.role],
      activeRole: demo.role,
    });
    console.log(`${created ? 'created' : 'exists '}  ${demo.role.padEnd(10)} ${demo.email}`);
  }

  // --- 3. Convex link + 4. demo dataset --------------------------------------
  // Both seeders are internal Convex functions: only the admin key reaches them.
  await convexMutation('seed:seedDemoUsers', { users: linked });
  // Members, classes, PT, venues, finance, CRM, docs. Idempotent — safe to re-run.
  await convexMutation('demoDataset:seedDemoDataset', {});
  // Public website: stock hero/gallery photos + sample blog posts. Idempotent.
  await convexMutation('siteSeed:seedSiteContent', {});

  console.log('\nDone. Log in anywhere with:');
  for (const demo of DEMOS) console.log(`  ${demo.role.padEnd(10)} ${demo.email} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
