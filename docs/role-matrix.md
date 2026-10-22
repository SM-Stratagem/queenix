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
| superadmin | `/dashboard` |
| admin | `/dashboard` |
| finance | `/finance` |
| operations | `/dashboard` |
| salon | `/salon` |
| coffee | `/coffee` |
| trainer | `/trainer` |
| member | `/login` (members are signed out of the console; they use the app) |

(`WEB_LANDING` / `webLandingFor` in `packages/auth/src/roles.ts`; the sign-in
redirect is `landingFor` in `apps/web/src/lib/access.ts`, which honours a
same-origin `?next` the user can open.) Page access per route is
`ROUTE_ROLES` in `apps/web/src/lib/access.ts`; superadmin/admin open every
page. `/notifications` and `/sales-push` are finance + operations only (not
trainer). `/website` is operations, plus anyone with a live global
`content.manage` grant (`ROUTE_CAPABILITY`).

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
| content.manage | yes | yes | - | yes | - | - | - | - |
| notifications.push | yes | yes | - | yes | - | - | - | - |

Helpers: `canAccessAdmin` = superadmin/admin/finance.
`canAccessFinance` = superadmin/admin/finance.
`canManageStaff` = superadmin/admin/finance.

## Modular custom access (capability grants)

Individual users can hold extra capabilities without a role change via the
`capabilityGrants` table (`packages/convex/convex/schema/grants.ts`),
managed through `mutations/grants.ts`
(`grantCapability` / `revokeCapability` / `listGrantsForUser`). There is no
console screen for grants yet; they are created by a developer.

- Granting or revoking needs `staff.manage` AND passes `grantChangeError`
  (`permissions.ts`): the actor must hold the capability **through their own
  roles** (grants don't chain), must strictly **outrank** the target, and can
  never grant to themselves (dropping your own grant is allowed). So
  `platform.manage` is superadmin-only, and `content.manage` /
  `notifications.push` can only be granted by superadmin/admin (finance does
  not hold them). Every grant, update and revoke is audited
  (`capabilityGrant.created` / `.updated` / `.revoked`).
- Grants are ADDITIVE ONLY: they never remove role-implied capabilities.
- A grant with no `branchId` is global; a grant with a `branchId` applies
  only when the check targets that branch
  (`requireCapability(ctx, cap, { branchId })`).
- Expired grants (`expiresAt <= now`) are ignored.
- `requireCapability` checks role capabilities first, then grants, and
  throws `FORBIDDEN` when neither covers the capability.
- Web: `queries/capabilities:mine` returns the caller's live global grants;
  a `content.manage` grant opens the **Website** section (menu + `/website`
  pages) for that user (`AdminNav`, `AdminFrame` RouteGate).

## Role changes and approvals (rank rules)

- `mutations/teamOrg:setStaffRoles` (finance+) passes `roleChangeError`:
  nobody edits their own roles; superadmin may assign anything; everyone else
  may only edit people ranked strictly below them and only assign roles
  strictly below their own rank (so only superadmin hands out admin or
  superadmin). Operations sees **Roles & permissions** read-only.
  `/api/team/roles` re-checks the same ceiling (`canSyncRoles`).
- `mutations/users:decideApproval` requires finance or operations
  (superadmin/admin pass every role gate); `payment.*` / `payout.*` need
  `finance.write`; nobody decides their own request (`approvalDecisionError`).
- `mutations/teamOrg:decideTimeOff`: finance/operations (+ superadmin/admin),
  never your own time off. Pending time off also shows in the mobile
  Approvals screen (**Time off** tab).

## Demo accounts (seeded by `scripts/seed-demo-users.mjs` and `convex/demoDataset.ts`; password `QueenixDemo123!`)

| Email | Roles | Active |
|---|---|---|
| superadmin@queenix.test | superadmin | superadmin |
| owner@queenix.test | owner (alias of finance) | owner |
| ops@queenix.test | operations | operations |
| trainer@queenix.test | trainer | trainer |
| salon@queenix.test | salon | salon |
| coffee@queenix.test | coffee | coffee |
| member@queenix.test | member | member |

Each account holds a single role; there is no demo `admin` account (create
one by giving a user `admin` as superadmin). Emails can be overridden with
`DEMO_*_EMAIL` env vars. Idempotent upsert by the `by_email` index.
