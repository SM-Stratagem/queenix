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
import type * as mutations_branches from "../mutations/branches.js";
import type * as mutations_commerce from "../mutations/commerce.js";
import type * as mutations_crm from "../mutations/crm.js";
import type * as mutations_demoAccounts from "../mutations/demoAccounts.js";
import type * as mutations_engagement from "../mutations/engagement.js";
import type * as mutations_finance from "../mutations/finance.js";
import type * as mutations_loyalty from "../mutations/loyalty.js";
import type * as mutations_membershipAdmin from "../mutations/membershipAdmin.js";
import type * as mutations_operations from "../mutations/operations.js";
import type * as mutations_payments from "../mutations/payments.js";
import type * as mutations_sync from "../mutations/sync.js";
import type * as mutations_teamOrg from "../mutations/teamOrg.js";
import type * as mutations_users from "../mutations/users.js";
import type * as mutations_valet from "../mutations/valet.js";
import type * as permissions from "../permissions.js";
import type * as queries_access from "../queries/access.js";
import type * as queries_branches from "../queries/branches.js";
import type * as queries_classes from "../queries/classes.js";
import type * as queries_commerce from "../queries/commerce.js";
import type * as queries_commerceOps from "../queries/commerceOps.js";
import type * as queries_crm from "../queries/crm.js";
import type * as queries_documentsAdmin from "../queries/documentsAdmin.js";
import type * as queries_engagement from "../queries/engagement.js";
import type * as queries_finance from "../queries/finance.js";
import type * as queries_financeAuditLog from "../queries/financeAuditLog.js";
import type * as queries_financeReports from "../queries/financeReports.js";
import type * as queries_membershipAdmin from "../queries/membershipAdmin.js";
import type * as queries_memberships from "../queries/memberships.js";
import type * as queries_operations from "../queries/operations.js";
import type * as queries_org from "../queries/org.js";
import type * as queries_payments from "../queries/payments.js";
import type * as queries_promotionsAdmin from "../queries/promotionsAdmin.js";
import type * as queries_teamOrg from "../queries/teamOrg.js";
import type * as queries_users from "../queries/users.js";
import type * as queries_valet from "../queries/valet.js";
import type * as schema_access from "../schema/access.js";
import type * as schema_branches from "../schema/branches.js";
import type * as schema_classes from "../schema/classes.js";
import type * as schema_commerce from "../schema/commerce.js";
import type * as schema_crm from "../schema/crm.js";
import type * as schema_documents from "../schema/documents.js";
import type * as schema_events from "../schema/events.js";
import type * as schema_finance from "../schema/finance.js";
import type * as schema_identity from "../schema/identity.js";
import type * as schema_member from "../schema/member.js";
import type * as schema_membership from "../schema/membership.js";
import type * as schema_operations from "../schema/operations.js";
import type * as schema_org from "../schema/org.js";
import type * as schema_payments from "../schema/payments.js";
import type * as schema_people from "../schema/people.js";
import type * as schema_training from "../schema/training.js";
import type * as schema_valet from "../schema/valet.js";
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
  "mutations/branches": typeof mutations_branches;
  "mutations/commerce": typeof mutations_commerce;
  "mutations/crm": typeof mutations_crm;
  "mutations/demoAccounts": typeof mutations_demoAccounts;
  "mutations/engagement": typeof mutations_engagement;
  "mutations/finance": typeof mutations_finance;
  "mutations/loyalty": typeof mutations_loyalty;
  "mutations/membershipAdmin": typeof mutations_membershipAdmin;
  "mutations/operations": typeof mutations_operations;
  "mutations/payments": typeof mutations_payments;
  "mutations/sync": typeof mutations_sync;
  "mutations/teamOrg": typeof mutations_teamOrg;
  "mutations/users": typeof mutations_users;
  "mutations/valet": typeof mutations_valet;
  permissions: typeof permissions;
  "queries/access": typeof queries_access;
  "queries/branches": typeof queries_branches;
  "queries/classes": typeof queries_classes;
  "queries/commerce": typeof queries_commerce;
  "queries/commerceOps": typeof queries_commerceOps;
  "queries/crm": typeof queries_crm;
  "queries/documentsAdmin": typeof queries_documentsAdmin;
  "queries/engagement": typeof queries_engagement;
  "queries/finance": typeof queries_finance;
  "queries/financeAuditLog": typeof queries_financeAuditLog;
  "queries/financeReports": typeof queries_financeReports;
  "queries/membershipAdmin": typeof queries_membershipAdmin;
  "queries/memberships": typeof queries_memberships;
  "queries/operations": typeof queries_operations;
  "queries/org": typeof queries_org;
  "queries/payments": typeof queries_payments;
  "queries/promotionsAdmin": typeof queries_promotionsAdmin;
  "queries/teamOrg": typeof queries_teamOrg;
  "queries/users": typeof queries_users;
  "queries/valet": typeof queries_valet;
  "schema/access": typeof schema_access;
  "schema/branches": typeof schema_branches;
  "schema/classes": typeof schema_classes;
  "schema/commerce": typeof schema_commerce;
  "schema/crm": typeof schema_crm;
  "schema/documents": typeof schema_documents;
  "schema/events": typeof schema_events;
  "schema/finance": typeof schema_finance;
  "schema/identity": typeof schema_identity;
  "schema/member": typeof schema_member;
  "schema/membership": typeof schema_membership;
  "schema/operations": typeof schema_operations;
  "schema/org": typeof schema_org;
  "schema/payments": typeof schema_payments;
  "schema/people": typeof schema_people;
  "schema/training": typeof schema_training;
  "schema/valet": typeof schema_valet;
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
