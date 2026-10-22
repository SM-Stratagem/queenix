/**
 * Queenix live stress helpers (node built-ins + convex/browser only).
 * Env: BASE_URL (web, default dev :3001), CONVEX_URL (default dev :3210),
 *      QUEENIX_ADMIN_TOKEN, STRESS_MAX_LOAD (abort a run above this 1-min load avg),
 *      STRESS_CACHE (session cache file; avoids re-hashing passwords every run).
 * DEV ONLY: production rate-limits sign-in per IP and is shared.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { ConvexHttpClient } from 'convex/browser';
import { execFileSync } from 'node:child_process';

export const BASE = (process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://10.12.19.174:3001').replace(/\/$/, '');
export const CONVEX = process.env.CONVEX_URL || 'http://10.12.19.174:3210';
export const ADMIN_TOKEN = process.env.QUEENIX_ADMIN_TOKEN || 'queenix-dev-admin-token';
export const PASSWORD = 'StressTest123!';
export const MAX_LOAD = Number(process.env.STRESS_MAX_LOAD || 25);
const CACHE = process.env.STRESS_CACHE || path.join(os.tmpdir(), 'queenix-stress-sessions.json');

if (/:4000|:4210/.test(BASE + CONVEX) && !process.env.STRESS_ALLOW_PROD) {
  throw new Error('Refusing to stress the production stack (set STRESS_ALLOW_PROD=1 to override).');
}

/** Docker engine still answering (the shared VM crashed once under load). */
export function dockerOk() {
  if (process.env.STRESS_SKIP_DOCKER_CHECK) return true;
  try {
    execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], { stdio: 'ignore', timeout: 20_000 });
    return true;
  } catch {
    throw new Error('docker info failed: stack down, stopping');
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wait (up to 3 min) for the machine to cool below MAX_LOAD; throw if it never does. */
export async function loadGuard(label = '') {
  for (let i = 0; i < 36; i++) {
    const l = os.loadavg()[0];
    if (l <= MAX_LOAD && dockerOk()) return l;
    console.log(`  [load] ${l.toFixed(1)} > ${MAX_LOAD} before ${label}; waiting 5s`);
    await sleep(5000);
  }
  throw new Error(`load average stayed above ${MAX_LOAD}; aborting ${label}`);
}

/** Run fn(i) for i in [0,n) all at once; returns [{ok, ms, val|err}] plus wall time. */
export async function burst(n, fn) {
  const t0 = performance.now();
  const results = await Promise.all(
    Array.from({ length: n }, async (_, i) => {
      const s = performance.now();
      try {
        const val = await fn(i);
        return { ok: true, ms: performance.now() - s, val };
      } catch (err) {
        return { ok: false, ms: performance.now() - s, err: String(err?.data?.message ?? err?.data ?? err?.message ?? err).slice(0, 160) };
      }
    }),
  );
  results.wallMs = performance.now() - t0;
  return results;
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;

export const METRICS = [];
/** Summarise a burst; `okFn` overrides what counts as success (e.g. HTTP 2xx). */
export function record(scenario, conc, results, okFn = (r) => r.ok) {
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  const errs = results.filter((r) => !okFn(r));
  const row = {
    scenario,
    conc,
    n: results.length,
    p50: Math.round(pct(ms, 50)),
    p95: Math.round(pct(ms, 95)),
    max: Math.round(ms.at(-1) ?? 0),
    rps: +(results.length / (results.wallMs / 1000)).toFixed(1),
    errPct: +((100 * errs.length) / results.length).toFixed(1),
    load: +os.loadavg()[0].toFixed(1),
    sampleErr: errs[0]?.err ?? errs[0]?.val?.status ?? '',
  };
  METRICS.push(row);
  console.log(`  ${scenario} c=${conc} n=${row.n} p50=${row.p50}ms p95=${row.p95}ms max=${row.max}ms rps=${row.rps} err=${row.errPct}% load=${row.load}${row.sampleErr ? ` e.g. ${row.sampleErr}` : ''}`);
  return row;
}

export function printMetrics() {
  console.log('\n| scenario | conc | n | p50 ms | p95 ms | max ms | req/s | err % | load |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const r of METRICS) console.log(`| ${r.scenario} | ${r.conc} | ${r.n} | ${r.p50} | ${r.p95} | ${r.max} | ${r.rps} | ${r.errPct} | ${r.load} |`);
}

/* ---------------- HTTP + auth ---------------- */

export async function http(pathname, { method = 'GET', body, cookie, headers = {}, timeoutMs = 60_000 } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: {
      Origin: BASE,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'manual',
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, headers: res.headers, cookie: cookieOf(res) };
}

function cookieOf(res) {
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
}

export async function signIn(email, password = PASSWORD) {
  const r = await http('/api/auth/sign-in/email', { method: 'POST', body: { email, password } });
  if (r.status !== 200) throw new Error(`sign-in ${email}: ${r.status} ${r.text.slice(0, 120)}`);
  return { email, cookie: r.cookie, baId: r.json?.user?.id };
}

export async function signUp(email, fullName, password = PASSWORD) {
  const r = await http('/api/auth/sign-up/email', { method: 'POST', body: { email, password, name: fullName, fullName } });
  if (r.status !== 200) throw new Error(`sign-up ${email}: ${r.status} ${r.text.slice(0, 120)}`);
  return { email, cookie: r.cookie, baId: r.json?.user?.id };
}

let cache = null;
const loadCache = () => (cache ??= fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {});
const saveCache = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));

/** Session for a test user: cached cookie if still valid, else sign in, else sign up. */
export async function ensureUser(email, fullName = email.split('@')[0]) {
  const c = loadCache();
  const key = `${BASE}|${email}`;
  if (c[key]) {
    const t = await http('/api/convex/token', { cookie: c[key].cookie });
    if (t.status === 200) return { ...c[key], token: t.json.token };
  }
  let s;
  try {
    s = await signIn(email);
  } catch {
    s = await signUp(email, fullName);
  }
  const t = await http('/api/convex/token', { cookie: s.cookie });
  if (t.status !== 200) throw new Error(`token ${email}: ${t.status}`);
  c[key] = { email, cookie: s.cookie, baId: s.baId };
  saveCache();
  return { ...c[key], token: t.json.token };
}

/** Create/reuse `count` users with bounded parallelism (sign-up hashes passwords: CPU heavy). */
export async function ensureUsers(prefix, count, parallel = 5) {
  const out = [];
  for (let i = 0; i < count; i += parallel) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(parallel, count - i) }, (_, k) => ensureUser(`${prefix}-${i + k}@queenix.test`, `T Stress ${prefix.split('-').pop()} ${i + k}`)),
    );
    out.push(...batch);
  }
  return out;
}

export async function setRole(baId, activeRole, roles = [activeRole]) {
  const r = await http(`/api/admin/users/${baId}/role`, {
    method: 'POST',
    body: { activeRole, roles },
    headers: { 'x-queenix-admin-token': ADMIN_TOKEN },
  });
  if (r.status !== 200) throw new Error(`setRole ${activeRole}: ${r.status} ${r.text.slice(0, 120)}`);
}

/** Staff user with a role (cached session + role set via the admin role API). */
export async function ensureStaff(email, role) {
  const u = await ensureUser(email, `T Stress ${role}`);
  if (!u.baId) {
    // Cached session without id: look it up from the session endpoint.
    const s = await http('/api/auth/get-session', { cookie: u.cookie });
    u.baId = s.json?.user?.id;
  }
  await setRole(u.baId, role, [role, 'member']);
  return u;
}

export function convexFor(user) {
  const c = new ConvexHttpClient(CONVEX);
  if (user?.token) c.setAuth(user.token);
  return c;
}
export const anon = () => new ConvexHttpClient(CONVEX);

/* ---------------- assertions ---------------- */

export const FAILS = [];
export function check(cond, label, detail = '') {
  console.log(`  ${cond ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!cond) FAILS.push(`${label}${detail ? ` — ${detail}` : ''}`);
  return cond;
}

export function finish() {
  printMetrics();
  console.log(`\n${FAILS.length ? `FAILURES (${FAILS.length}):\n - ${FAILS.join('\n - ')}` : 'ALL CHECKS PASSED'}`);
  process.exitCode = FAILS.length ? 1 : 0;
}
