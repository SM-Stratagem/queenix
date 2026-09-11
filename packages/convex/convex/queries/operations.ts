/**
 * Queenix Gym — Operations queries
 * Reads for the operations dashboard: incidents, shifts, support queue.
 * Stub implementations return [] to satisfy the type-checker while real
 * data flow is finalized.
 */

import { query } from "../_generated/server"

export const getIncidents = query({
  args: {},
  handler: async () => {
    return []
  },
})

export const getMyActiveShift = query({
  args: {},
  handler: async () => {
    return null
  },
})

export const getMyShifts = query({
  args: {},
  handler: async () => {
    return []
  },
})

export const getSupportQueue = query({
  args: {},
  handler: async () => {
    return []
  },
})
