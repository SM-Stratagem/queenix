import { describe, expect, it } from 'vitest';
import { approvalBlock, assignableRoles, canDo, roleEditBlock } from '../../apps/web/src/components/admin/can';

const ALL = ['superadmin', 'admin', 'finance', 'operations', 'salon', 'coffee', 'trainer', 'member'];

describe('canDo (UI mirror of Convex guards)', () => {
  it('operations cannot manage memberships, branches or roles, but can manage venue catalogues', () => {
    expect(canDo(['operations'], 'membership.manage')).toBe(false);
    expect(canDo(['operations'], 'branch.manage')).toBe(false);
    expect(canDo(['operations'], 'staff.roles')).toBe(false);
    expect(canDo(['operations'], 'venue.catalog')).toBe(true);
  });
  it('salon/coffee staff cannot edit their catalogue', () => {
    expect(canDo(['salon'], 'venue.catalog')).toBe(false);
    expect(canDo(['coffee', 'member'], 'venue.catalog')).toBe(false);
  });
  it('finance and elevated roles can do everything listed', () => {
    for (const a of ['membership.manage', 'branch.manage', 'staff.roles', 'venue.catalog'] as const) {
      expect(canDo(['finance'], a)).toBe(true);
      expect(canDo(['admin'], a)).toBe(true);
    }
  });
});

describe('role assignment', () => {
  it('only superadmin hands out superadmin/admin', () => {
    expect(assignableRoles(['superadmin'], ALL)).toEqual(ALL);
    expect(assignableRoles(['admin'], ALL)).not.toContain('admin');
    expect(assignableRoles(['admin'], ALL)).toContain('finance');
    expect(assignableRoles(['finance'], ALL)).toEqual(['operations', 'salon', 'coffee', 'trainer', 'member']);
  });
  it('nobody edits themselves; non-superadmins only edit people below them', () => {
    expect(roleEditBlock({ email: 'A@x.ae', roles: ['superadmin'] }, { email: 'a@x.ae', roles: ['superadmin'] })).toMatch(/own roles/);
    expect(roleEditBlock({ email: 'f@x.ae', roles: ['finance'] }, { email: 'g@x.ae', roles: ['finance'] })).not.toBeNull();
    expect(roleEditBlock({ email: 'f@x.ae', roles: ['finance'] }, { email: 'o@x.ae', roles: ['operations'] })).toBeNull();
    expect(roleEditBlock({ email: 's@x.ae', roles: ['superadmin'] }, { email: 'a@x.ae', roles: ['admin'] })).toBeNull();
  });
});

describe('approvalBlock', () => {
  const payout = { type: 'payout.early', requestor: { email: 't@x.ae' } };
  const leave = { type: 'trainer.timeoff', requestor: { email: 't@x.ae' } };
  it('operations decides non-money requests only', () => {
    expect(approvalBlock({ email: 'o@x.ae', roles: ['operations'] }, payout)).toMatch(/finance/);
    expect(approvalBlock({ email: 'o@x.ae', roles: ['operations'] }, leave)).toBeNull();
    expect(approvalBlock({ email: 'f@x.ae', roles: ['finance'] }, payout)).toBeNull();
  });
  it('nobody decides their own request', () => {
    expect(approvalBlock({ email: 'T@x.ae', roles: ['superadmin'] }, payout)).toMatch(/own request/);
  });
});
