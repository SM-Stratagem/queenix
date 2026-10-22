/**
 * Queenix Gym — Scanner device registration.
 *
 * Called by the operations team when installing a new physical
 * scanner. Validates the device against an allow-list (env var) and
 * returns the webhook URL + headers to configure into the scanner
 * firmware. Webhooks authenticate with the shared SCANNER_API_KEY sent
 * as `X-Scanner-Key` (see lib/scanner-auth); the returned `apiKey` is
 * stored per device but not yet checked.
 *
 *   POST /api/scanner/register
 *   {
 *     "deviceId":   "front-door",
 *     "name":       "Front entrance",
 *     "location":   "Lobby turnstile",
 *     "model":      "ZKTeco QR500",
 *     "ipAddress":  "192.168.1.42"
 *   }
 *
 *   200 OK
 *   {
 *     "ok":        true,
 *     "deviceId":  "front-door",
 *     "apiKey":    "qnx_...",
 *     "webhook":   "https://admin.queenix.ae/api/scanner/qr",
 *     "healthUrl": "https://admin.queenix.ae/api/scanner/health"
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { convexAdmin } from '@queenix/auth/convex-admin';
import { scannerKeyOk } from '@/lib/scanner-auth';
import { scannerError } from '../errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RegisterBody {
  deviceId?: string;
  name?: string;
  location?: string;
  model?: string;
  ipAddress?: string;
}

const ALLOWED_DEVICES = (process.env.ALLOWED_SCANNER_DEVICES ?? '')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

function isDeviceAllowed(deviceId: string): boolean {
  if (ALLOWED_DEVICES.length === 0) return true; // dev mode
  return ALLOWED_DEVICES.includes(deviceId);
}

function generateApiKey(deviceId: string): string {
  const rand = crypto.randomBytes(18).toString('base64url');
  return `qnx_${deviceId}_${rand}`;
}

function getBaseUrl(req: NextRequest): string {
  return process.env.PUBLIC_WEB_URL ?? req.nextUrl.origin;
}

export async function POST(req: NextRequest) {
  if (!scannerKeyOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: RegisterBody = {};
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const deviceId = body.deviceId?.trim();
  const name = body.name?.trim() || deviceId || 'Scanner';
  const location = body.location?.trim() || 'Unknown';
  const model = body.model?.trim();
  const ipAddress = body.ipAddress?.trim();
  // Always server-generated (a caller-chosen key was accepted before). Stored
  // for a future per-device auth; the webhooks currently check X-Scanner-Key.
  const apiKey = generateApiKey(deviceId ?? 'scanner');

  if (!deviceId) {
    return NextResponse.json(
      { ok: false, error: 'deviceId is required' },
      { status: 400 }
    );
  }

  if (!isDeviceAllowed(deviceId)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Device "${deviceId}" is not on the allow-list. Add it to ALLOWED_SCANNER_DEVICES env var.`,
      },
      { status: 403 }
    );
  }

  // Persist the device into Convex.
  try {
    await convexAdmin('mutation', 'mutations/operations:registerScannerDevice', {
      deviceId,
      name,
      location,
      model,
      ipAddress,
      apiKey,
    });
  } catch (err) {
    const { status, reason } = scannerError(err);
    if (status >= 500) console.error('[scanner/register]', err);
    return NextResponse.json({ ok: false, error: `Failed to register device: ${reason}` }, { status });
  }

  const base = getBaseUrl(req);
  return NextResponse.json({
    ok: true,
    deviceId,
    name,
    location,
    apiKey,
    webhook: `${base}/api/scanner/qr`,
    healthUrl: `${base}/api/scanner/health`,
    instructions: {
      method: 'POST',
      // Same shared key this request was authorized with (SCANNER_API_KEY);
      // /api/scanner/qr, /fingerprint and /health accept nothing else.
      headers: { 'Content-Type': 'application/json', 'X-Scanner-Key': '<SCANNER_API_KEY>' },
      body: { token: '<qr-payload>', deviceId, direction: 'in' },
    },
  });
}
