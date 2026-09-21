'use client';

import React from 'react';
import { YStack, XStack, Text } from 'tamagui';

export type CrmStage = 'new' | 'contacted' | 'trial' | 'converted' | 'lost';

export interface PipelineLead {
  _id: string;
  name: string;
  phone: string;
  source: string;
  stage: CrmStage;
}

interface Props {
  columns: Array<{ stage: CrmStage; count: number; leads: PipelineLead[] }>;
  onMove: (leadId: string, stage: CrmStage) => void;
  onSelect: (leadId: string) => void;
}

const ORDER: CrmStage[] = ['new', 'contacted', 'trial', 'converted', 'lost'];

export function PipelineBoard({ columns, onMove, onSelect }: Props) {
  const byStage = new Map(columns.map((c) => [c.stage, c]));
  return (
    <XStack gap={12} flexWrap="wrap">
      {ORDER.map((stage) => {
        const col = byStage.get(stage);
        const leads = col?.leads ?? [];
        return (
          <YStack
            key={stage}
            flex={1}
            minWidth={180}
            gap={8}
            padding={12}
            borderRadius={12}
            background="$backgroundHover"
          >
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontWeight="700" fontSize={13} textTransform="uppercase">
                {stage}
              </Text>
              <Text fontSize={12} opacity={0.6}>
                {col?.count ?? 0}
              </Text>
            </XStack>
            {leads.map((lead) => (
              <YStack
                key={lead._id}
                gap={2}
                padding={10}
                borderRadius={10}
                background="$background"
                pressStyle={{ opacity: 0.7 }}
                onPress={() => onSelect(lead._id)}
              >
                <Text fontWeight="600" fontSize={14}>
                  {lead.name}
                </Text>
                <Text fontSize={12} opacity={0.6}>
                  {lead.phone} · {lead.source}
                </Text>
                <XStack gap={4} marginTop={6}>
                  {ORDER.filter((s) => s !== lead.stage).map((s) => (
                    <Text
                      key={s}
                      fontSize={11}
                      color="$blue10"
                      pressStyle={{ opacity: 0.6 }}
                      onPress={() => onMove(lead._id, s)}
                    >
                      →{s}
                    </Text>
                  ))}
                </XStack>
              </YStack>
            ))}
            {leads.length === 0 && (
              <Text fontSize={12} opacity={0.5}>
                No leads
              </Text>
            )}
          </YStack>
        );
      })}
    </XStack>
  );
}
