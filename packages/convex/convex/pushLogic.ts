/**
 * Queenix Gym — pure Expo Push helpers (no Convex ctx), shared by the
 * `push.sendToUsers` internal action and its vitest (tests/e2e/push.test.ts).
 */

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
/** Expo accepts at most 100 messages per request. */
export const EXPO_BATCH = 100;

export type PushTarget = { userId: string; token: string };
export type ConsentRow = { userId: string; type: string; granted: boolean; grantedAt: number };
export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: { type: string; batchId: string };
  sound: 'default';
};
type Ticket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

export function chunk<T>(items: T[], size = EXPO_BATCH): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Latest marketing_push consent per user decides (rows are an append-only history). */
export function hasMarketingPushConsent(rows: ConsentRow[]): boolean {
  const latest = rows
    .filter((r) => r.type === 'marketing_push')
    .sort((a, b) => b.grantedAt - a.grantedAt)[0];
  return latest?.granted === true;
}

/** Promotions only reach users with a granted marketing_push consent. */
export function filterByConsent<T extends string>(
  type: string,
  userIds: T[],
  consentsByUser: Record<string, ConsentRow[]>,
): { allowed: T[]; skippedNoConsent: number } {
  if (type !== 'promotion') return { allowed: userIds, skippedNoConsent: 0 };
  const allowed = userIds.filter((id) => hasMarketingPushConsent(consentsByUser[id] ?? []));
  return { allowed, skippedNoConsent: userIds.length - allowed.length };
}

export function buildMessages(
  targets: PushTarget[],
  msg: { title: string; body: string; type: string; batchId: string },
): PushMessage[] {
  return targets.map((t) => ({
    to: t.token,
    title: msg.title,
    body: msg.body,
    data: { type: msg.type, batchId: msg.batchId },
    sound: 'default',
  }));
}

/**
 * POST messages to Expo in batches of 100. A whole-batch HTTP/network
 * failure counts every message in it as failed. Tokens whose ticket says
 * DeviceNotRegistered are returned so the caller can clear them.
 */
export async function sendBatches(
  messages: PushMessage[],
  fetchFn: typeof fetch,
  url = EXPO_PUSH_URL,
): Promise<{ sent: number; failed: number; deadTokens: string[]; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const deadTokens: string[] = [];
  const errors: string[] = [];
  for (const batch of chunk(messages)) {
    let tickets: Ticket[] = [];
    try {
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      const json = (await res.json().catch(() => null)) as { data?: Ticket[]; errors?: unknown } | null;
      if (!res.ok || !Array.isArray(json?.data)) {
        failed += batch.length;
        errors.push(`HTTP ${res.status}: ${JSON.stringify(json?.errors ?? json).slice(0, 200)}`);
        continue;
      }
      tickets = json.data;
    } catch (e) {
      failed += batch.length;
      errors.push(String(e).slice(0, 200));
      continue;
    }
    batch.forEach((m, i) => {
      const t = tickets[i];
      if (t?.status === 'ok') {
        sent++;
        return;
      }
      failed++;
      if (t?.details?.error === 'DeviceNotRegistered') deadTokens.push(m.to);
      if (t?.message && errors.length < 10) errors.push(t.message.slice(0, 200));
    });
  }
  return { sent, failed, deadTokens, errors };
}
