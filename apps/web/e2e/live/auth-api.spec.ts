/**
 * Live auth API: sign-up + email verification, password sign-in, cookies,
 * sign-out, SMS codes, password reset, Origin/CSRF, Convex JWT bridge and
 * the admin role API. Every test creates its own accounts.
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { createLocalJWKSet, decodeJwt, decodeProtectedHeader, jwtVerify, SignJWT, generateKeyPair, importPKCS8 } from 'jose';
import { ConvexHttpClient } from 'convex/browser';
import {
  ADMIN_TOKEN, BASE, CONVEX, DEMO, DEMO_PASSWORD, authApi, codeFor, convexAs, convexToken, countMessages, dropCookieCache,
  freshUser, outcome, postRetry, setRoles, signedIn, sleep, stamp,
} from './auth-helpers';

test.describe.configure({ mode: 'default' });
test.setTimeout(180_000);

test('sign-up sends an email code; wrong and reused codes fail; the right one verifies', async () => {
  const api = await authApi();
  const email = `t-auth-verify-${stamp()}@queenix.test`;
  const since = Date.now();
  const res = await postRetry(api, '/api/auth/sign-up/email', {
    email, password: 'VerifyMe123!', name: 'Verify Me', fullName: 'Verify Me',
    // Mass assignment: role fields are input:false and must be ignored.
    roles: ['superadmin'], activeRole: 'superadmin',
  });
  expect(res.status(), await res.text()).toBe(200);
  const user = (await res.json()).user;
  expect(user.emailVerified).toBe(false);
  expect(user.roles).toEqual(['member']);
  expect(user.activeRole).toBe('member');

  const code = await codeFor(email, since);
  const wrong = await postRetry(api, '/api/auth/email-otp/verify-email', { email, otp: code === '000000' ? '111111' : '000000' });
  expect(wrong.status()).toBe(400);
  const ok = await postRetry(api, '/api/auth/email-otp/verify-email', { email, otp: code });
  expect(ok.status(), await ok.text()).toBe(200);
  const reused = await postRetry(api, '/api/auth/email-otp/verify-email', { email, otp: code });
  expect(reused.status()).toBeGreaterThanOrEqual(400);

  const session = await (await api.get('/api/auth/get-session?disableCookieCache=true')).json();
  expect(session.user.email).toBe(email);
  expect(session.user.emailVerified).toBe(true);
  expect(session.user.roles).toEqual(['member']);
  await api.dispose();
});

test('sign-up rejects an existing email, a weak password and a malformed email', async () => {
  const api = await authApi();
  const dupe = await postRetry(api, '/api/auth/sign-up/email', { email: DEMO.member, password: 'Whatever123!', name: 'X', fullName: 'X' });
  expect(dupe.status(), await dupe.text()).toBeGreaterThanOrEqual(400);
  // The existing account was not touched: its password still works (checked via the demo session cache below).
  const weak = await postRetry(api, '/api/auth/sign-up/email', { email: `t-auth-weak-${stamp()}@queenix.test`, password: 'short', name: 'X', fullName: 'X' });
  expect(weak.status()).toBe(400);
  expect((await weak.json()).code).toBe('PASSWORD_TOO_SHORT');
  for (const bad of ['not-an-email', 'a@', '@queenix.test', 'a b@queenix.test']) {
    const r = await postRetry(api, '/api/auth/sign-up/email', { email: bad, password: 'GoodPass123!', name: 'X', fullName: 'X' });
    expect(r.status(), `email "${bad}"`).toBe(400);
  }
  const noName = await postRetry(api, '/api/auth/sign-up/email', { email: `t-auth-noname-${stamp()}@queenix.test`, password: 'GoodPass123!', name: 'X' });
  expect(noName.status(), 'fullName is required').toBe(400);
  await api.dispose();
});

test('a user cannot raise their own role through update-user', async () => {
  const u = await freshUser('selfpromote');
  const res = await u.api.post('/api/auth/update-user', { data: { roles: ['superadmin'], activeRole: 'superadmin', name: 'Still Member' } });
  test.info().annotations.push({ type: 'update-user', description: `${res.status()} ${(await res.text()).slice(0, 120)}` });
  const s = await (await u.api.get('/api/auth/get-session?disableCookieCache=true')).json();
  expect(s.user.roles).toEqual(['member']);
  expect(s.user.activeRole).toBe('member');
  const me = (await (await convexAs(u.api)).query('queries/users:getCurrentUser' as any, {})) as any;
  expect(me.roles).toEqual(['member']);
  await u.api.dispose();
});

test('every demo role signs in with email + password and gets its roles', async () => {
  const expected: Record<string, string> = {
    [DEMO.superadmin]: 'superadmin', [DEMO.finance]: 'finance', [DEMO.operations]: 'operations',
    [DEMO.trainer]: 'trainer', [DEMO.salon]: 'salon', [DEMO.coffee]: 'coffee', [DEMO.member]: 'member',
  };
  for (const [email, role] of Object.entries(expected)) {
    const api = await signedIn(email);
    const s = await (await api.get('/api/auth/get-session?disableCookieCache=true')).json();
    expect(s.user.email).toBe(email);
    expect(s.user.roles, email).toContain(role);
    expect(s.user.activeRole, email).toBe(role);
    await api.dispose();
  }
});

test('fresh password sign-in sets HttpOnly SameSite=Lax cookies; wrong password and unknown email look identical', async () => {
  const u = await freshUser('signin');
  const api = await authApi();
  const res = await postRetry(api, '/api/auth/sign-in/email', { email: u.email, password: u.password });
  expect(res.status()).toBe(200);
  const cookies = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie').map((h) => h.value);
  const token = cookies.find((c) => c.startsWith('queenix.session_token='));
  expect(token).toBeTruthy();
  expect(token).toMatch(/HttpOnly/i);
  expect(token).toMatch(/SameSite=Lax/i);
  // http deployment: no Secure flag (useSecureCookies only when AUTH_BASE_URL is https).
  if (BASE.startsWith('https://')) expect(token).toMatch(/;\s*Secure/i);
  else expect(token).not.toMatch(/;\s*Secure/i);

  const wrong = await postRetry(api, '/api/auth/sign-in/email', { email: u.email, password: 'Wrong-password-1' });
  const unknown = await postRetry(api, '/api/auth/sign-in/email', { email: `nobody-${stamp()}@queenix.test`, password: 'Wrong-password-1' });
  expect(wrong.status()).toBe(401);
  expect(unknown.status()).toBe(401);
  expect((await wrong.json()).message).toBe((await unknown.json()).message);
  await api.dispose();
  await u.api.dispose();
});

test('sign-out kills the session: the old session token is rejected everywhere', async () => {
  const u = await freshUser('signout');
  const before = await u.api.storageState();
  expect((await (await u.api.get('/api/auth/get-session')).json()).user.email).toBe(u.email);
  const out = await u.api.post('/api/auth/sign-out', { data: {} });
  expect(out.status()).toBe(200);

  // Replay the pre-sign-out session token (an attacker who copied it).
  const replay = await authApi(before);
  expect(await (await replay.get('/api/auth/get-session')).json()).toBeNull();
  expect((await replay.get('/api/convex/token')).status()).toBe(401);
  await replay.dispose();
  await u.api.dispose();
});

test('sign-out: a replayed session_data cache cookie no longer works', async () => {
  // BetterAuth's cookieCache (5 min) is a signed copy of the session. If it is
  // replayed after sign-out it must not resurrect the session.
  const u = await freshUser('signout-cache');
  const api = await authApi();
  const res = await postRetry(api, '/api/auth/sign-in/email', { email: u.email, password: u.password });
  expect(res.status()).toBe(200);
  const before = await api.storageState();
  expect(before.cookies.some((c) => c.name === 'queenix.session_data')).toBe(true);
  await api.post('/api/auth/sign-out', { data: {} });

  const replay = await authApi(before);
  const session = await (await replay.get('/api/auth/get-session')).json();
  const token = await replay.get('/api/convex/token');
  test.info().annotations.push({ type: 'replay', description: `get-session=${session ? 'SESSION' : 'null'} token=${token.status()}` });
  expect.soft(session, 'replayed session_data cookie still yields a session after sign-out').toBeNull();
  expect.soft(token.status(), 'replayed session_data cookie still mints a Convex JWT after sign-out').toBe(401);
  await replay.dispose();
  await api.dispose();
  await u.api.dispose();
});

test('SMS sign-in: wrong, superseded, reused and brute-forced codes fail; the right code signs in', async () => {
  const u = await freshUser('sms');
  const phone = `+9715${String(Date.now()).slice(-8)}`;
  await setRoles(u.id, ['member'], 'member', { phoneNumber: phone });
  const inbox = `sms+${phone.replace(/\D/g, '')}@sms.queenix.local`;
  const api = await authApi();

  // Superseded code: request A, then B — A must stop working.
  let since = Date.now();
  expect((await postRetry(api, '/api/auth/phone-number/send-otp', { phoneNumber: phone })).status()).toBe(200);
  const codeA = await codeFor(inbox, since);
  await sleep(1500);
  since = Date.now();
  expect((await postRetry(api, '/api/auth/phone-number/send-otp', { phoneNumber: phone })).status()).toBe(200);
  const codeB = await codeFor(inbox, since);
  if (codeA !== codeB) {
    const old = await postRetry(api, '/api/auth/phone-number/verify', { phoneNumber: phone, code: codeA });
    expect(old.status(), 'superseded SMS code').toBeGreaterThanOrEqual(400);
  }
  const wrong = await postRetry(api, '/api/auth/phone-number/verify', { phoneNumber: phone, code: codeB === '000000' ? '111111' : '000000' });
  expect(wrong.status()).toBeGreaterThanOrEqual(400);

  const ok = await postRetry(api, '/api/auth/phone-number/verify', { phoneNumber: phone, code: codeB });
  expect(ok.status(), await ok.text()).toBe(200);
  const s = await (await api.get('/api/auth/get-session')).json();
  expect(s.user.email).toBe(u.email);

  const anon = await authApi();
  const reused = await postRetry(anon, '/api/auth/phone-number/verify', { phoneNumber: phone, code: codeB });
  expect(reused.status(), 'reused SMS code').toBeGreaterThanOrEqual(400);

  // Brute force: after 5 wrong tries even the right code is refused.
  since = Date.now();
  await postRetry(anon, '/api/auth/phone-number/send-otp', { phoneNumber: phone });
  const codeC = await codeFor(inbox, since);
  const statuses: number[] = [];
  for (let i = 0; i < 5; i++) {
    const guess = String((Number(codeC) + 1 + i) % 1_000_000).padStart(6, '0');
    statuses.push((await postRetry(anon, '/api/auth/phone-number/verify', { phoneNumber: phone, code: guess })).status());
  }
  const after = await postRetry(anon, '/api/auth/phone-number/verify', { phoneNumber: phone, code: codeC });
  test.info().annotations.push({ type: 'bruteforce', description: `wrong=${statuses.join(',')} right-after=${after.status()}` });
  expect(after.status(), 'correct code accepted after 5 wrong attempts').toBeGreaterThanOrEqual(400);

  // Unknown number: no account → no session.
  const ghost = `+9715${String(Date.now() + 7).slice(-8)}`;
  since = Date.now();
  await postRetry(anon, '/api/auth/phone-number/send-otp', { phoneNumber: ghost });
  const ghostCode = await codeFor(`sms+${ghost.replace(/\D/g, '')}@sms.queenix.local`, since).catch(() => null);
  if (ghostCode) {
    const g = await postRetry(anon, '/api/auth/phone-number/verify', { phoneNumber: ghost, code: ghostCode });
    expect(g.status(), 'phone verify for an unknown number must not create a session').toBeGreaterThanOrEqual(400);
  }
  expect(await (await anon.get('/api/auth/get-session')).json()).toBeNull();
  await Promise.all([api.dispose(), anon.dispose(), u.api.dispose()]);
});

test('SMS code requests are throttled per client IP', async () => {
  // Own spoofed client IP so this does not exhaust the shared bucket of other testers
  // (works because x-forwarded-for is trusted from the client — see report).
  const api = await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE, 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 200) + 20}` } });
  const phone = `+9715${String(Date.now()).slice(-8)}`;
  const statuses: number[] = [];
  for (let i = 0; i < 12; i++) statuses.push((await api.post('/api/auth/phone-number/send-otp', { data: { phoneNumber: phone } })).status());
  test.info().annotations.push({ type: 'sms-throttle', description: statuses.join(',') });
  expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
  expect(statuses.slice(10)).toContain(429);
  await api.dispose();
});

test('password reset by email code (API): old password stops working, new one works; unknown email is not revealed', async () => {
  const u = await freshUser('reset');
  const api = await authApi();
  const since = Date.now();
  const req = await postRetry(api, '/api/auth/email-otp/request-password-reset', { email: u.email });
  expect(req.status()).toBe(200);
  const code = await codeFor(u.email, since);
  const bad = await postRetry(api, '/api/auth/email-otp/reset-password', { email: u.email, otp: code === '000000' ? '111111' : '000000', password: 'NewPassword123!' });
  expect(bad.status()).toBeGreaterThanOrEqual(400);
  const weak = await postRetry(api, '/api/auth/email-otp/reset-password', { email: u.email, otp: code, password: 'short' });
  expect(weak.status()).toBe(400);
  const newPassword = `New-${stamp()}!`;
  const reset = await postRetry(api, '/api/auth/email-otp/reset-password', { email: u.email, otp: code, password: newPassword });
  expect(reset.status(), await reset.text()).toBe(200);

  const oldPw = await postRetry(api, '/api/auth/sign-in/email', { email: u.email, password: u.password });
  expect(oldPw.status()).toBe(401);
  const newPw = await postRetry(api, '/api/auth/sign-in/email', { email: u.email, password: newPassword });
  expect(newPw.status()).toBe(200);
  const reuse = await postRetry(api, '/api/auth/email-otp/reset-password', { email: u.email, otp: code, password: 'Another123!x' });
  expect(reuse.status(), 'reset code reusable').toBeGreaterThanOrEqual(400);

  const ghost = `t-auth-ghost-${stamp()}@queenix.test`;
  const ghostSince = Date.now();
  const g = await postRetry(api, '/api/auth/email-otp/request-password-reset', { email: ghost });
  expect(g.status(), 'unknown email gets the same answer').toBe(200);
  await sleep(1500);
  expect(await countMessages(ghost, ghostSince)).toBe(0);

  // Sessions opened before the reset (e.g. an attacker's) should be revoked.
  const preReset = await (await u.api.get('/api/auth/get-session?disableCookieCache=true')).json();
  test.info().annotations.push({ type: 'pre-reset-session', description: preReset ? 'still valid after reset' : 'revoked' });
  expect(preReset, 'session created before the password reset survives the reset').toBeNull();
  await Promise.all([api.dispose(), u.api.dispose()]);
});

test('Origin/CSRF: state-changing auth calls from a foreign origin are refused', async () => {
  const evil = await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: 'https://evil.example' } });
  const signin = await evil.post('/api/auth/sign-in/email', { data: { email: DEMO.member, password: DEMO_PASSWORD } });
  expect(signin.status()).toBe(403);
  const signup = await evil.post('/api/auth/sign-up/email', { data: { email: `t-auth-evil-${stamp()}@queenix.test`, password: 'GoodPass123!', name: 'x', fullName: 'x' } });
  expect(signup.status()).toBe(403);
  const localhost = await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: 'http://localhost:3000' } });
  expect((await localhost.post('/api/auth/sign-in/email', { data: { email: DEMO.member, password: 'x' } })).status(), 'dev origins are not trusted in prod').toBe(403);

  // Cross-site sign-out with the victim's cookie must not kill the session.
  const u = await freshUser('csrf');
  const state = await u.api.storageState();
  const attacker = await pwRequest.newContext({ baseURL: BASE, storageState: state, extraHTTPHeaders: { origin: 'https://evil.example' } });
  expect((await attacker.post('/api/auth/sign-out', { data: {} })).status()).toBe(403);
  const refererOnly = await pwRequest.newContext({ baseURL: BASE, storageState: state, extraHTTPHeaders: { referer: 'https://evil.example/page' } });
  expect((await refererOnly.post('/api/auth/sign-out', { data: {} })).status()).toBe(403);
  expect((await (await u.api.get('/api/auth/get-session?disableCookieCache=true')).json()).user.email).toBe(u.email);

  // Open redirect via callbackURL on the auth API.
  const cb = await postRetry(u.api, '/api/auth/sign-in/email', { email: u.email, password: u.password, callbackURL: 'https://evil.example/x' });
  expect(cb.status()).toBe(403);
  await Promise.all([evil.dispose(), localhost.dispose(), attacker.dispose(), refererOnly.dispose(), u.api.dispose()]);
});

test('Convex JWT bridge: token only when signed in; JWKS + discovery valid; Convex accepts real and rejects forged tokens', async () => {
  const anon = await authApi();
  expect((await anon.get('/api/convex/token')).status()).toBe(401);

  const disco = await (await anon.get('/.well-known/openid-configuration')).json();
  expect(disco.issuer).toBe(BASE);
  expect(disco.jwks_uri).toBe(`${BASE}/api/jwks`);
  const jwks = await (await anon.get('/api/jwks')).json();
  expect(jwks.keys).toHaveLength(1);
  const key = jwks.keys[0];
  expect(key).toMatchObject({ kty: 'RSA', alg: 'RS256', use: 'sig' });
  expect(key.d, 'private exponent must never be published').toBeUndefined();
  expect(key.p).toBeUndefined();

  const u = await freshUser('jwt');
  const token = await convexToken(u.api);
  const header = decodeProtectedHeader(token);
  expect(header).toMatchObject({ alg: 'RS256', kid: key.kid });
  const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), { issuer: BASE, audience: 'queenix-gym' });
  expect(payload.sub).toBe(u.id);
  expect(payload.exp! - payload.iat!).toBe(300);

  const ok = new ConvexHttpClient(CONVEX);
  ok.setAuth(token);
  const me = (await ok.query('queries/users:getCurrentUser' as any, {})) as any;
  expect(me.email).toBe(u.email);

  // Tampered payload (sub swapped to another user), original signature kept.
  const [h, , sig] = token.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ ...decodeJwt(token), sub: 'someone-else' })).toString('base64url');
  const tampered = new ConvexHttpClient(CONVEX);
  tampered.setAuth(`${h}.${forgedPayload}.${sig}`);
  expect(await outcome(() => tampered.query('queries/users:getCurrentUser' as any, {}))).not.toBe('ok');

  // alg=none
  const none = new ConvexHttpClient(CONVEX);
  none.setAuth(`${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${forgedPayload}.`);
  expect(await outcome(() => none.query('queries/users:getCurrentUser' as any, {}))).not.toBe('ok');

  // Attacker's own RSA key with our kid/issuer/audience.
  const { privateKey } = await generateKeyPair('RS256');
  const now = Math.floor(Date.now() / 1000);
  const selfSigned = await new SignJWT({ sid: 'x' }).setProtectedHeader({ alg: 'RS256', kid: key.kid, typ: 'JWT' })
    .setIssuer(BASE).setAudience('queenix-gym').setSubject(u.id).setIssuedAt(now).setExpirationTime(now + 300).sign(privateKey);
  const forged = new ConvexHttpClient(CONVEX);
  forged.setAuth(selfSigned);
  expect(await outcome(() => forged.query('queries/users:getCurrentUser' as any, {}))).not.toBe('ok');

  // Expired / wrong-audience / wrong-issuer tokens signed with the REAL key (only when AUTH_JWKS is provided).
  const realKey = process.env.AUTH_JWKS ? JSON.parse(process.env.AUTH_JWKS).privateKeyPkcs8 : null;
  test.info().annotations.push({ type: 'real-key-checks', description: realKey ? 'ran' : 'skipped (AUTH_JWKS not set)' });
  if (realKey) {
    const k = await importPKCS8(realKey, 'RS256');
    const mk = (o: { iss?: string; aud?: string; iat?: number; exp?: number }) =>
      new SignJWT({ sid: 'x' }).setProtectedHeader({ alg: 'RS256', kid: key.kid, typ: 'JWT' })
        .setIssuer(o.iss ?? BASE).setAudience(o.aud ?? 'queenix-gym').setSubject(u.id)
        .setIssuedAt(o.iat ?? now).setExpirationTime(o.exp ?? now + 300).sign(k);
    const control = new ConvexHttpClient(CONVEX);
    control.setAuth(await mk({}));
    expect(await outcome(() => control.query('queries/users:getCurrentUser' as any, {})), 'control token signed with real key').toBe('ok');
    for (const [label, t] of [
      ['expired', await mk({ iat: now - 3600, exp: now - 1800 })],
      ['wrong audience', await mk({ aud: 'other-app' })],
      ['wrong issuer', await mk({ iss: 'https://evil.example' })],
    ] as const) {
      const c = new ConvexHttpClient(CONVEX);
      c.setAuth(t);
      expect(await outcome(() => c.query('queries/users:getCurrentUser' as any, {})), label).not.toBe('ok');
    }
  }
  await Promise.all([anon.dispose(), u.api.dispose()]);
});

test('Convex JWT outlives sign-out for at most its 5-minute TTL (documented behavior)', async () => {
  const u = await freshUser('jwt-signout');
  const token = await convexToken(u.api);
  await u.api.post('/api/auth/sign-out', { data: {} });
  const c = new ConvexHttpClient(CONVEX);
  c.setAuth(token);
  const after = await outcome(() => c.query('queries/users:getCurrentUser' as any, {}));
  test.info().annotations.push({ type: 'jwt-after-signout', description: after === 'ok' ? 'still accepted (until exp)' : after });
  // Convex has no revocation hook; the 5-minute exp is the bound. Assert the bound, not revocation.
  expect(decodeJwt(token).exp! - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(300);
  await u.api.dispose();
});

test('role API: token required, roles validated, owner → finance, applies to Convex now and to the session on refresh', async () => {
  const u = await freshUser('roleapi');
  const raw = await pwRequest.newContext({ baseURL: BASE });
  const url = `/api/admin/users/${u.id}/role`;
  const body = { activeRole: 'superadmin', roles: ['superadmin'] };
  expect((await raw.post(url, { data: body })).status(), 'missing token').toBe(401);
  expect((await raw.post(url, { data: body, headers: { 'x-queenix-admin-token': 'wrong' } })).status(), 'wrong token').toBe(401);
  expect((await raw.post(url, { data: body, headers: { 'x-queenix-admin-token': `${ADMIN_TOKEN}x` } })).status(), 'token + suffix').toBe(401);
  expect((await raw.post(url, { data: body, headers: { 'x-queenix-admin-token': ADMIN_TOKEN.slice(0, -1) } })).status(), 'token prefix').toBe(401);
  const hdr = { 'x-queenix-admin-token': ADMIN_TOKEN };
  expect((await raw.post(url, { data: { activeRole: 'god', roles: ['god'] }, headers: hdr })).status()).toBe(400);
  expect((await raw.post(url, { data: { activeRole: 'member', roles: ['member'], phoneNumber: '0501234567' }, headers: hdr })).status()).toBe(400);
  expect((await raw.post(`/api/admin/users/does-not-exist-${stamp()}/role`, { data: { activeRole: 'member', roles: ['member'] }, headers: hdr })).status()).toBe(404);
  expect((await raw.post(url, { data: 'not json', headers: { ...hdr, 'content-type': 'application/json' } })).status()).toBe(400);
  // Cross-origin browser call: the token is the only guard, so a missing token must still be 401.
  expect((await raw.post(url, { data: body, headers: { origin: 'https://evil.example' } })).status()).toBe(401);

  // Session sees the old role until the 5-min cookie cache refreshes (or a new sign-in).
  const signedInBefore = await authApi();
  expect((await postRetry(signedInBefore, '/api/auth/sign-in/email', { email: u.email, password: u.password })).status()).toBe(200);
  const res = await raw.post(url, { data: { activeRole: 'owner', roles: ['owner', 'member'] }, headers: hdr });
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, activeRole: 'finance', roles: ['finance', 'member'] });

  const cached = await (await signedInBefore.get('/api/auth/get-session')).json();
  const fresh = await (await signedInBefore.get('/api/auth/get-session?disableCookieCache=true')).json();
  test.info().annotations.push({ type: 'cookie-cache', description: `cached roles=${cached.user.roles} db roles=${fresh.user.roles}` });
  expect(fresh.user.roles).toEqual(['finance', 'member']);
  expect(fresh.user.activeRole).toBe('finance');

  // Convex enforces the new role immediately (role API pushes it).
  const c = new ConvexHttpClient(CONVEX);
  c.setAuth(await convexToken(signedInBefore));
  const me = (await c.query('queries/users:getCurrentUser' as any, {})) as any;
  expect(me.roles).toEqual(['finance', 'member']);
  expect(await outcome(() => c.query('queries/finance:getLedger' as any, {}))).toBe('ok');

  // A brand-new session gets the new roles.
  const next = await authApi();
  const s = await postRetry(next, '/api/auth/sign-in/email', { email: u.email, password: u.password });
  expect((await s.json()).user.roles).toEqual(['finance', 'member']);
  await Promise.all([raw.dispose(), signedInBefore.dispose(), next.dispose(), u.api.dispose()]);
});
