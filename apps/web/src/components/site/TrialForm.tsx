'use client';

import { useActionState } from 'react';
import { ArrowRight, CircleCheck, LoaderCircle } from 'lucide-react';
import { submitTrial, type TrialState } from './actions';

const TIMES = ['Early morning (6–9)', 'Late morning (9–12)', 'Afternoon (12–17)', 'Evening (17–22)'];

export function TrialForm({ plan, tone = 'light' }: { plan?: string; tone?: 'light' | 'blue' }) {
  const [state, action, pending] = useActionState<TrialState, FormData>(submitTrial, { status: 'idle' });

  if (state.status === 'ok') {
    return (
      <div className={`trial-form trial-form--${tone} trial-done`} role="status">
        <CircleCheck size={36} aria-hidden />
        <h3>Thank you{state.name ? `, ${state.name}` : ''}.</h3>
        <p>Your free trial request is in. Our team will call you to choose a day and time that suits you.</p>
      </div>
    );
  }

  return (
    <form action={action} className={`trial-form trial-form--${tone}`} aria-label="Book a free trial">
      <div className="field">
        <label htmlFor="tf-name">Full name</label>
        <input id="tf-name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
      </div>
      <div className="field">
        <label htmlFor="tf-phone">Mobile number</label>
        <input
          id="tf-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+971 50 123 4567"
          required
          maxLength={20}
        />
      </div>
      <div className="field">
        <label htmlFor="tf-email">
          Email <span className="opt">optional</span>
        </label>
        <input id="tf-email" name="email" type="email" autoComplete="email" maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="tf-time">Best time to visit</label>
        <select id="tf-time" name="preferredTime" defaultValue="">
          <option value="">Any time</option>
          {TIMES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="field field--wide">
        <label htmlFor="tf-msg">
          Anything we should know? <span className="opt">optional</span>
        </label>
        <textarea
          id="tf-msg"
          name="message"
          rows={3}
          maxLength={1000}
          defaultValue={plan ? `I’m interested in the ${plan} plan.` : undefined}
        />
      </div>
      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="tf-website">Website</label>
        <input id="tf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state.status === 'error' && (
        <p className="form-error field--wide" role="alert">
          {state.message}
        </p>
      )}
      <div className="field--wide form-foot">
        <button type="submit" className="btn btn--solid btn--lg" disabled={pending}>
          {pending ? <LoaderCircle className="spin" size={18} aria-hidden /> : null}
          {pending ? 'Sending…' : 'Book my free trial'}
          {!pending && <ArrowRight size={18} aria-hidden />}
        </button>
        <p className="fine">Women only. No payment needed — we’ll call to confirm.</p>
      </div>
    </form>
  );
}
