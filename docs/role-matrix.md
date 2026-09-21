# Queenix Gym — Role Matrix (who sees what)

Contract: `superadmin | admin | finance | operations | salon | coffee | trainer | member`.
Deprecated alias: `owner` = pre-rename name of `finance`. It is accepted
everywhere a role is accepted and normalized to `finance`
(`normalizeRole` in `packages/auth/src/roles.ts`, `_helpers.ts`,
`permissions.ts`). Do not assign `owner` to new users.
Hierarchy: `superadmin > admin > finance > operations > salon = coffee = trainer > member`.

## Mobile home (expo-router)

| Role | MOBILE_HOME |
|---|---|
| superadmin | `/(owner)/overview` |
| admin | `/(owner)/overview` |
| finance | `/(owner)/overview` |
| operations | `/(ops)/scanner` |
| salon | `/(ops)/scanner` |
| coffee | `/(ops)/scanner` |
| trainer | `/(trainer)/today` |
| member | `/(member)/home` |

`/(owner)` is a legacy route-group name and is intentionally unchanged.
Multi-role users land on the highest-ranked role's home
(`mobileHomeFor` in `packages/auth/src/roles.ts`).

## Web landing (Next.js)

| Role | WEB_LANDING |
|---|---|
| superadmin | `/admin/platform` |
| admin | `/admin` |
| finance | `/owner` |
| operations | `/ops` |
| salon | `/salon` |
| coffee | `/coffee` |
| trainer | `/trainer` |
| member | `/app` |

`/owner` is a legacy path name kept for compat.

## Capabilities (`packages/convex/convex/permissions.ts`)

| Capability | superadmin | admin | finance (`owner` alias: same) | operations | salon | coffee | trainer | member |
|---|---|---|---|---|---|---|---|---|
| platform.manage | yes | - | - | - | - | - | - | - |
| finance.read/write | yes | yes | yes | - | - | - | - | - |
| staff.manage | yes | yes | yes | - | - | - | - | - |
| staff.read | yes | yes | yes | yes | - | - | - | - |
| classes.manage | yes | yes | yes | yes | - | - | yes | - |
| bookings.manage | yes | yes | yes | yes | - | - | - | - |
| bookings.scan | yes | yes | yes | yes | yes | yes | yes | - |
| salon.serve | yes | yes | - | - | yes | - | - | - |
| coffee.serve | yes | yes | - | - | - | yes | - | - |
| training.coach | yes | yes | - | - | - | - | yes | - |
| member.self | yes | yes | yes | yes | yes | yes | yes | yes |

Helpers: `canAccessAdmin` = superadmin/admin/finance.
`canAccessFinance` = superadmin/admin/finance.
`canManageStaff` = superadmin/admin/finance.

## Modular custom access (capability grants)

Individual users can hold extra capabilities without a role change via the
`capabilityGrants` table (`packages/convex/convex/schema/grants.ts`),
managed through `mutations/grants.ts`
(`grantCapability` / `revokeCapability` / `listGrantsForUser`,
all gated on `staff.manage` / `staff.read`).

- Grants are ADDITIVE ONLY: they never remove role-implied capabilities.
- A grant with no `branchId` is global; a grant with a `branchId` applies
  only when the check targets that branch
  (`requireCapability(ctx, cap, { branchId })`).
- Expired grants (`expiresAt <= now`) are ignored.
- `requireCapability` checks role capabilities first, then grants, and
  throws `FORBIDDEN` when neither covers the capability.

## Demo accounts (`seedDemoAccounts`)

| Email | Roles | Active |
|---|---|---|
| superadmin.demo@queenix.fit | superadmin, admin | superadmin |
| salon.demo@queenix.fit | salon | salon |
| trainer.demo@queenix.fit | trainer, coffee | trainer |
| member.demo@queenix.fit | member, owner | member |
| ops.demo@queenix.fit | operations | operations |

All 8 contract roles are covered across the 5 rows.
(`member.demo` still holds the deprecated `owner` alias, normalized to
`finance` at check time.)
Idempotent upsert by `by_email` index; pass `betterAuthUserId`
to link the superadmin row to a BetterAuth identity.
