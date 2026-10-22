import { describe, expect, it } from 'vitest';
import { scannerError } from '../../apps/web/src/app/api/scanner/errors';

const convex = (m: string) => new Error(`Convex mutation mutations/users:recordPunchForUser failed: [Request ID: abc] ${m}`);

describe('scannerError', () => {
  it('malformed id → 400 without echoing the validator dump', () => {
    const r = scannerError(convex('ArgumentValidationError: Value does not match validator. Path: .userId Validator: v.id("users")'));
    expect(r.status).toBe(400);
    expect(r.reason).not.toMatch(/Validator|Request ID|v\.id/);
  });
  it('member id → 403, unknown user → 404', () => {
    expect(scannerError(convex('Uncaught Error: Only staff can record punches')).status).toBe(403);
    expect(scannerError(convex('Uncaught Error: User not found')).status).toBe(404);
  });
  it('anything else → generic 500, never 502', () => {
    const r = scannerError(new Error('Convex mutation x failed: HTTP 503'));
    expect(r).toEqual({ status: 500, reason: 'Server error' });
    expect(scannerError(undefined).status).toBe(500);
  });
});
