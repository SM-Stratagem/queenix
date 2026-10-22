/**
 * POST /api/ocr — multipart { kind, file } → services/ocr /v1/scan.
 *
 * BetterAuth session required (web cookie, or the Expo client via
 * authClient.$fetch). Role per kind: lib/access.ts canOcr. The OCR key never
 * leaves the server. Result is only a suggestion: every client shows the
 * fields in a review form a human confirms before anything is saved.
 *
 *   200 { kind, fields, lines, confidence, warnings }
 *   400 bad kind/file · 401 signed out · 403 role · 413 > 10 MB · 415 not an image
 *   502/503/504 OCR service error / unreachable / timeout
 */
import { NextResponse } from 'next/server';
import { auth } from '@queenix/auth/server';
import { secret, setting } from '@queenix/auth/env';
import { canOcr, sessionRoles } from '@/lib/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS = ['emirates_id', 'passport', 'plate', 'receipt', 'document'];
const MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return fail(401, 'Sign in to scan documents');

  // Cheap early reject before buffering the body (chunked uploads are re-checked below).
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES + 64 * 1024) {
    return fail(413, 'Image is larger than 10 MB');
  }
  // Cast: react-native's global FormData typing (monorepo) shadows the DOM one.
  const form = (await req.formData().catch(() => null)) as unknown as { get(name: string): unknown } | null;
  if (!form) return fail(400, 'Send multipart/form-data with kind and file');
  const kind = String(form.get('kind') ?? '');
  const file = form.get('file');
  if (!KINDS.includes(kind)) return fail(400, `kind must be one of: ${KINDS.join(', ')}`);
  if (!canOcr(sessionRoles(session.user), kind)) return fail(403, `Your role cannot scan ${kind.replace('_', ' ')}`);
  if (!(file instanceof Blob) || file.size === 0) return fail(400, 'Attach an image file');
  if (file.size > MAX_BYTES) return fail(413, 'Image is larger than 10 MB');
  if (!IMAGE_TYPES.includes(file.type)) return fail(415, 'Use a JPEG, PNG, WebP or HEIC photo');

  const body = new FormData();
  body.append('kind', kind);
  body.append('file', file, (file as File).name || `scan.${file.type.split('/')[1]}`);
  let res: Response;
  try {
    res = await fetch(`${setting('OCR_URL', 'http://localhost:8800')}/v1/scan`, {
      method: 'POST',
      headers: { 'X-OCR-Key': secret('OCR_API_KEY', 'dev-ocr-key') },
      body,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    const timeout = (e as Error)?.name === 'TimeoutError';
    console.error('[ocr] service unreachable:', (e as Error)?.message);
    return fail(timeout ? 504 : 503, timeout ? 'OCR timed out, try a smaller photo' : 'OCR service unavailable');
  }
  const json = (await res.json().catch(() => null)) as { detail?: unknown } | null;
  if (res.ok && json) return NextResponse.json(json);
  // OCR 400/413 describe the image; anything else (401 = key mismatch, 5xx) is our problem.
  if (res.status === 400 || res.status === 413) {
    return fail(res.status, typeof json?.detail === 'string' ? json.detail : 'Could not read that image');
  }
  console.error('[ocr] service error', res.status, JSON.stringify(json)?.slice(0, 300));
  return fail(502, 'OCR service error');
}
