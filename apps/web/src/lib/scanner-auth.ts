import 'server-only';
import { safeEqual } from '@queenix/auth/env';

/**
 * Hardware scanner requests must carry SCANNER_API_KEY — as the
 * `X-Scanner-Key` header, or `?key=` for firmware that can't set headers.
 * Unset in development = open; production refuses to boot without it
 * (assertProductionEnv), so this never runs open in a real deployment.
 */
export function scannerKeyOk(req: Request): boolean {
  const expected = process.env.SCANNER_API_KEY;
  if (!expected) return process.env.NODE_ENV !== 'production';
  const got = req.headers.get('x-scanner-key') ?? new URL(req.url).searchParams.get('key') ?? '';
  return safeEqual(got, expected);
}
