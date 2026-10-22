/**
 * Queenix Gym — Scanner bridge health check.
 *
 * The physical scanner pings this endpoint periodically (every 60s by
 * default) so the operations dashboard can show a green/amber/red
 * status indicator. We also write a heartbeat to Convex so the
 * `getScannerHealth` query can return accurate "last seen" times.
 *
 *   GET  /api/scanner/health?deviceId=front-door
 *   POST /api/scanner/health   { deviceId, lastScanAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import { convexAdmin } from '@queenix/auth/convex-admin';
import { scannerKeyOk } from '@/lib/scanner-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deviceId = url.searchParams.get('deviceId') ?? 'unknown';
  const now = Date.now();

  // Fire-and-forget heartbeat to Convex (don't block the response). Only
  // devices with the scanner key count as "seen"; the ping itself stays open.
  if (scannerKeyOk(req)) {
    convexAdmin('mutation', 'mutations/operations:recordScannerHeartbeat', { deviceId }).catch(() => {
      // Silent — health endpoint should always return 200 so the
      // scanner firmware doesn't enter a fail-loop.
    });
  }

  return NextResponse.json({
    ok: true,
    service: 'queenix-scanner-bridge',
    deviceId,
    timestamp: now,
  });
}

export async function POST(req: NextRequest) {
  if (!scannerKeyOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let body: { deviceId?: string; lastScanAt?: number } = {};
  try {
    body = await req.json();
  } catch {
    // ignore — fall through to GET semantics
  }
  const deviceId = body.deviceId ?? 'unknown';
  const lastScanAt = body.lastScanAt;

  try {
    await convexAdmin('mutation', 'mutations/operations:recordScannerHeartbeat', { deviceId, lastScanAt });
  } catch {
    // Silent
  }

  return NextResponse.json({
    ok: true,
    service: 'queenix-scanner-bridge',
    deviceId,
    lastScanAt: lastScanAt ?? null,
    timestamp: Date.now(),
  });
}
