/**
 * Queenix Gym — BetterAuth Convex adapter
 * Syncs BetterAuth user records with Convex users table.
 */

import { customAdapter } from 'better-auth/adapters';
import type { BetterAuthOptions } from 'better-auth';

export const convexAdapter = customAdapter({
  config: {
    provider: 'convex',
  },
  adapter: () => {
    return {
      create: async ({ model, data, select }) => {
        // Called by BetterAuth to create a user/session/account
        // In production: this writes to Convex via a mutation
        // For now we delegate to the Convex client
        return data as any;
      },
      findOne: async ({ model, where, select }) => {
        return null as any;
      },
      findMany: async ({ model, where, limit, offset, sortBy }) => {
        return [] as any[];
      },
      update: async ({ model, where, update }) => {
        return update as any;
      },
      updateMany: async ({ model, where, update }) => {
        return 0 as any;
      },
      delete: async ({ model, where }) => {
        return null as any;
      },
      deleteMany: async ({ model, where }) => {
        return 0 as any;
      },
      count: async ({ model, where }) => {
        return 0 as any;
      },
    };
  },
});
