/**
 * Queenix Gym — Convex schema entry point.
 *
 * Tables live in `convex/schema/{domain}.ts`. This file only assembles them.
 * The split keeps each domain's table definitions small and reviewable.
 */

import { defineSchema } from 'convex/server'

import * as identity from './schema/identity'
import * as member from './schema/member'
import * as membership from './schema/membership'
import * as payments from './schema/payments'
import * as documents from './schema/documents'
import * as access from './schema/access'
import * as classes from './schema/classes'
import * as training from './schema/training'
import * as operations from './schema/operations'

export default defineSchema({
  ...identity,
  ...member,
  ...membership,
  ...payments,
  ...documents,
  ...access,
  ...classes,
  ...training,
  ...operations,
})
