/**
 * User-facing text for a thrown Convex error. ConvexError carries its payload
 * on `.data` — either `{ message }` or a plain string; `.message` alone is the
 * raw "[CONVEX M(...)] ... Uncaught ConvexError ..." dump, so it's last resort.
 */
export function errMsg(e: unknown, fallback: string): string {
  const err = e as { data?: unknown; message?: string } | undefined;
  if (typeof err?.data === 'string') return err.data;
  const dataMsg = (err?.data as { message?: unknown } | undefined)?.message;
  if (typeof dataMsg === 'string') return dataMsg;
  return err?.message ?? fallback;
}
