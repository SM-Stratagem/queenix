/**
 * Queenix Gym — Physical QR scanner bridge (incoming scan).
 *
 * The hardware scanner at the gym entrance POSTs every successful
 * QR read to this endpoint. We forward it to Convex via the deploy key
 * and return a simple decision the scanner firmware can act on
 * (open_door_2s, beep_twice, etc.).
 *
 * Scanner firmware contract (ZKTeco / Hikvision / generic TCP barcode):
 *   POST /api/scanner/qr
 *   {
 *     "token":     "user-1234-...-...",   // from the member's rotating QR
 *     "deviceId":  "front-door",          // optional, defaults to 'entrance'
 *     "direction": "in" | "out",          // optional, defaults to 'in'
 *     "timestamp": 1736452810000          // optional, forwarded for log
 *   }
 *
 *   200 OK
 *   {
 *     "granted": true,
 *     "reason":  null,
 *     "action":  "open_door_2s",
 *     "display": "✓ Welcome",
 *     "user":    { "_id": "...", "fullName": "Aisha ...", "avatarUrl": "..." }
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { getConvexApiUrl } from '@/lib/convex-env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ScanBody {
  token?: string;
  deviceId?: string;
  direction?: 'in' | 'out';
  timestamp?: number;
}

const ALLOWED_DEVICES = (process.env.ALLOWED_SCANNER_DEVICES ?? '')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

function isDeviceAllowed(deviceId: string): boolean {
  if (ALLOWED_DEVICES.length === 0) return true; // open in dev
  return ALLOWED_DEVICES.includes(deviceId);
}

function getConvexClient(): ConvexHttpClient | null {
  // Self-hosted Convex: the HTTP API lives at :3210 (NOT :3211, which is the
  // dashboard UI). The Next.js admin typically runs alongside Convex in
  // docker-compose, so reach the API at `convex-backend:3210`.
  const url =
    process.env.CONVEX_SELF_HOSTED_URL ??
    process.env.NEXT_PUBLIC_CONVEX_URL ??
    process.env.CONVEX_SITE_URL;
  if (!url) return null;
  return new ConvexHttpClient(url);
}

export async function POST(req: NextRequest) {
  let body: ScanBody = {};
  try {
    body = (await req.json()) as ScanBody;
  } catch {
    return NextResponse.json(
      { granted: false, reason: 'Invalid JSON body', action: 'beep_twice', display: '✗ Bad request' },
      { status: 400 }
    );
  }

  const token = body.token?.trim();
  const deviceId = body.deviceId?.trim() || 'entrance';
  const direction = body.direction === 'out' ? 'out' : 'in';

  if (!token) {
    return NextResponse.json(
      { granted: false, reason: 'Missing token', action: 'beep_twice', display: '✗ No token' },
      { status: 400 }
    );
  }

  if (!isDeviceAllowed(deviceId)) {
    return NextResponse.json(
      { granted: false, reason: 'Device not allowed', action: 'beep_twice', display: '✗ Unregistered device' },
      { status: 403 }
    );
  }

  const client = getConvexClient();
  if (!client) {
    return NextResponse.json(
      {
        granted: false,
        reason: 'Convex not configured',
        action: 'beep_twice',
        display: '✗ Server misconfigured',
      },
      { status: 500 }
    );
  }

  // Authenticate as a Convex deploy key (server-to-server).
  const adminKey = process.env.CONVEX_DEPLOY_KEY;
  if (adminKey) {
    client.setAuth(adminKey);
  }

  try {
    // Use the convex client to call our mutation. We invoke by string
    // path so this route compiles even when the generated `api` types
    // are out of sync.
    const result = await client.mutation(
      'mutations/access:processAccessScan' as any,
      { token, accessPointId: deviceId, direction }
    );

    const granted = Boolean((result as any)?.granted);
    const reason = (result as any)?.reason ?? null;
    const user = (result as any)?.user ?? null;

    return NextResponse.json({
      granted,
      reason,
      user,
      action: granted ? 'open_door_2s' : 'beep_twice',
      display: granted ? `✓ Welcome ${user?.fullName ? user.fullName.split(' ')[0] : ''}`.trim() : `✗ ${reason ?? 'Access denied'}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        granted: false,
        reason: err?.message ?? 'Convex error',
        action: 'beep_twice',
        display: '✗ Server error',
      },
      { status: 502 }
    );
  }
}

// Some firmware only sends GET (query-param). We accept that for compatibility.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? undefined;
  const deviceId = url.searchParams.get('deviceId') ?? 'entrance';
  const direction = (url.searchParams.get('direction') as 'in' | 'out' | null) ?? 'in';
  // Synthesise a POST so we don't duplicate the call path.
  const proxied = new NextRequest(req, {
    method: 'POST',
    body: JSON.stringify({ token, deviceId, direction }),
  });
  return POST(proxied);
}
