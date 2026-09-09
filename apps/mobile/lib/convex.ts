/**
 * Queenix Gym — Convex client wrapper
 * Use this for typed access to Convex functions from React Native.
 */

import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@queenix/convex';
import type { FunctionReference } from 'convex/server';

// Re-export for convenience
export { api } from '@queenix/convex';
export { useQuery, useMutation, useAction } from 'convex/react';

/**
 * Type-safe query hook wrapper.
 * Usage: const membership = useConvexQuery(api.queries.memberships.getCurrentMembership, {});
 */
export const useConvexQuery = <T extends FunctionReference<'query'>>(
  query: T,
  args: T['_args'] | 'skip' = {} as T['_args']
) => {
  return useQuery(query, args as any) as T['_returnType'] | undefined;
};

/**
 * Type-safe mutation hook wrapper.
 */
export const useConvexMutation = <T extends FunctionReference<'mutation'>>(mutation: T) => {
  return useMutation(mutation) as (...args: any[]) => Promise<T['_returnType']>;
};
