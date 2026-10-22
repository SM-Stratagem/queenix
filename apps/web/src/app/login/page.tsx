'use client';

/**
 * Web admin login. Email + password via BetterAuth; the session cookie
 * is then used by /api/convex/token to authorize live Convex queries.
 */
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { ResetPassword } from '@/components/auth/ResetPassword';
import { isPureMember, landingFor, sessionRoles } from '@/lib/access';

/**
 * Staff-only demo accounts. Members are mobile-app only and can NOT sign
 * in here — RequireAuth bounces pure-member sessions back to /login.
 * Each block one-click signs in with the shared demo password.
 */
const DEMOS = [
  { role: 'Superadmin', email: 'superadmin@queenix.test' },
  { role: 'Finance', email: 'owner@queenix.test' },
  { role: 'Operations', email: 'ops@queenix.test' },
  { role: 'Trainer', email: 'trainer@queenix.test' },
  { role: 'Salon', email: 'salon@queenix.test' },
  { role: 'Coffee', email: 'coffee@queenix.test' },
];

const PASSWORD_HINT = 'QueenixDemo123!';
// One-tap demo sign-in: dev builds only — never ship the shared password on a real login page.
const SHOW_DEMOS = process.env.NODE_ENV !== 'production';

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  fontSize: 14,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
  outline: 'none',
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';
  const blockedNote =
    params.get('error') === 'members-mobile-only'
      ? 'Member accounts work in the mobile app — sign in here with a staff demo account.'
      : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { data: session, isPending: sessionPending } = authClient.useSession();

  // Safety net for the sign-in race: if this page ever renders with an
  // active session (e.g. bounced back before the client session cache
  // updated), forward to the right home instead of idling on the form.
  // Pure members are signed straight back out — web is staff only.
  useEffect(() => {
    if (sessionPending || !session?.user) return;
    const roles = sessionRoles(session.user);
    if (isPureMember(roles)) {
      void authClient.signOut().finally(() => {
        setError('Member accounts work in the mobile app — sign in here with a staff demo account.');
      });
      return;
    }
    router.replace(landingFor(roles, next));
  }, [session, sessionPending, router, next]);

  async function doSignIn(addr: string, pw: string) {
    setError('');
    if (!addr.trim() || !pw) {
      setError('Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      const res = await authClient.signIn.email({
        email: addr.trim(),
        password: pw,
      });
      if (res.error) {
        setError(res.error.message || 'Sign in failed.');
        return;
      }
      const roles = sessionRoles((res.data as { user?: unknown } | undefined)?.user);
      if (isPureMember(roles)) {
        await authClient.signOut();
        setError('Member accounts work in the mobile app — sign in here with a staff demo account.');
        return;
      }
      router.replace(landingFor(roles, next));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void doSignIn(email, password);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        background: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      {/* Brand panel */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0081cc 0%, #09090b 130%)',
          color: 'white',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 32,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0081cc',
              fontWeight: 800,
              fontSize: 22,
            }}
          >
            Q
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Queenix</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>Gym Admin</div>
          </div>
        </div>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 12px', lineHeight: 1.15 }}>
            Run the whole gym from one place.
          </h1>
          <p style={{ fontSize: 15, opacity: 0.8, margin: 0, maxWidth: 380 }}>
            Members, trainers, finance, classes, coffee, salon and live floor
            status — signed in with your staff account.
          </p>
        </div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>Queenix Gym · staff access only</div>
      </section>

      {/* Form panel */}
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <div style={{ width: '100%', maxWidth: 380, display: 'grid', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>Welcome back</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Sign in to the admin panel.
            </p>
          </div>
          {resetting ? (
            <ResetPassword
              initialEmail={email}
              onDone={(msg) => {
                setResetting(false);
                setNotice(msg);
              }}
            />
          ) : (
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Email
              <input
                placeholder="you@queenixgym.com"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
              Password
              <input
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </label>
            {blockedNote ? (
              <p
                role="note"
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#f59e0b',
                  background: 'color-mix(in srgb, #f59e0b 10%, transparent)',
                  border: '1px solid color-mix(in srgb, #f59e0b 35%, transparent)',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                {blockedNote}
              </p>
            ) : null}
            {error ? (
              <p
                role="alert"
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#e5484d',
                  background: 'color-mix(in srgb, #e5484d 10%, transparent)',
                  border: '1px solid color-mix(in srgb, #e5484d 35%, transparent)',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              style={{
                padding: '12px 14px',
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 10,
                border: 'none',
                background: busy ? 'var(--border)' : 'var(--brand)',
                color: 'white',
                cursor: busy ? 'default' : 'pointer',
              }}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setResetting(true)}
              style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 13, fontWeight: 600, cursor: 'pointer', justifySelf: 'end', padding: 0 }}
            >
              Forgot password?
            </button>
          </form>
          )}
          {notice && !resetting ? (
            <p role="status" style={{ margin: 0, fontSize: 13, color: 'var(--success, #30a46c)' }}>
              {notice}
            </p>
          ) : null}
          {SHOW_DEMOS && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
              DEMO ACCOUNTS · TAP TO SIGN IN · PASSWORD {PASSWORD_HINT}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              Staff only — member accounts work in the mobile app, not here.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {DEMOS.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(PASSWORD_HINT);
                    void doSignIn(d.email, PASSWORD_HINT);
                  }}
                  style={{
                    padding: '10px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text)',
                    cursor: busy ? 'default' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {d.role}
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>
                    {d.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main style={{ padding: 24 }}>Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
