'use client';

import React, { useState } from 'react';
import { YStack, XStack, Text } from 'tamagui';
import { ChartTab } from '@/components/team/ChartTab';
import { TimingsTab } from '@/components/team/TimingsTab';
import { PermissionsTab } from '@/components/team/PermissionsTab';
import { btnGhost, btnPrimary } from '@/components/team/styles';

type Tab = 'chart' | 'timings' | 'permissions';

export default function TeamPage() {
  const [tab, setTab] = useState<Tab>('chart');
  return (
    <YStack gap={20} padding={24}>
      <YStack gap={4}>
        <Text fontSize={28} fontWeight="800">
          Team
        </Text>
        <Text fontSize={13} opacity={0.6}>
          Staff org chart · timings &amp; sick days · roles &amp; reporting lines
        </Text>
      </YStack>
      <XStack gap={8}>
        {(
          [
            ['chart', 'Org chart'],
            ['timings', 'Timings & time off'],
            ['permissions', 'Roles & permissions'],
          ] as Array<[Tab, string]>
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              ...(k === tab ? btnPrimary : btnGhost),
              ...(k === tab ? {} : { background: 'var(--bg-elevated)' }),
            }}
          >
            {label}
          </button>
        ))}
      </XStack>
      {tab === 'chart' && <ChartTab />}
      {tab === 'timings' && <TimingsTab />}
      {tab === 'permissions' && <PermissionsTab />}
    </YStack>
  );
}
