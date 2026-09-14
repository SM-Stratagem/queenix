/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers from "../_helpers.js";
import type * as api_ from "../api.js";
import type * as mutations_access from "../mutations/access.js";
import type * as mutations_bookings from "../mutations/bookings.js";
import type * as mutations_loyalty from "../mutations/loyalty.js";
import type * as mutations_operations from "../mutations/operations.js";
import type * as mutations_payments from "../mutations/payments.js";
import type * as mutations_sync from "../mutations/sync.js";
import type * as mutations_users from "../mutations/users.js";
import type * as queries_access from "../queries/access.js";
import type * as queries_classes from "../queries/classes.js";
import type * as queries_memberships from "../queries/memberships.js";
import type * as queries_operations from "../queries/operations.js";
import type * as queries_payments from "../queries/payments.js";
import type * as queries_users from "../queries/users.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  api: typeof api_;
  "mutations/access": typeof mutations_access;
  "mutations/bookings": typeof mutations_bookings;
  "mutations/loyalty": typeof mutations_loyalty;
  "mutations/operations": typeof mutations_operations;
  "mutations/payments": typeof mutations_payments;
  "mutations/sync": typeof mutations_sync;
  "mutations/users": typeof mutations_users;
  "queries/access": typeof queries_access;
  "queries/classes": typeof queries_classes;
  "queries/memberships": typeof queries_memberships;
  "queries/operations": typeof queries_operations;
  "queries/payments": typeof queries_payments;
  "queries/users": typeof queries_users;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
