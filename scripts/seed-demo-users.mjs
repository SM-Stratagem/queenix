#!/usr/bin/env node
/**
 * Queenix Gym — create the 4 demo accounts for local testing.
 *
 * Reads config from root .env.testing, then for each role (member, trainer,
 * owner, operations):
 *   1. Signs the account up through the REAL BetterAuth API
 *      (falls back to sign-in if it already exists).
 *   2. Patches its roles/activeRole in the SQLite auth DB.
 *   3. Links it into Convex via the `seed:seedDemoUsers` mutation
 *      (creates user row + profile + membership where relevant).
 *
 * Prerequisites (three terminals, from the repo root):
 *   pnpm --filter @queenix/convex dev     # Convex backend  (http://127.0.0.1:3210)
 *   pnpm --filter @queenix/web dev        # Web admin + auth (http://localhost:3000)
 *
 * Usage:
 *   node scripts/seed-demo-users.mjs
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
const env = loadEnvFile(path.join(ROOT, '.env.testing'));

// Shell env wins; .env.testing is the default.
const AUTH_BASE = process.env.AUTH_BASE_URL ?? env.AUTH_BASE_URL ?? 'http://localhost:3000';
const CONVEX_URL =
  process.env.EXPO_PUBLIC_CONVEX_URL ?? env.EXPO_PUBLIC_CONVEX_URL ?? 'http://127.0.0.1:3210';
const PASSWORD = process.env.DEMO_PASSWORD ?? env.DEMO_PASSWORD ?? 'QueenixDemo123!';
const DB_PATH =
  process.env.AUTH_DB_PATH ?? env.AUTH_DB_PATH ?? path.join(ROOT, 'apps/web/.data/queenix-auth.db');

const DEMOS = [
  { role: 'member', email: env.DEMO_MEMBER_EMAIL, name: env.DEMO_MEMBER_NAME ?? 'Amna Member' },
  { role: 'trainer', email: env.DEMO_TRAINER_EMAIL, name: env.DEMO_TRAINER_NAME ?? 'Layla Trainer' },
  { role: 'owner', email: env.DEMO_OWNER_EMAIL, name: env.DEMO_OWNER_NAME ?? 'Sara Owner' },
  { role: 'operations', email: env.DEMO_OPERATIONS_EMAIL, name: env.DEMO_OPERATIONS_NAME ?? 'Khalid Ops' },
];

async function api(pathname, body, method = 'POST', extraHeaders = {}) {
  const res = await fetch(`${AUTH_BASE}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: AUTH_BASE,
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
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

async function main() {
  // --- preconditions ---------------------------------------------------------
try {
      const r = await fetch(`${AUTH_BASE}/api/auth/get-session`, { headers: { Origin: AUTH_BASE } });
      if (!r.ok && r.status !== 401 && r.status !== 403) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
    console.error(`✗ Web/auth not reachable at ${AUTH_BASE} (${e.message}).`);
    console.error('  Start it first:  pnpm --filter @queenix/web dev');
    process.exit(1);
  }
  if (!fs.existsSync(DB_PATH)) {
    console.error(`✗ Auth DB not found at ${DB_PATH}.`);
    console.error('  The web server creates it on first auth request — sign up once, then re-run.');
    process.exit(1);
  }

  // --- 1+2. auth accounts + role patch ----------------------------------------
  // Use BetterAuth API to set roles (the storage SQLite belongs to the container).
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

  // --- 3. Convex link ----------------------------------------------------------
  // Self-hosted Convex: POST to /api/run/<module>/<function> with {args, format}.
  // Cloud Convex:     POST to /api/mutation        with {path, args, format}.
  const isSelfHosted = CONVEX_URL.includes('localhost') || CONVEX_URL.includes('127.');
  const convexUrl = isSelfHosted
    ? `${CONVEX_URL}/api/run/seed/seedDemoUsers`
    : `${CONVEX_URL}/api/mutation`;
  const convexBody = isSelfHosted
    ? { args: { users: linked }, format: 'json' }
    : {
        path: 'seed:seedDemoUsers',
        args: { users: linked },
        format: 'json',
      };
  let convexRes;
  try {
    const res = await fetch(convexUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(convexBody),
    });
    convexRes = { status: res.status, body: await res.text().catch(() => '') };
  } catch (e) {
    console.error(`✗ Convex not reachable at ${CONVEX_URL} (${e.message}).`);
    process.exit(1);
  }
  console.log('convex seedDemoUsers:', JSON.stringify(convexRes).slice(0, 300));

  console.log('\nDone. Log in anywhere with:');
  for (const demo of DEMOS) console.log(`  ${demo.role.padEnd(10)} ${demo.email} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
