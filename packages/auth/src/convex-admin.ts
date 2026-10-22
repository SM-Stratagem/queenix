/**
 * Server-to-Convex calls with the admin (deploy) key — the only way our
 * server routes reach Convex's internal functions (payment webhooks,
 * scanner bridges, auth user sync, seeding). Internal functions are
 * unreachable from browsers/phones; the admin key never leaves the server.
 *
 * Uses the Convex *API* URL (CONVEX_SELF_HOSTED_URL, e.g.
 * http://convex-backend:3210) — not the site/HTTP-actions URL.
 */
import { secret, setting } from './env';

export class ConvexCallError extends Error {}

export async function convexAdmin<T = unknown>(
  kind: 'query' | 'mutation' | 'action',
  path: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  const url = setting('CONVEX_SELF_HOSTED_URL', 'http://127.0.0.1:3210').replace(/\/+$/, '');
  const key = secret('CONVEX_DEPLOY_KEY', '', 16);
  if (!key) throw new ConvexCallError('CONVEX_DEPLOY_KEY is not set');
  const res = await fetch(`${url}/api/${kind}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Convex ${key}` },
    body: JSON.stringify({ path, args, format: 'json' }),
  });
  const body = (await res.json().catch(() => null)) as
    | { status: 'success'; value: T }
    | { status: 'error'; errorMessage: string; errorData?: unknown }
    | null;
  if (!res.ok || !body || body.status !== 'success') {
    const msg = body && body.status === 'error' ? body.errorMessage : `HTTP ${res.status}`;
    throw new ConvexCallError(`Convex ${kind} ${path} failed: ${msg}`);
  }
  return body.value;
}
