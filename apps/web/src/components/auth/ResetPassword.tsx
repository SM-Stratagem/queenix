'use client';

import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '12px 14px',
  fontSize: 14,
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  color: 'var(--text)',
};
const primary: React.CSSProperties = {
  padding: '12px 14px',
  fontSize: 14,
  fontWeight: 700,
  borderRadius: 10,
  border: 'none',
  background: 'var(--brand)',
  color: 'white',
  cursor: 'pointer',
};

/** Email-code password reset: request a 6-digit code, then set a new password. */
export function ResetPassword({ initialEmail, onDone }: { initialEmail: string; onDone: (msg: string | null) => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await authClient.emailOtp.requestPasswordReset({ email: email.trim() });
    setBusy(false);
    // Same message whether or not the account exists (no account enumeration).
    if (res.error) setMsg(res.error.message ?? 'Could not send the code.');
    else setSent(true);
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setMsg('Use at least 8 characters.');
    setBusy(true);
    setMsg(null);
    const res = await authClient.emailOtp.resetPassword({ email: email.trim(), otp: otp.trim(), password });
    setBusy(false);
    if (res.error) setMsg(res.error.message ?? 'That code did not work.');
    else onDone('Password updated — sign in with your new password.');
  }

  return (
    <form onSubmit={sent ? reset : sendCode} style={{ display: 'grid', gap: 10 }} aria-label="Reset password">
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Reset your password</h2>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
        Email
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={input} disabled={sent} />
      </label>
      {sent && (
        <>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            If an account exists for {email}, a 6-digit code is on its way.
          </p>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
            Code
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} style={{ ...input, letterSpacing: 6 }} />
          </label>
          <label style={{ display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 }}>
            New password
            <input type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} style={input} />
          </label>
        </>
      )}
      {msg && (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: '#e5484d' }}>
          {msg}
        </p>
      )}
      <button type="submit" disabled={busy} style={{ ...primary, opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Please wait…' : sent ? 'Set new password' : 'Email me a code'}
      </button>
      <button type="button" onClick={() => onDone(null)} style={{ ...primary, background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
        Back to sign in
      </button>
    </form>
  );
}
