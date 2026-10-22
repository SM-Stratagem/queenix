'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { YStack, XStack, Text } from 'tamagui';
import { api } from '@queenix/convex';
import { errMsg } from '@/lib/errors';
import { card, btnPrimary, btnGhost, inputStyle } from '../admin/styles';

/** Selected branch: header actions, staff assignment, upcoming events. */
export function BranchDetail({
  selectedId,
  detail,
  onEdit,
  notify,
}: {
  selectedId: string;
  detail: any;
  /** Omitted for roles that can't edit branches (hides Edit + Deactivate). */
  onEdit?: (branch: any) => void;
  notify: (msg: string | null) => void;
}) {
  const setActive = useMutation(api.mutations.branches.setBranchActive);
  const assignStaff = useMutation(api.mutations.teamOrg.assignBranchStaff);
  const unassignStaff = useMutation(api.mutations.teamOrg.unassignBranchStaff);
  const staffDir = useQuery(api.queries.org.staffDirectory, {});
  const [assign, setAssign] = useState({ userId: '', role: '', isPrimary: false });

  async function act(fn: () => Promise<unknown>, ok: string, fail: string) {
    notify(null);
    try {
      await fn();
      notify(ok);
    } catch (err) {
      notify(errMsg(err, fail));
    }
  }

  async function submitAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assign.userId) return;
    notify(null);
    try {
      await assignStaff({
        branchId: selectedId as any,
        userId: assign.userId as any,
        role: assign.role || 'staff',
        isPrimary: assign.isPrimary,
      });
      setAssign({ userId: '', role: '', isPrimary: false });
      notify('Staff assigned.');
    } catch (err) {
      notify(errMsg(err, 'Failed to assign staff.'));
    }
  }

  return (
    <YStack gap={12}>
      <div style={card}>
        <XStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={8}>
          <Text fontSize={17} fontWeight="800">
            {(detail as any).branch.name}
          </Text>
          {onEdit && (
            <XStack gap={8}>
              <button style={btnGhost} onClick={() => onEdit((detail as any).branch)}>
                Edit
              </button>
              <button
                style={btnGhost}
                onClick={() =>
                  act(
                    () =>
                      setActive({
                        branchId: selectedId as any,
                        isActive: !(detail as any).branch.isActive,
                      }),
                    (detail as any).branch.isActive ? 'Branch deactivated.' : 'Branch activated.',
                    'Failed to update branch.',
                  )
                }
              >
                {(detail as any).branch.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </XStack>
          )}
        </XStack>
        <Text fontSize={13} opacity={0.6}>
          {(detail as any).branch.city}
          {(detail as any).branch.address
            ? ` · ${(detail as any).branch.address}`
            : ''}
          {(detail as any).branch.phone
            ? ` · ${(detail as any).branch.phone}`
            : ''}
        </Text>
      </div>

      <div style={card}>
        <Text fontSize={15} fontWeight="700">
          Staff ({(detail as any).staff.length})
        </Text>
        {(detail as any).staff.length === 0 ? (
          <Text fontSize={13} opacity={0.6} marginTop={4}>
            Nobody assigned yet.
          </Text>
        ) : (
          <YStack gap={6} marginTop={8}>
            {(detail as any).staff.map((s: any) => (
              <XStack
                key={String(s.link._id)}
                gap={8}
                alignItems="center"
                justifyContent="space-between"
              >
                <Text fontSize={13}>
                  <strong>{s.user?.fullName ?? 'Unknown'}</strong>{' '}
                  <span style={{ opacity: 0.6 }}>
                    · {s.link.role}
                    {s.link.isPrimary ? ' (primary)' : ''}
                  </span>
                </Text>
                <button
                  style={btnGhost}
                  onClick={() =>
                    act(
                      () => unassignStaff({ branchId: selectedId as any, userId: s.link.userId }),
                      'Staff removed.',
                      'Failed to remove staff.',
                    )
                  }
                >
                  Remove
                </button>
              </XStack>
            ))}
          </YStack>
        )}
        <form onSubmit={submitAssign}>
          <XStack gap={8} marginTop={12} flexWrap="wrap" alignItems="center">
            <select
              required
              value={assign.userId}
              onChange={(e) => setAssign({ ...assign, userId: e.target.value })}
              style={{ ...inputStyle, maxWidth: 200 }}
            >
              <option value="">Select staff…</option>
              {((staffDir ?? []) as any[]).map((d) => (
                <option key={String(d.user._id)} value={String(d.user._id)}>
                  {d.user.fullName} ({d.user.activeRole})
                </option>
              ))}
            </select>
            <input
              placeholder="Role at branch"
              value={assign.role}
              onChange={(e) => setAssign({ ...assign, role: e.target.value })}
              style={{ ...inputStyle, maxWidth: 160 }}
            />
            <label style={{ fontSize: 13, display: 'flex', gap: 4 }}>
              <input
                type="checkbox"
                checked={assign.isPrimary}
                onChange={(e) =>
                  setAssign({ ...assign, isPrimary: e.target.checked })
                }
              />
              Primary
            </label>
            <button type="submit" style={btnPrimary}>
              Assign
            </button>
          </XStack>
        </form>
      </div>

      <div style={card}>
        <Text fontSize={15} fontWeight="700">
          Events at this branch
        </Text>
        {(detail as any).events.length === 0 ? (
          <Text fontSize={13} opacity={0.6} marginTop={4}>
            No events yet — create one from the Events page.
          </Text>
        ) : (
          <YStack gap={6} marginTop={8}>
            {(detail as any).events.slice(0, 8).map((e: any) => (
              <Text key={String(e._id)} fontSize={13}>
                {e.title} · {new Date(e.startsAt).toLocaleString()} · {e.status}
              </Text>
            ))}
          </YStack>
        )}
      </div>
    </YStack>
  );
}
