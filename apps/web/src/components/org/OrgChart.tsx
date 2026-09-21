/**
 * OrgChart — pure presentational staff tree (collapsible).
 * Receives nodes via props; no data fetching here.
 */
'use client';

import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';

export type OrgNode = {
  userId: string;
  fullName: string;
  email: string;
  activeRole: string;
  title: string | null;
  department: string | null;
  reportsToId: string | null;
  children: OrgNode[];
};

function OrgNodeView({ node, depth }: { node: OrgNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasKids = node.children.length > 0;
  return (
    <YStack
      gap={8}
      padding={12}
      borderWidth={1}
      borderRadius={10}
      marginLeft={depth === 0 ? 0 : 20}
    >
      <XStack gap={8} alignItems="center" justifyContent="space-between">
        <YStack gap={2}>
          <Text fontSize={15} fontWeight="700">
            {node.fullName}
          </Text>
          <Text fontSize={12} opacity={0.6}>
            {[node.title, node.activeRole, node.department]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </YStack>
        {hasKids ? (
          <Text
            fontSize={13}
            fontWeight="700"
            cursor="pointer"
            onPress={() => setOpen((o) => !o)}
          >
            {open ? '− hide' : `+ ${node.children.length} reports`}
          </Text>
        ) : null}
      </XStack>
      {open && hasKids ? (
        <YStack gap={8}>
          {node.children.map((c) => (
            <OrgNodeView key={c.userId} node={c} depth={depth + 1} />
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}

export function OrgChart({ nodes }: { nodes: OrgNode[] }) {
  if (nodes.length === 0) {
    return <Text opacity={0.6}>No staff found.</Text>;
  }
  return (
    <YStack gap={10}>
      {nodes.map((n) => (
        <OrgNodeView key={n.userId} node={n} depth={0} />
      ))}
    </YStack>
  );
}
