# Queenix Gym — Role Matrix (who sees what)

Contract: `superadmin | admin | owner | operations | salon | coffee | trainer | member`.
Hierarchy: `superadmin > admin > owner > operations > salon = coffee = trainer > member`.

## Mobile home (expo-router)

| Role | MOBILE_HOME |
|---|---|
| superadmin | `/(owner)/overview` |
| admin | `/(owner)/overview` |
| owner | `/(owner)/overview` |
| operations | `/(ops)/scanner` |
| salon | `/(ops)/scanner` |
| coffee | `/(ops)/scanner` |
| trainer | `/(trainer)/today` |
| member | `/(member)/home` |

Multi-role users land on the highest-ranked role's home
(`mobileHomeFor` in `packages/auth/src/roles.ts`).

## Web landing (Next.js)

| Role | WEB_LANDING |
|---|---|
| superadmin | `/admin/platform` |
| admin | `/admin` |
| owner | `/owner` |
| operations | `/ops` |
| salon | `/salon` |
| coffee | `/coffee` |
| trainer | `/trainer` |
| member | `/app` |

## Capabilities (`packages/convex/convex/permissions.ts`)

| Capability | superadmin | admin | owner | operations | salon | coffee | trainer | member |
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

Helpers: `canAccessAdmin` = superadmin/admin/owner.
`canAccessFinance` = superadmin/admin/owner.
`canManageStaff` = superadmin/admin/owner.

## Demo accounts (`seedDemoAccounts`)

| Email | Roles | Active |
|---|---|---|
| superadmin.demo@queenix.fit | superadmin, admin | superadmin |
| salon.demo@queenix.fit | salon | salon |
| trainer.demo@queenix.fit | trainer, coffee | trainer |
| member.demo@queenix.fit | member, owner | member |
| ops.demo@queenix.fit | operations | operations |

All 8 contract roles are covered across the 5 rows.
Idempotent upsert by `by_email` index; pass `betterAuthUserId`
to link the superadmin row to a BetterAuth identity.
