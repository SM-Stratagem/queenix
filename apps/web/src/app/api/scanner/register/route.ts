/**
 * Queenix Gym — Scanner device registration.
 *
 * Called by the operations team when installing a new physical
 * scanner. Validates the device against an allow-list (env var) and
 * returns a per-device API key + the webhook URL to configure into
 * the scanner firmware.
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
import { ConvexHttpClient } from 'convex/browser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RegisterBody {
  deviceId?: string;
  name?: string;
  location?: string;
  model?: string;
  ipAddress?: string;
  apiKey?: string;
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

function getConvexClient(): ConvexHttpClient | null {
  const url = process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  return new ConvexHttpClient(url);
}

export async function POST(req: NextRequest) {
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
  const apiKey = body.apiKey?.trim() || generateApiKey(deviceId ?? 'scanner');

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
  const client = getConvexClient();
  const adminKey = process.env.CONVEX_DEPLOY_KEY;
  if (client && adminKey) {
    client.setAuth(adminKey);
    try {
      await client.mutation('mutations/operations:registerScannerDevice' as any, {
        deviceId,
        name,
        location,
        model,
        ipAddress,
        apiKey,
      });
    } catch (err: any) {
      return NextResponse.json(
        { ok: false, error: `Failed to persist: ${err?.message ?? 'unknown'}` },
        { status: 502 }
      );
    }
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
      headers: { 'Content-Type': 'application/json', 'X-Device-Key': apiKey },
      body: { token: '<qr-payload>', deviceId, direction: 'in' },
    },
  });
}
