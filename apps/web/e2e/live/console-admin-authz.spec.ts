/**
 * console-admin: server-side authorization for the roles behind the
 * console (member / finance / admin), exercised over the same Convex
 * connection the apps use (JWT from /api/convex/token). Each test states
 * the EXPECTED secure behavior; a failure here is a security bug.
 */
import { test, expect } from '@playwright/test';
import { api, freshApiUser } from './console-admin.helpers';

test.setTimeout(180_000);

async function rejects(p: Promise<unknown>): Promise<string | null> {
  try {
    await p;
    return null;
  } catch (e: any) {
    return String(e?.data?.code ?? e?.data ?? e?.message ?? e);
  }
}

test('member cannot list the staff approvals inbox (requestor PII)', async () => {
  const m = await freshApiUser('m-list', ['member']);
  const err = await rejects(m.convex.query(api.queries.memberships.getApprovals, { status: 'pending', limit: 5 }));
  expect(err, 'getApprovals must be staff-only').not.toBeNull();
});

test('member cannot approve their own payout request', async () => {
  const m = await freshApiUser('m-approve', ['member']);
  const approvalId = await m.convex.mutation(api.mutations.users.requestEarlyPayout, { amountCents: 99_900, note: 'console-admin authz probe' });
  const err = await rejects(m.convex.mutation(api.mutations.users.decideApproval, { approvalId, decision: 'approved' }));
  expect(err, 'decideApproval must require staff/finance').not.toBeNull();
});

test('finance cannot promote itself to superadmin', async () => {
  const f = await freshApiUser('f-escalate', ['finance']);
  const err = await rejects(
    f.convex.mutation(api.mutations.teamOrg.setStaffRoles, { userId: f.userId, roles: ['superadmin', 'finance'], activeRole: 'superadmin' })
  );
  if (err === null) {
    // Full chain: /api/team/roles copies the escalated Convex roles into BetterAuth (web access).
    const sync = await f.http.post('/api/team/roles', { data: { userId: f.userId } });
    console.log('finance self-escalation synced to web session roles →', sync.status(), await sync.text());
  }
  expect(err, 'setStaffRoles must not let finance grant superadmin').not.toBeNull();
});

test('admin cannot promote itself to superadmin', async () => {
  const a = await freshApiUser('a-escalate', ['admin']);
  const err = await rejects(
    a.convex.mutation(api.mutations.teamOrg.setStaffRoles, { userId: a.userId, roles: ['superadmin'], activeRole: 'superadmin' })
  );
  expect(err, 'only superadmin may grant superadmin (platform.manage)').not.toBeNull();
});

test('finance cannot grant itself content.manage / platform.manage capabilities', async () => {
  const f = await freshApiUser('f-grant', ['finance']);
  // Baseline: finance is denied the Website CMS.
  expect(await rejects(f.convex.query(api.queries.siteAdmin.sections, {}))).not.toBeNull();
  const err = await rejects(f.convex.mutation(api.mutations.grants.grantCapability, { userId: f.userId, capability: 'content.manage' }));
  if (err === null) {
    // Escalation landed: prove the effect, then clean up.
    const after = await rejects(f.convex.query(api.queries.siteAdmin.sections, {}));
    console.log('finance self-granted content.manage; CMS read now', after === null ? 'ALLOWED' : `denied (${after})`);
    const grants = await f.convex.query(api.mutations.grants.listGrantsForUser, { userId: f.userId });
    for (const g of grants) await f.convex.mutation(api.mutations.grants.revokeCapability, { grantId: g._id });
  }
  expect(err, 'grantCapability must not let a non-superadmin hand out capabilities it lacks').not.toBeNull();
});

test('finance is denied phone push + website CMS writes', async () => {
  const f = await freshApiUser('f-push', ['finance']);
  expect(
    await rejects(f.convex.mutation(api.mutations.engagement.sendBroadcastNotification, { title: 'x', body: 'x', push: true, audience: 'members' })),
    'push needs notifications.push'
  ).toContain('FORBIDDEN');
  expect(await rejects(f.convex.query(api.queries.siteAdmin.listPosts, {})), 'CMS read').toContain('FORBIDDEN');
});

test('superadmin grant → effect → revoke (capability grants, additive)', async () => {
  // Grants have no web UI: drive the mutations as a fresh superadmin, the effect as the grantee.
  const sa = await freshApiUser('sa-granter', ['superadmin']);
  const ops = await freshApiUser('trainer-grantee', ['trainer']);
  expect(await rejects(ops.convex.query(api.queries.siteAdmin.listPosts, {}))).toContain('FORBIDDEN');
  const { grantId } = await sa.convex.mutation(api.mutations.grants.grantCapability, { userId: ops.userId, capability: 'content.manage', note: 'console-admin e2e' });
  expect(await rejects(ops.convex.query(api.queries.siteAdmin.listPosts, {})), 'grant takes effect').toBeNull();
  const listed = await sa.convex.query(api.mutations.grants.listGrantsForUser, { userId: ops.userId });
  expect(listed.map((g: any) => g.capability)).toContain('content.manage');
  await sa.convex.mutation(api.mutations.grants.revokeCapability, { grantId });
  expect(await rejects(ops.convex.query(api.queries.siteAdmin.listPosts, {})), 'revoke takes effect').toContain('FORBIDDEN');
});
