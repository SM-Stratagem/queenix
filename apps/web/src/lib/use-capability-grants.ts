/**
 * Client-only hook, kept out of lib/access.ts: that module is also imported by
 * server route handlers (e.g. /api/ocr), and convex/react calls
 * React.createContext at import time, which breaks `next build` there.
 */
import { useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

const myGrantsRef = makeFunctionReference<'query', Record<string, never>, string[]>('queries/capabilities:mine');

/**
 * The signed-in user's capability grants (Convex `capabilityGrants`, additive
 * to roles). undefined while loading; pass enabled=false to skip the query
 * (e.g. before Convex has accepted the auth token).
 */
export function useCapabilityGrants(enabled = true): string[] | undefined {
  return useQuery(myGrantsRef, enabled ? {} : 'skip');
}
