'use server';

import { api } from '@queenix/convex';
import { m } from './data';

export type TrialState = { status: 'idle' | 'ok' | 'error'; message?: string; name?: string };

const field = (f: FormData, k: string, max: number) => String(f.get(k) ?? '').slice(0, max);

/** Trial form → public Convex mutation (validation + honeypot live there). */
export async function submitTrial(_prev: TrialState, form: FormData): Promise<TrialState> {
  const name = field(form, 'name', 200);
  try {
    await m(api.mutations.publicLeads.submitTrialRequest, {
      name,
      phone: field(form, 'phone', 60),
      email: field(form, 'email', 200) || undefined,
      preferredTime: field(form, 'preferredTime', 60) || undefined,
      message: field(form, 'message', 2000) || undefined,
      website: field(form, 'website', 200) || undefined,
    });
    return { status: 'ok', name: name.trim().split(' ')[0] };
  } catch (e) {
    // Convex surfaces validation errors as "...Uncaught Error: <message>" — show only our message.
    const raw = e instanceof Error ? e.message : '';
    const msg = raw.match(/Uncaught Error: ([^\n]+)/)?.[1]?.trim();
    return {
      status: 'error',
      message: msg ?? 'We couldn’t send that just now. Please try again, or message us on WhatsApp.',
    };
  }
}
