#!/usr/bin/env node
/**
 * Queenix live stress / concurrency suite (DEV stack only).
 *
 *   node tests/live/stress.mjs [setup] [auth] [booking] [commerce] [access] [web] [broadcast] [cms] [reactive]
 *   (no args = all). Env: see stress-lib.mjs. STRESS_LEVELS="10,25,50" caps the ramp.
 *
 * Fixtures that have no public mutation (class instances, access credentials)
 * are appended with `npx convex import --append` against packages/convex/.env.local
 * (the DEV backend). Every record is tagged t-stress; transient queue rows are
 * cancelled at the end of their scenario.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { anyApi as api } from 'convex/server';
import { ConvexClient, ConvexHttpClient } from 'convex/browser';
import {
  BASE, CONVEX, anon, burst, check, convexFor, ensureStaff, ensureUser, ensureUsers, finish, http,
  loadGuard, record, signIn, sleep, FAILS,
} from './stress-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONVEX_DIR = path.join(ROOT, 'packages/convex');
const LEVELS = (process.env.STRESS_LEVELS || '10,25').split(',').map(Number);
const RUN = Date.now().toString(36);
const N_MEMBERS = 30;

/* ---------------- fixtures ---------------- */

const ctx = {};

async function setup() {
  console.log('\n## setup');
  await loadGuard('setup');
  const t0 = performance.now();
  ctx.members = await ensureUsers('t-stress', N_MEMBERS, 3);
  ctx.admin = await ensureStaff('t-stress-admin@queenix.test', 'admin');
  ctx.coffeeA = await ensureStaff('t-stress-coffee-a@queenix.test', 'coffee');
  ctx.coffeeB = await ensureStaff('t-stress-coffee-b@queenix.test', 'coffee');
  for (const u of [...ctx.members, ctx.admin, ctx.coffeeA, ctx.coffeeB]) {
    u.id = (await convexFor(u).query(api.queries.users.getCurrentUser, {}))?._id;
    if (!u.id) throw new Error(`no Convex user for ${u.email}`);
  }
  console.log(`  ${ctx.members.length} members + 3 staff ready in ${Math.round(performance.now() - t0)}ms`);
}

/** Convex auth tokens live 5 min: refresh before each scenario. */
async function refresh(users) {
  await Promise.all(
    users.map(async (u) => {
      const r = await http('/api/convex/token', { cookie: u.cookie });
      if (r.status === 200) u.token = r.json.token;
    }),
  );
}
const allUsers = () => [...ctx.members, ctx.admin, ctx.coffeeA, ctx.coffeeB];

function convexImport(table, rows) {
  if (!/10\.12\.19\.174:3210|127\.0\.0\.1:3210|localhost:3210/.test(CONVEX) && !process.env.CONVEX_SELF_HOSTED_URL) {
    throw new Error('fixture import needs CONVEX_SELF_HOSTED_URL/ADMIN_KEY for a non-dev backend');
  }
  const file = path.join(os.tmpdir(), `stress-${table}-${RUN}-${Math.random().toString(36).slice(2, 6)}.jsonl`);
  fs.writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  execFileSync('npx', ['convex', 'import', '--append', '--table', table, '-y', file], { cwd: CONVEX_DIR, stdio: 'pipe', timeout: 120_000 });
}

function convexData(table, limit = 5000) {
  const out = execFileSync('npx', ['convex', 'data', table, '--limit', String(limit), '--format', 'jsonLines'], {
    cwd: CONVEX_DIR, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 120_000, stdio: ['ignore', 'pipe', 'ignore'],
  });
  return out.split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
}

let classTypeId;
async function createClass(capacity, label) {
  if (!classTypeId) {
    const up = await anon().query(api.queries.classes.getUpcomingClasses, { limit: 1 });
    classTypeId = up[0]?.classTypeId ?? convexData('classTypes', 1)[0]._id;
  }
  const notes = `t-stress ${label} ${RUN}`;
  const startsAt = Date.now() + 20 * 86400_000 + Math.floor(Math.random() * 86400_000);
  convexImport('classInstances', [
    { classTypeId, startsAt, endsAt: startsAt + 3600_000, capacity, bookedCount: 0, waitlistCount: 0, status: 'scheduled', notes },
  ]);
  const row = convexData('classInstances').find((c) => c.notes === notes);
  if (!row) throw new Error('class import not visible');
  return row._id;
}

/** All of this run's booking rows for a class (every booker is one of ctx.members). */
async function classRows(classId) {
  const lists = await Promise.all(ctx.members.map((m) => convexFor(m).query(api.queries.classes.getMyBookings, {})));
  return lists.flat().filter((b) => b.classInstanceId === classId);
}

async function classInvariants(classId, label) {
  const cls = await anon().query(api.queries.classes.getClassById, { id: classId });
  const rows = await classRows(classId);
  const confirmed = rows.filter((b) => b.status === 'confirmed').length;
  const waitlisted = rows.filter((b) => b.status === 'waitlisted').length;
  const perUser = new Map();
  for (const b of rows.filter((b) => b.status !== 'cancelled')) perUser.set(b.userId, (perUser.get(b.userId) ?? 0) + 1);
  check(confirmed <= cls.capacity, `${label}: no overbooking`, `confirmed rows=${confirmed} capacity=${cls.capacity}`);
  check(cls.bookedCount === confirmed, `${label}: bookedCount matches confirmed rows`, `bookedCount=${cls.bookedCount} rows=${confirmed}`);
  check((cls.waitlistCount ?? 0) === waitlisted, `${label}: waitlistCount matches waitlisted rows`, `waitlistCount=${cls.waitlistCount} rows=${waitlisted}`);
  check([...perUser.values()].every((n) => n === 1), `${label}: at most one live booking per member`);
  return { cls, rows, confirmed, waitlisted };
}

const errCode = (r) => (r.ok ? 'ok' : r.err);
const tally = (results) => results.reduce((m, r) => ((m[errCode(r)] = (m[errCode(r)] ?? 0) + 1), m), {});

/* ---------------- 1. auth ---------------- */

async function auth() {
  console.log('\n## auth');
  const ms = ctx.members;
  for (const c of LEVELS.filter((l) => l <= ms.length)) {
    await loadGuard(`sign-in c=${c}`);
    const res = await burst(c, (i) => signIn(ms[i].email));
    record('auth: sign-in (distinct users)', c, res);
    res.forEach((r, i) => r.ok && (ms[i].cookie = r.val.cookie));
  }
  for (const c of LEVELS) {
    await loadGuard(`token c=${c}`);
    const res = await burst(c, (i) => http('/api/convex/token', { cookie: ms[i % ms.length].cookie }));
    record('auth: /api/convex/token', c, res, (r) => r.ok && r.val.status === 200);
    // Session isolation: every token's sub is its own user.
    const mixed = res.filter((r, i) => {
      if (!r.ok || r.val.status !== 200) return false;
      const sub = JSON.parse(Buffer.from(r.val.json.token.split('.')[1], 'base64url').toString()).sub;
      return sub !== ms[i % ms.length].baId;
    });
    check(mixed.length === 0, `token c=${c}: every token carries its own session's user`, `${mixed.length} mismatched`);
  }
  // Rapid sign-ins of ONE user from one IP: dev has rate limiting disabled (NODE_ENV=development).
  await loadGuard('same-user sign-ins');
  const same = await burst(12, () => http('/api/auth/sign-in/email', { method: 'POST', body: { email: ms[0].email, password: 'StressTest123!' } }));
  const codes = same.map((r) => r.val?.status ?? r.err);
  console.log(`  12 rapid sign-ins (same user, same IP) → statuses ${JSON.stringify(codes)} (prod rule: 10/60s per IP)`);
  // Sessions still valid after the bursts.
  const valid = await burst(ms.length, (i) => http('/api/convex/token', { cookie: ms[i].cookie }));
  check(valid.every((r) => r.ok && r.val.status === 200), 'all sessions still valid after bursts', JSON.stringify(tally(valid.map((r) => ({ ok: r.ok && r.val.status === 200, err: r.val?.status ?? r.err })))));
}

/* ---------------- 2. booking races ---------------- */

async function booking() {
  console.log('\n## booking');
  await refresh(ctx.members);
  const ms = ctx.members;
  const N = 10;
  const A = await createClass(N, 'race-A');
  const B = await createClass(N, 'dup-B');

  await loadGuard('book race');
  const race = await burst(3 * N, (i) => convexFor(ms[i]).mutation(api.mutations.bookings.bookClass, { classInstanceId: A, idempotencyKey: `s-${RUN}-A-${i}` }));
  record('booking: 3N bookClass race (N=10)', 3 * N, race, () => true);
  const t = tally(race);
  check(t.ok === N, 'booking race: exactly N succeed', JSON.stringify(t));
  await classInvariants(A, 'class A after race');

  // Duplicate booking by one member: fresh keys + a repeated key, all at once.
  const dupKey = `s-${RUN}-B-same`;
  const dup = await burst(20, (i) =>
    convexFor(ms[0]).mutation(api.mutations.bookings.bookClass, { classInstanceId: B, idempotencyKey: i < 10 ? `s-${RUN}-B-${i}` : dupKey }),
  );
  record('booking: same member x20', 20, dup, () => true);
  const ids = new Set(dup.filter((r) => r.ok).map((r) => r.val._id));
  check(ids.size === 1, 'duplicate booking: one member gets exactly one booking', `distinct booking ids=${ids.size} ${JSON.stringify(tally(dup))}`);
  await classInvariants(B, 'class B after duplicate burst');

  // Waitlist: every loser joins at once.
  const losers = race.map((r, i) => (!r.ok ? i : -1)).filter((i) => i >= 0);
  const wl = await burst(losers.length, (k) => convexFor(ms[losers[k]]).mutation(api.mutations.bookings.joinWaitlist, { classInstanceId: A, idempotencyKey: `s-${RUN}-W-${k}` }));
  record('booking: joinWaitlist race', losers.length, wl, () => true);
  check(wl.every((r) => r.ok && r.val.status === 'waitlisted'), 'all losers waitlisted', JSON.stringify(tally(wl)));
  await classInvariants(A, 'class A after waitlist');

  // Cancel + rebook race: 5 confirmed members cancel while the same 5 rebook.
  const winners = race.map((r, i) => (r.ok ? { i, id: r.val._id } : null)).filter(Boolean).slice(0, 5);
  const mix = await burst(10, (k) => {
    const w = winners[k % 5];
    return k < 5
      ? convexFor(ms[w.i]).mutation(api.mutations.bookings.cancelBooking, { bookingId: w.id })
      : convexFor(ms[w.i]).mutation(api.mutations.bookings.bookClass, { classInstanceId: A, idempotencyKey: `s-${RUN}-R-${k}` });
  });
  record('booking: cancel+rebook race', 10, mix, () => true);
  console.log(`  cancel+rebook outcomes ${JSON.stringify(tally(mix))}`);
  const afterMix = await classInvariants(A, 'class A after cancel+rebook');
  check(afterMix.confirmed === N, 'freed seats were refilled from the waitlist (class still full)', `confirmed=${afterMix.confirmed}`);

  // Correctness probe: a WAITLISTED member calls cancelBooking (public mutation).
  const wlRow = afterMix.rows.find((b) => b.status === 'waitlisted');
  if (wlRow) {
    const owner = ms.find((m) => m.id === wlRow.userId);
    const before = await anon().query(api.queries.classes.getClassById, { id: A });
    await convexFor(owner).mutation(api.mutations.bookings.cancelBooking, { bookingId: wlRow._id });
    const after = await anon().query(api.queries.classes.getClassById, { id: A });
    check(after.bookedCount === before.bookedCount, 'cancelBooking on a waitlisted booking leaves bookedCount alone', `bookedCount ${before.bookedCount} → ${after.bookedCount}`);
    check(after.waitlistCount === before.waitlistCount - 1, 'cancelBooking on a waitlisted booking decrements waitlistCount', `waitlistCount ${before.waitlistCount} → ${after.waitlistCount}`);
    // If the counter drifted, a member with no live booking can now take an 11th seat.
    const free = ms.find((m) => !afterMix.rows.some((b) => b.userId === m.id && b.status !== 'cancelled') && m !== owner);
    if (free) {
      const r = await burst(1, () => convexFor(free).mutation(api.mutations.bookings.bookClass, { classInstanceId: A, idempotencyKey: `s-${RUN}-X` }));
      console.log(`  extra booking attempt after waitlist-cancel → ${JSON.stringify(tally(r))}`);
    }
    await classInvariants(A, 'class A after waitlisted cancelBooking');
  }
  ctx.classA = A;
}

/* ---------------- 3. commerce ---------------- */

async function commerce() {
  console.log('\n## commerce');
  await refresh(allUsers());
  const ms = ctx.members;
  const admin = convexFor(ctx.admin);
  let menu = await admin.query(api.queries.commerce.coffeeMenu, {});
  if (!menu.length) {
    await admin.mutation(api.mutations.commerce.createCoffeeItem, { name: `t-stress latte ${RUN}`, priceCents: 1500 });
    menu = await admin.query(api.queries.commerce.coffeeMenu, {});
  }
  const item = menu[0]._id;

  const orders = [];
  for (const c of LEVELS.filter((l) => l <= ms.length)) {
    await loadGuard(`coffee c=${c}`);
    const res = await burst(c, (i) => convexFor(ms[i]).mutation(api.mutations.commerce.orderCoffee, { items: [{ itemId: item, qty: 1 }], paymentMode: 'test' }));
    record('commerce: orderCoffee', c, res);
    orders.push(...res.filter((r) => r.ok).map((r) => r.val));
  }
  check(new Set(orders).size === orders.length, 'coffee: every order has a distinct id');

  const dbl = await burst(2, () => convexFor(ms[0]).mutation(api.mutations.commerce.orderCoffee, { items: [{ itemId: item, qty: 1 }], paymentMode: 'test' }));
  orders.push(...dbl.filter((r) => r.ok).map((r) => r.val));
  console.log(`  double-submit orderCoffee (same member, same cart) → ${dbl.filter((r) => r.ok).length} orders (no idempotency key)`);

  // Two baristas advance the same order at the same moment.
  const A = convexFor(ctx.coffeeA), Bc = convexFor(ctx.coffeeB);
  const raced = orders.slice(0, 10);
  const st = await burst(20, (k) => (k % 2 ? Bc : A).mutation(api.mutations.commerce.updateCoffeeOrderStatus, { orderId: raced[k >> 1], status: k % 2 ? 'cancelled' : 'served' }));
  record('commerce: 2 staff advance same order', 20, st);
  check(st.every((r) => r.ok), 'status race: no errors (last write wins)', JSON.stringify(tally(st)));
  // Transition guard probe: served/cancelled → preparing should be refused.
  const back = await burst(1, () => A.mutation(api.mutations.commerce.updateCoffeeOrderStatus, { orderId: raced[0], status: 'preparing' }));
  check(!back[0].ok, 'coffee: a served/cancelled order cannot go back to preparing', back[0].ok ? 'accepted' : back[0].err);

  // Counter cash: both baristas mark the same order paid.
  const paid = await burst(2, (k) => (k ? Bc : A).mutation(api.mutations.commerce.markCoffeeOrderCashPaid, { orderId: orders[11] }));
  check(paid.filter((r) => r.ok).length === 1, 'cash paid race: exactly one barista records the payment', JSON.stringify(tally(paid)));

  // Clean the shared coffee queue.
  await burst(orders.length, (i) => A.mutation(api.mutations.commerce.updateCoffeeOrderStatus, { orderId: orders[i], status: 'cancelled' }));

  // Salon: everyone grabs the same slot.
  const svc = await admin.mutation(api.mutations.commerce.createSalonService, { name: `t-stress blowdry ${RUN}`, priceCents: 9000, durationMin: 30 });
  const slot = Math.ceil((Date.now() + 2 * 86400_000) / 3600_000) * 3600_000;
  await loadGuard('salon race');
  const sal = await burst(ms.length, (i) => convexFor(ms[i]).mutation(api.mutations.commerce.bookSalon, { serviceId: svc, startAt: slot, paymentMode: 'test' }));
  record('commerce: bookSalon same slot', ms.length, sal, () => true);
  check(sal.filter((r) => r.ok).length === 1, 'salon slot race: exactly one booking wins', JSON.stringify(tally(sal)));
  const distinct = await burst(ms.length, (i) => convexFor(ms[i]).mutation(api.mutations.commerce.bookSalon, { serviceId: svc, startAt: slot + (i + 1) * 3600_000, paymentMode: 'test' }));
  record('commerce: bookSalon distinct slots', ms.length, distinct);
  const salonIds = [...sal, ...distinct].filter((r) => r.ok).map((r) => r.val);
  await burst(salonIds.length, (i) => admin.mutation(api.mutations.commerce.updateSalonBookingStatus, { bookingId: salonIds[i], status: 'cancelled' }));
  await admin.mutation(api.mutations.commerce.setSalonServiceActive, { serviceId: svc, isActive: false });

  // Membership purchase double-submit.
  const plans = await anon().query(api.queries.site.listPlans, {});
  const plan = plans.find((p) => p.priceCents > 0) ?? plans[0];
  const m0 = convexFor(ms[0]);
  const co = await burst(5, () => m0.mutation(api.mutations.payments.createMembershipCheckout, { planId: plan.id }));
  const pids = new Set(co.filter((r) => r.ok).map((r) => r.val.paymentId));
  check(pids.size === 1, 'membership checkout double-submit collapses to one payment', `${pids.size} pending payments from 5 taps`);
  const intents = await burst(2, (k) => http('/api/payments/create-intent', { method: 'POST', cookie: ms[0].cookie, body: { paymentId: [...pids][k] } }));
  console.log(`  create-intent for 2 of those payments → ${intents.map((r) => r.val?.status + ' ' + (r.val?.json?.paymentIntentId ?? r.val?.json?.error ?? r.err)).join(' | ')}`);

  // Price integrity: a member-chosen amount for a membership plan.
  const m1 = convexFor(ms[1]);
  const cheapId = await m1.mutation(api.mutations.payments.createPaymentIntent, { amountCents: 1, currency: plan.currency, type: 'membership', description: 't-stress tamper', planId: plan.id });
  const ci = await http('/api/payments/create-intent', { method: 'POST', cookie: ms[1].cookie, body: { paymentId: cheapId } });
  // Server prices membership payments from the plan; the client's amountCents is ignored.
  const stored = convexData('payments').find((x) => x._id === cheapId);
  check(stored?.amountCents === plan.priceCents, 'membership payment is priced from the plan, not the client amount', `stored ${stored?.amountCents} vs plan ${plan.priceCents}`);

  // Webhook replay (mock mode): Stripe signature path needs STRIPE_WEBHOOK_SECRET.
  const wh = await http('/api/payments/stripe/webhook', { method: 'POST', body: '{"type":"payment_intent.succeeded"}', headers: { 'stripe-signature': 't=1,v1=00' } });
  console.log(`  stripe webhook (bad signature) → ${wh.status} ${wh.text.slice(0, 90)}`);

  // Replay the success event 10x concurrently at the Convex layer (what the webhook calls).
  const piId = ci.json?.paymentIntentId;
  const key = adminKey();
  if (piId && key) {
    const sys = new ConvexHttpClient(CONVEX);
    sys.setAdminAuth(key);
    // A gateway reporting 1 fil for a plan-priced payment must fail it, not activate the plan.
    await sys.mutation(api.mutations.payments.recordPaymentSuccess, { stripePaymentIntentId: piId, amountCents: 1, currency: plan.currency }).catch(() => {});
    const afterTamper = convexData('payments').find((x) => x._id === cheapId);
    check(afterTamper?.status === 'failed', 'a 1-fil success event fails the payment (amount mismatch)', `status ${afterTamper?.status}`);
    const mem = await m1.query(api.queries.memberships.getCurrentMembership, {});
    check(!(mem && mem.planId === plan.id), 'a 1-fil payment must not activate a paid plan', mem ? `ACTIVE ${mem.plan?.name} (${plan.priceCents} ${plan.currency}) for 1` : 'none');

    // Replay a correct success event 10x concurrently on a fresh payment → exactly one invoice.
    const m2 = convexFor(ms[2]);
    const okId = await m2.mutation(api.mutations.payments.createPaymentIntent, { amountCents: plan.priceCents, currency: plan.currency, type: 'membership', description: 't-stress replay', planId: plan.id });
    const okIntent = await http('/api/payments/create-intent', { method: 'POST', cookie: ms[2].cookie, body: { paymentId: okId } });
    const okPi = okIntent.json?.paymentIntentId;
    if (okPi) {
      const rep = await burst(10, () => sys.mutation(api.mutations.payments.recordPaymentSuccess, { stripePaymentIntentId: okPi, amountCents: plan.priceCents, currency: plan.currency }));
      record('commerce: webhook success replay x10', 10, rep);
      const invoices = convexData('invoices').filter((x) => x.paymentId === okId);
      check(invoices.length === 1, 'duplicate success event → exactly one invoice', `${invoices.length} invoices`);
      const actives = convexData('memberships').filter((x) => x.userId === ms[2].id && x.status === 'active');
      check(actives.length <= 1, 'replay leaves at most one active membership', `${actives.length} active`);
    }
  }
}

function adminKey() {
  if (process.env.CONVEX_SELF_HOSTED_ADMIN_KEY) return process.env.CONVEX_SELF_HOSTED_ADMIN_KEY;
  const f = path.join(CONVEX_DIR, '.env.local');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').match(/^CONVEX_SELF_HOSTED_ADMIN_KEY=(.+)$/m)?.[1]?.trim() : undefined;
}

/* ---------------- 4. access control ---------------- */

async function access() {
  console.log('\n## access');
  await refresh(allUsers());
  const ms = ctx.members;
  const membership = convexData('memberships', 1)[0]._id; // ponytail: credential just needs a valid membership id; the scan never reads it.
  const exp = Date.now() + 3600_000;
  const tokens = ms.map((_, i) => `t-stress-qr-${RUN}-${i}`);
  convexImport('accessCredentials', ms.map((m, i) => ({ userId: m.id, membershipId: membership, status: 'active', token: tokens[i], tokenExpiresAt: exp })));
  const door = `t-stress-door-${RUN}`;
  const scan = (token, direction = 'in') => http('/api/scanner/qr', { method: 'POST', body: { token, deviceId: door, direction } });
  const okScan = (r) => r.ok && r.val.status === 200 && r.val.json?.granted === true;

  let ins = 0;
  for (const c of LEVELS) {
    await loadGuard(`scanner c=${c}`);
    const res = await burst(c, (i) => scan(tokens[i % tokens.length]));
    record('access: /api/scanner/qr valid', c, res, okScan);
    ins += res.filter(okScan).length;
  }
  const bad = await burst(25, (i) => scan(`nope-${RUN}-${i}`));
  record('access: /api/scanner/qr invalid', 25, bad, (r) => r.ok && r.val.status === 200 && r.val.json?.granted === false);

  const staff = convexFor(ctx.admin);
  let occ = await staff.query(api.queries.access.getCurrentOccupancy, { accessPointId: door });
  check(occ?.count === ins, 'occupancy equals granted entries after concurrent scans', `count=${occ?.count} granted ins=${ins}`);
  const outs = await burst(10, (i) => scan(tokens[i], 'out'));
  occ = await staff.query(api.queries.access.getCurrentOccupancy, { accessPointId: door });
  check(occ?.count === ins - outs.filter(okScan).length, 'occupancy after 10 concurrent exits', `count=${occ?.count}`);
  // One QR, 5 entries in a row (no exit): single-use / anti-passback probe.
  const before = occ.count;
  for (let k = 0; k < 5; k++) await scan(tokens[0]);
  occ = await staff.query(api.queries.access.getCurrentOccupancy, { accessPointId: door });
  check(occ.count === before, 'same QR scanned in 5x without exit does not inflate occupancy', `${before} → ${occ.count}`);
  const nokey = await http('/api/scanner/qr', { method: 'POST', body: { token: 'x', deviceId: door } });
  console.log(`  scanner without X-Scanner-Key on dev → ${nokey.status} (SCANNER_API_KEY unset = open in dev)`);
}

/* ---------------- 5. public website ---------------- */

async function web() {
  console.log('\n## web');
  const posts = await anon().query(api.queries.site.listPosts, { limit: 1 }).catch(() => []);
  const slug = posts?.[0]?.slug;
  const pages = ['/', '/schedule', '/gallery', '/blog', ...(slug ? [`/blog/${slug}`] : []), '/sitemap.xml'];
  for (const p of pages) {
    const s = performance.now();
    const r = await http(p, { timeoutMs: 180_000 }).catch((e) => ({ status: String(e) }));
    console.log(`  warm ${p} → ${r.status} in ${Math.round(performance.now() - s)}ms (${r.text?.length ?? 0} bytes)`);
  }
  for (const c of LEVELS.filter((l) => l <= 25)) {
    for (const p of pages) {
      await loadGuard(`GET ${p} c=${c}`);
      const res = await burst(c, () => http(p, { timeoutMs: 120_000 }));
      record(`web: GET ${p}`, c, res, (r) => r.ok && r.val.status === 200);
    }
  }

  // Trial form: flood of distinct phones, then duplicates, then the honeypot.
  const pub = anon();
  const base = 500000000 + Math.floor(Math.random() * 1e8);
  await loadGuard('trial flood');
  const flood = await burst(40, (i) => pub.mutation(api.mutations.publicLeads.submitTrialRequest, { name: `T Stress Lead ${RUN} ${i}`, phone: `+9715${base + i}` }));
  record('web: submitTrialRequest distinct phones', 40, flood);
  const dupPhone = `+9715${base + 999}`;
  const dup = await burst(20, (i) => pub.mutation(api.mutations.publicLeads.submitTrialRequest, { name: `T Stress Dup ${RUN} ${i}`, phone: dupPhone }));
  record('web: submitTrialRequest same phone', 20, dup);
  await pub.mutation(api.mutations.publicLeads.submitTrialRequest, { name: `T Stress Honeypot ${RUN}`, phone: `+9715${base + 998}`, website: 'http://spam' });
  await refresh([ctx.admin]);
  const board = await convexFor(ctx.admin).query(api.queries.crm.listLeadsByStage, { stage: 'new' });
  const mine = board.columns.flatMap((c) => c.leads).filter((l) => l.name.includes(RUN));
  check(mine.filter((l) => l.name.startsWith('T Stress Lead')).length === 40, 'trial flood: all 40 distinct-phone leads stored (no rate limit exists)', `${mine.filter((l) => l.name.startsWith('T Stress Lead')).length}`);
  check(mine.filter((l) => l.name.startsWith('T Stress Dup')).length === 1, 'trial duplicate suppression under 20 concurrent submits', `${mine.filter((l) => l.name.startsWith('T Stress Dup')).length} leads`);
  check(mine.filter((l) => l.name.startsWith('T Stress Honeypot')).length === 0, 'honeypot submission stored nothing');
}

/* ---------------- 6. broadcast fan-out ---------------- */

/** Verbatim copy of engagement.ts resolveAudience over an in-memory table (paging logic check). */
function resolveAudienceReplica(users, audience, offset, CAP = 500) {
  const page = users.slice(0, offset + CAP + 1);
  const inScope = audience === 'members' ? page.filter((u) => (u.roles ?? []).includes('member')) : page;
  return { recipients: inScope.slice(offset, offset + CAP), capped: inScope.length > offset + CAP };
}

async function broadcast() {
  console.log('\n## broadcast');
  // Offline replica of the offset paging with 1200 users (every 4th is staff-only).
  for (const audience of ['all', 'members']) {
    const users = Array.from({ length: 1200 }, (_, i) => ({ _id: i, roles: i % 4 === 0 ? ['coffee'] : ['member'] }));
    const got = new Map();
    for (let offset = 0, more = true; more; offset += 500) {
      const { recipients, capped } = resolveAudienceReplica(users, audience, offset);
      recipients.forEach((u) => got.set(u._id, (got.get(u._id) ?? 0) + 1));
      more = capped;
    }
    const want = users.filter((u) => audience === 'all' || u.roles.includes('member'));
    const missing = want.filter((u) => !got.has(u._id)).length;
    check(missing === 0 && [...got.values()].every((n) => n === 1), `paging replica (${audience}, 1200 users): every recipient exactly once`, `missing=${missing} of ${want.length}`);
  }

  await refresh(allUsers());
  const ms = ctx.members;
  const PER = 10; // 30 members x 10 = 300 fake tokens
  await loadGuard('register tokens');
  const reg = await burst(ms.length * PER, (k) =>
    convexFor(ms[k % ms.length]).mutation(api.mutations.push.registerPushToken, { token: `ExponentPushToken[tstress${RUN}x${k}]`, platform: 'ios' }),
  );
  record('broadcast: registerPushToken', ms.length * PER, reg);

  const admin = convexFor(ctx.admin);
  const s = performance.now();
  const res = await admin.mutation(api.mutations.engagement.sendBroadcastNotification, {
    title: `t-stress broadcast ${RUN} (ignore)`, body: 'Load test — please ignore.', audience: 'all', push: true,
  });
  console.log(`  broadcast all → sent=${res.sent} capped=${res.capped} pushQueued=${res.pushQueued} in ${Math.round(performance.now() - s)}ms`);
  const notes = await Promise.all(ms.map((m) => convexFor(m).query(api.queries.operations.getMyNotifications, {})));
  const counts = notes.map((list) => list.filter((n) => n.data?.batchId === res.batchId).length);
  check(counts.every((n) => n === 1), 'every member received exactly one notification', JSON.stringify(tally(counts.map((n) => ({ ok: n === 1, err: `got ${n}` })))));

  // Push audit row lands once the scheduled action finishes (Expo rejects fake tokens).
  let pushRow;
  for (let i = 0; i < 24 && !pushRow; i++) {
    await sleep(5000);
    pushRow = convexData('auditEvents', 3000).filter((e) => e.action === 'broadcast.push' && e.entityId === res.batchId);
    pushRow = pushRow.length ? pushRow : undefined;
  }
  check(pushRow?.length === 1, 'push send wrote exactly one audit row', pushRow ? JSON.stringify(pushRow[0].after).slice(0, 300) : 'none after 120s');
  const mineTok = convexData('devices').filter((d) => d.deviceFingerprint?.includes(`tstress${RUN}`));
  console.log(`  devices rows=${mineTok.length}, still holding pushToken=${mineTok.filter((d) => d.pushToken).length}`);
}

/* ---------------- 7. CMS ---------------- */

async function cms() {
  console.log('\n## cms');
  await refresh([ctx.admin]);
  const admin = convexFor(ctx.admin);
  const sections = await admin.query(api.queries.siteAdmin.sections, {});
  const about = sections.find((s) => s.key === 'about');
  const { mediaId: _m, ...orig } = about.data;
  const variants = Array.from({ length: 10 }, (_, i) => ({ ...orig, heading: `${orig.heading} [t-stress ${RUN} v${i}]`, body: `${'x'.repeat(1500)} v${i}` }));
  const sv = await burst(10, (i) => admin.mutation(api.mutations.site.saveSection, { key: 'about', data: variants[i] }));
  record('cms: concurrent saveSection (same key)', 10, sv);
  const after = (await admin.query(api.queries.siteAdmin.sections, {})).find((s) => s.key === 'about').data;
  const match = variants.findIndex((v) => v.heading === after.heading && v.body === after.body);
  check(match >= 0, 'section is exactly one writer’s version (no interleaving)', `winner v${match}`);
  await admin.mutation(api.mutations.site.saveSection, { key: 'about', data: orig });

  // Slug race: same slug from 10 concurrent creates.
  const slug = `t-stress-race-${RUN}`;
  const sr = await burst(10, (i) => admin.mutation(api.mutations.site.savePost, { title: `T Stress race ${i}`, slug, excerpt: '', body: 'race', tags: [] }));
  record('cms: savePost same slug', 10, sr, () => true);
  const posts = (await admin.query(api.queries.siteAdmin.listPosts, {})).filter((p) => p.slug === slug);
  check(sr.filter((r) => r.ok).length === 1 && posts.length === 1, 'slug race: exactly one post owns the slug', `${sr.filter((r) => r.ok).length} ok, ${posts.length} rows`);
  // Rename race: two existing posts renamed to one slug at once.
  const p1 = await admin.mutation(api.mutations.site.savePost, { title: 'T Stress r1', slug: `${slug}-a`, excerpt: '', body: 'a', tags: [] });
  const p2 = await admin.mutation(api.mutations.site.savePost, { title: 'T Stress r2', slug: `${slug}-b`, excerpt: '', body: 'b', tags: [] });
  const rn = await burst(2, (k) => admin.mutation(api.mutations.site.savePost, { id: k ? p2 : p1, title: `T Stress r${k}`, slug: `${slug}-c`, excerpt: '', body: 'c', tags: [] }));
  const cRows = (await admin.query(api.queries.siteAdmin.listPosts, {})).filter((p) => p.slug === `${slug}-c`);
  check(cRows.length === 1, 'rename race: never two posts with one slug', `${cRows.length} rows, ${JSON.stringify(tally(rn))}`);

  // Large post.
  const para = '## Heading\n\nLorem ipsum dolor sit amet, **consectetur** adipiscing elit, sed do eiusmod tempor. [link](https://example.com)\n\n- one\n- two\n\n';
  const big = para.repeat(Math.ceil(200_000 / para.length)).slice(0, 200_000);
  const tooBig = await burst(1, () => admin.mutation(api.mutations.site.savePost, { title: 'T Stress big', slug: `${slug}-big`, excerpt: '', body: big, tags: [], status: 'published' }));
  console.log(`  200KB post → ${tooBig[0].ok ? 'accepted' : tooBig[0].err}`);
  const okBody = big.slice(0, 99_000);
  const bigId = await admin.mutation(api.mutations.site.savePost, { title: 'T Stress big', slug: `${slug}-big`, excerpt: 'big', body: okBody, tags: [], status: 'published' });
  const s = performance.now();
  const page = await http(`/blog/${slug}-big`, { timeoutMs: 180_000 });
  check(page.status === 200 && page.text.includes('consectetur'), '99KB published post renders', `${page.status} ${page.text.length} bytes in ${Math.round(performance.now() - s)}ms`);

  // Media limits.
  const up = async (bytes, type) => {
    const url = await admin.mutation(api.mutations.site.generateUploadUrl, {});
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': type }, body: bytes });
    const { storageId } = await r.json();
    return admin.mutation(api.mutations.site.createMedia, { storageId, alt: 't-stress', album: 'general' });
  };
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
  const r9 = await up(Buffer.alloc(9 * 1024 * 1024, 1), 'image/png');
  check(r9.ok === false, 'media: 9MB image rejected', JSON.stringify(r9));
  const rTxt = await up(Buffer.from('hello'), 'text/plain');
  check(rTxt.ok === false, 'media: non-image rejected', JSON.stringify(rTxt));
  const rSvg = await up(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), 'image/svg+xml');
  console.log(`  media: SVG with <script> → ${JSON.stringify(rSvg)}`);
  const rPng = await up(png, 'image/png');
  check(rPng.ok === true, 'media: small PNG accepted');

  // Cleanup.
  for (const id of [rPng.id, rSvg.id].filter(Boolean)) await admin.mutation(api.mutations.site.deleteMedia, { id });
  for (const p of (await admin.query(api.queries.siteAdmin.listPosts, {})).filter((p) => p.slug.startsWith(slug))) {
    await admin.mutation(api.mutations.site.deletePost, { id: p._id });
  }
  void bigId;
}

/* ---------------- 8. reactive load ---------------- */

async function reactive() {
  console.log('\n## reactive');
  await refresh(allUsers());
  const ms = ctx.members;
  const C = await createClass(30, 'reactive-C');
  const SUBS = Math.min(50, Math.max(...LEVELS));
  await loadGuard('reactive');
  const subs = [];
  const errors = [];
  for (let i = 0; i < SUBS; i++) {
    const c = new ConvexClient(CONVEX, { unsavedChangesWarning: false });
    const s = { c, updates: 0, last: null, at: 0 };
    if (i % 2) {
      // Half are signed-in staff watching the coffee queue (full-table reactive scan).
      c.setAuth(async () => ctx.coffeeA.token);
      c.onUpdate(api.queries.commerce.coffeeQueue, {}, () => { s.updates++; s.at = performance.now(); }, (e) => errors.push(String(e)));
      s.kind = 'coffeeQueue';
    } else {
      c.onUpdate(api.queries.classes.getClassById, { id: C }, (v) => { s.updates++; s.last = v?.bookedCount; s.at = performance.now(); }, (e) => errors.push(String(e)));
      s.kind = 'class';
    }
    subs.push(s);
  }
  await sleep(5000);
  const t0 = performance.now();
  const item = (await convexFor(ctx.admin).query(api.queries.commerce.coffeeMenu, {}))[0]._id;
  const muts = await burst(ms.length * 2, (k) =>
    k < ms.length
      ? convexFor(ms[k]).mutation(api.mutations.bookings.bookClass, { classInstanceId: C, idempotencyKey: `s-${RUN}-C-${k}` })
      : convexFor(ms[k - ms.length]).mutation(api.mutations.commerce.orderCoffee, { items: [{ itemId: item, qty: 1 }], paymentMode: 'test' }),
  );
  record('reactive: 60 mutations under 50 subscribers', ms.length * 2, muts);
  const mutDone = performance.now();
  const final = (await anon().query(api.queries.classes.getClassById, { id: C })).bookedCount;
  let converged = false;
  for (let i = 0; i < 60 && !converged; i++) {
    converged = subs.filter((s) => s.kind === 'class').every((s) => s.last === final);
    if (!converged) await sleep(500);
  }
  const classSubs = subs.filter((s) => s.kind === 'class');
  const lag = Math.max(...classSubs.map((s) => s.at)) - mutDone;
  check(converged, `all ${classSubs.length} class subscribers converged to bookedCount=${final}`, `lag≈${Math.max(0, Math.round(lag))}ms after last mutation; updates/sub avg ${(classSubs.reduce((a, s) => a + s.updates, 0) / classSubs.length).toFixed(1)}`);
  const q = subs.filter((s) => s.kind === 'coffeeQueue');
  console.log(`  coffeeQueue subscribers: updates/sub avg ${(q.reduce((a, s) => a + s.updates, 0) / q.length).toFixed(1)}, total test wall ${Math.round(performance.now() - t0)}ms`);
  check(errors.length === 0, 'no subscription errors', errors.slice(0, 3).join(' | '));
  await Promise.all(subs.map((s) => s.c.close()));
  const orderIds = muts.slice(ms.length).filter((r) => r.ok).map((r) => r.val);
  await refresh([ctx.coffeeA]);
  await burst(orderIds.length, (i) => convexFor(ctx.coffeeA).mutation(api.mutations.commerce.updateCoffeeOrderStatus, { orderId: orderIds[i], status: 'cancelled' }));
}

/* ---------------- main ---------------- */

const SCENARIOS = { auth, booking, commerce, access, web, broadcast, cms, reactive };
const args = process.argv.slice(2);
const want = args.length ? args.filter((a) => a !== 'setup') : Object.keys(SCENARIOS);
console.log(`Queenix stress run ${RUN} → web ${BASE}, convex ${CONVEX}, levels ${LEVELS.join('/')}`);
try {
  await setup();
  for (const name of want) {
    try {
      await SCENARIOS[name]();
    } catch (e) {
      check(false, `${name} scenario crashed`, `${String(e?.stack ?? e).slice(0, 400)} cause=${String(e?.cause ?? '')}`);
    }
  }
} catch (e) {
  check(false, 'setup failed', `${String(e?.stack ?? e).slice(0, 400)} cause=${String(e?.cause ?? '')}`);
}
finish();
void FAILS;
