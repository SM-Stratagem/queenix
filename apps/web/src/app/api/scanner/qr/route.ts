/**
 * Queenix Gym — Physical QR scanner bridge (incoming scan).
 *
 * The hardware scanner at the gym entrance POSTs every successful
 * QR read to this endpoint. We forward it to Convex (internal mutation,
 * admin key) and return a simple decision the scanner firmware can act on
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
import { convexAdmin } from '@queenix/auth/convex-admin';
import { scannerKeyOk } from '@/lib/scanner-auth';
import { scannerError } from '../errors';

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

export async function POST(req: NextRequest) {
  if (!scannerKeyOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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

  try {
    const result = await convexAdmin('mutation', 'mutations/access:processAccessScanInternal', {
      token,
      accessPointId: deviceId,
      direction,
    });

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
  } catch (err) {
    const { status, reason } = scannerError(err);
    if (status >= 500) console.error('[scanner/qr]', err);
    return NextResponse.json(
      {
        granted: false,
        reason,
        action: 'beep_twice',
        display: status >= 500 ? '✗ Server error' : `✗ ${reason}`,
      },
      { status }
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
