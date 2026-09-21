'use client';

import React from 'react';
import { YStack, XStack, Text, Button } from 'tamagui';

export interface CrmTask {
  _id: string;
  title: string;
  status: 'open' | 'done';
  dueAt?: number;
}

interface Props {
  tasks: CrmTask[];
  onComplete: (taskId: string) => void;
}

function dueLabel(dueAt?: number): string {
  if (!dueAt) return 'no due date';
  const diff = dueAt - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 24 * 3600 * 1000) return 'due today';
  return `due ${new Date(dueAt).toLocaleDateString()}`;
}

export function TaskList({ tasks, onComplete }: Props) {
  const open = tasks.filter((t) => t.status === 'open');
  const done = tasks.filter((t) => t.status === 'done');
  return (
    <YStack gap={8} padding={16} borderRadius={12} background="$backgroundHover">
      <Text fontWeight="700" fontSize={13}>
        Tasks due ({open.length} open)
      </Text>
      {open.map((t) => (
        <XStack
          key={t._id}
          gap={8}
          alignItems="center"
          justifyContent="space-between"
          padding={10}
          borderRadius={10}
          background="$background"
        >
          <YStack gap={2} flex={1}>
            <Text fontSize={14} fontWeight="600">
              {t.title}
            </Text>
            <Text fontSize={12} opacity={0.6}>
              {dueLabel(t.dueAt)}
            </Text>
          </YStack>
          <Button size="$2" onPress={() => onComplete(t._id)}>
            Done
          </Button>
        </XStack>
      ))}
      {open.length === 0 && (
        <Text fontSize={12} opacity={0.5}>
          Nothing due. All clear.
        </Text>
      )}
      {done.length > 0 && (
        <Text fontSize={12} opacity={0.5}>
          {done.length} completed
        </Text>
      )}
    </YStack>
  );
}
