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
import * as commerce from './schema/commerce'
import * as crm from './schema/crm'
import * as finance from './schema/finance'
import * as org from './schema/org'
import * as valet from './schema/valet'
import * as branches from './schema/branches'
import * as people from './schema/people'
import * as events from './schema/events'
import * as grants from './schema/grants'

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
  ...commerce,
  ...crm,
  ...finance,
  ...org,
  ...valet,
  ...branches,
  ...people,
  ...events,
  ...grants,
})
