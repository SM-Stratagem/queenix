import { Linking } from 'react-native';
import { authClient, AUTH_BASE_URL } from '@queenix/auth';

/**
 * Open a payment receipt in the system browser. The browser has no session
 * cookie, so we first mint a 5-minute signed link with our session
 * (authClient.$fetch attaches it; the URL must be absolute or better-auth
 * prefixes it with /api/auth).
 */
export async function openReceipt(paymentId: string): Promise<void> {
  const url = `${AUTH_BASE_URL}/api/payments/${paymentId}/receipt`;
  const { data, error } = await authClient.$fetch<{ token: string }>(url, { method: 'POST' });
  if (error || !data?.token) throw new Error((error as { error?: string })?.error ?? 'Could not open receipt');
  await Linking.openURL(`${url}?t=${encodeURIComponent(data.token)}`);
}
