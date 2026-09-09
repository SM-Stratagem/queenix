/**
 * Queenix Gym — Physical fingerprint reader bridge (incoming scan).
 *
 * The fingerprint reader at the front desk POSTs every successful
 * fingerprint match to this endpoint. We validate the device against
 * the FINGERPRINT_DEVICE_IDS allowlist and forward to Convex via
 * `mutations/users:recordPunchForUser` so the punch is recorded against
 * the enrolled user.
 *
 * Hardware contract (ZKTeco UareU 4500, DigitalPersona 4500, Suprema BioMini,
 * or any reader that can POST a webhook):
 *   POST /api/scanner/fingerprint
 *   {
 *     "userId":    "convex-user-id-...",
 *     "deviceId":  "front-desk-fp-01",
 *     "punchType": "in" | "out",      // optional, defaults to toggle by last event
 *     "timestamp": 1736452810000,     // optional, defaults to server time
 *     "location":  "front_desk"       // optional
 *   }
 *
 *   200 OK
 *   {
 *     "ok": true,
 *     "eventId": "convex-punch-event-id",
 *     "userId":  "convex-user-id-...",
 *     "punchType": "in"
 *   }
 *
 *   4xx / 5xx
 *   { "ok": false, "reason": "Device not allowed" }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PunchBody {
  userId?: string;
  deviceId?: string;
  punchType?: 'in' | 'out';
  timestamp?: number;
  location?: string;
}

const ALLOWED_DEVICES = (process.env.FINGERPRINT_DEVICE_IDS ?? '')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

function isDeviceAllowed(deviceId: string): boolean {
  // In dev, allow all so the team can test without registering every reader.
  if (ALLOWED_DEVICES.length === 0) return true;
  return ALLOWED_DEVICES.includes(deviceId);
}

function getConvexClient(): ConvexHttpClient | null {
  const url = process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  return new ConvexHttpClient(url);
}

export async function POST(req: NextRequest) {
  let body: PunchBody = {};
  try {
    body = (await req.json()) as PunchBody;
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const userId = body.userId?.trim();
  const deviceId = body.deviceId?.trim() || 'unknown';
  const punchType: 'in' | 'out' = body.punchType === 'out' ? 'out' : 'in';
  const timestamp =
    typeof body.timestamp === 'number' && body.timestamp > 0
      ? body.timestamp
      : Date.now();
  const location = body.location?.trim();

  if (!userId) {
    return NextResponse.json(
      { ok: false, reason: 'Missing userId' },
      { status: 400 }
    );
  }

  if (!isDeviceAllowed(deviceId)) {
    return NextResponse.json(
      { ok: false, reason: 'Device not allowed' },
      { status: 403 }
    );
  }

  const client = getConvexClient();
  if (!client) {
    return NextResponse.json(
      { ok: false, reason: 'Convex not configured' },
      { status: 500 }
    );
  }

  const adminKey = process.env.CONVEX_DEPLOY_KEY;
  if (adminKey) {
    client.setAuth(adminKey);
  }

  try {
    const eventId = await client.mutation(
      'mutations/users:recordPunchForUser' as any,
      {
        userId,
        method: 'fingerprint',
        punchType,
        timestamp,
        deviceId,
        location,
      }
    );

    return NextResponse.json({
      ok: true,
      eventId,
      userId,
      punchType,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: err?.message ?? 'Convex error' },
      { status: 502 }
    );
  }
}
