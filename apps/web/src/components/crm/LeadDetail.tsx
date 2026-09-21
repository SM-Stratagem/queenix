'use client';

import React, { useState } from 'react';
import { YStack, XStack, Text, Input, Button } from 'tamagui';
import type { PipelineLead } from './PipelineBoard';

export interface CrmInteraction {
  _id: string;
  channel: 'call' | 'whatsapp' | 'visit' | 'note';
  summary: string;
  createdAt: number;
}

interface Props {
  lead: PipelineLead | null;
  interactions: CrmInteraction[];
  onLog: (leadId: string, summary: string) => void;
}

export function LeadDetail({ lead, interactions, onLog }: Props) {
  const [draft, setDraft] = useState('');
  if (!lead) {
    return (
      <YStack padding={16} borderRadius={12} background="$backgroundHover">
        <Text opacity={0.6}>Select a lead from the pipeline.</Text>
      </YStack>
    );
  }
  return (
    <YStack gap={12} padding={16} borderRadius={12} background="$backgroundHover">
      <YStack gap={2}>
        <Text fontSize={18} fontWeight="800">
          {lead.name}
        </Text>
        <Text fontSize={13} opacity={0.6}>
          {lead.phone} · {lead.source} · {lead.stage}
        </Text>
      </YStack>
      <YStack gap={6}>
        <Text fontWeight="700" fontSize={13}>
          Interactions ({interactions.length})
        </Text>
        {interactions.map((i) => (
          <YStack key={i._id} gap={2} padding={8} borderRadius={8} background="$background">
            <Text fontSize={12} fontWeight="600">
              {i.channel} · {new Date(i.createdAt).toLocaleString()}
            </Text>
            <Text fontSize={13}>{i.summary}</Text>
          </YStack>
        ))}
        {interactions.length === 0 && (
          <Text fontSize={12} opacity={0.5}>
            No interactions logged yet.
          </Text>
        )}
      </YStack>
      <XStack gap={8}>
        <Input
          flex={1}
          size="$3"
          placeholder="Log an interaction…"
          value={draft}
          onChangeText={setDraft}
        />
        <Button
          size="$3"
          onPress={() => {
            if (!draft.trim()) return;
            onLog(lead._id, draft.trim());
            setDraft('');
          }}
        >
          Log
        </Button>
      </XStack>
    </YStack>
  );
}
