/**
 * Queenix Gym — serve scanned images (IDs, receipts, paper forms) back to staff.
 * ponytail: any finance/operations staffer can open any scan whose id they hold;
 * ids only reach clients through role-gated queries. Scope per record type if that changes.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

export const scanUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => {
    await requireRole(ctx, ['finance', 'operations']);
    return await ctx.storage.getUrl(storageId);
  },
});
