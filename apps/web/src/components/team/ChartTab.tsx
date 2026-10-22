'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { YStack, XStack, Text, Input } from 'tamagui';
import { api } from '@queenix/convex';
import { OrgChart, type OrgNode } from '../org/OrgChart';
import { card } from './styles';

/* ---------------- Org chart (live) ---------------- */

function filterTree(node: OrgNode, q: string): OrgNode | null {
  const kids = node.children
    .map((c) => filterTree(c, q))
    .filter((c): c is OrgNode => c !== null);
  if (!q) return { ...node, children: kids };
  const hay = `${node.fullName} ${node.email} ${node.title ?? ''}`.toLowerCase();
  if (hay.includes(q) || kids.length > 0) return { ...node, children: kids };
  return null;
}

export function ChartTab() {
  const [search, setSearch] = useState('');
  const tree = useQuery(api.queries.org.staffTree, {});
  if (tree === undefined) return <Text opacity={0.6}>Loading org chart…</Text>;
  if (tree.length === 0)
    return (
      <div style={card}>
        <Text fontSize={14} fontWeight="700">
          No staff yet
        </Text>
        <Text fontSize={13} opacity={0.6}>
          No users with a staff role exist. Grant a staff role under Roles &amp;
          permissions to build the chart.
        </Text>
      </div>
    );
  const q = search.trim().toLowerCase();
  const nodes = (tree as OrgNode[])
    .map((root) => filterTree(root, q))
    .filter((n): n is OrgNode => n !== null);
  return (
    <YStack gap={12}>
      <XStack>
        <Input
          placeholder="Search staff…"
          value={search}
          onChangeText={setSearch}
          width={220}
        />
      </XStack>
      <OrgChart nodes={nodes} />
    </YStack>
  );
}
