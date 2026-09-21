import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen, Text, Card, Header, Skeleton, EmptyState, Badge, Input,
} from '@queenix/ui';
import { Search } from '@tamagui/lucide-icons';
import { useConvexQuery } from '@/lib/convex';
import { api } from '@queenix/convex';

export default function OwnerStaffScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const dir = useConvexQuery(
    (api.queries as any).org.staffDirectory,
    search.trim() ? { search: search.trim(), limit: 100 } : { limit: 100 }
  );

  const staff: any[] = dir ?? [];
  const trainers = staff.filter((s) => s.user.activeRole === 'trainer').length;
  const ops = staff.filter((s) => ['operations', 'coffee', 'salon'].includes(s.user.activeRole)).length;

  return (
    <Screen scroll>
      <Header
        title="Staff"
        subtitle={dir === undefined ? 'Loading…' : `${staff.length} team · ${trainers} trainers · ${ops} front desk/venues`}
        onBack={() => router.back()}
      />
      <YStack paddingHorizontal="$4" paddingBottom="$6" gap="$3">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search staff"
          leftIcon={<Search size={18} color="$textMuted" />}
          accessibilityLabel="Search staff"
        />
        {dir === undefined ? (
          <Skeleton height={120} />
        ) : staff.length === 0 ? (
          <EmptyState title="No staff found" message="Try a different search." />
        ) : (
          staff.map((s: any) => (
            <Card key={String(s.user._id)} variant="outlined" padding="sm">
              <XStack alignItems="center" gap="$3">
                <YStack flex={1} gap="$1">
                  <Text weight="600">{s.user.fullName ?? s.user.email}</Text>
                  <Text variant="bodySmall" color="muted">
                    {s.user.email}
                    {s.profile?.title ? ` · ${s.profile.title}` : ''}
                    {s.profile?.department ? ` · ${s.profile.department}` : ''}
                  </Text>
                </YStack>
                <Badge label={s.user.activeRole} variant="brand" size="sm" />
              </XStack>
            </Card>
          ))
        )}
      </YStack>
    </Screen>
  );
}
