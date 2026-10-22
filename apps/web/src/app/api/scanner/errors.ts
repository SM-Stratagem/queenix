/**
 * Maps a failed Convex call (ConvexCallError message from convexAdmin) to a
 * device-facing status + short reason. The raw message (request ids,
 * validator dumps) is never returned to the device — callers log it.
 */
export function scannerError(err: unknown): { status: number; reason: string } {
  const msg = String((err as { message?: unknown } | null)?.message ?? '');
  if (/ArgumentValidationError|does not match validator|Invalid argument/i.test(msg)) {
    return { status: 400, reason: 'Invalid id or field format' };
  }
  if (/User not found/i.test(msg)) return { status: 404, reason: 'Unknown user' };
  if (/Only staff can record punches/i.test(msg)) return { status: 403, reason: 'Not a staff member' };
  return { status: 500, reason: 'Server error' };
}
