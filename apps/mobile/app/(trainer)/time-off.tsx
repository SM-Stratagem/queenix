import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Button,
  Input,
  Header,
  Skeleton,
  EmptyState,
  Badge,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import { Plane } from '@tamagui/lucide-icons';

export default function TrainerTimeOffScreen() {
  const router = useRouter();
  const toast = useToast();
  const mine = useConvexQuery((api.queries as any).teamOrg.myTimeOff, {});
  const request = useConvexMutation((api.mutations as any).teamOrg.requestTimeOff);

  const [date, setDate] = useState('');
  const [kind, setKind] = useState<'sick' | 'leave'>('leave');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      toast.warning('Date must be YYYY-MM-DD');
      return;
    }
    setBusy(true);
    try {
      await request({ date: date.trim(), kind, note: note.trim() || undefined });
      toast.success('Day-off request filed');
      setDate('');
      setNote('');
    } catch (e: any) {
      toast.error(e?.data?.message ?? e?.message ?? 'Could not file request');
    } finally {
      setBusy(false);
    }
  }

  const items: any[] = Array.isArray(mine) ? mine : (mine as any)?.records ?? [];

  return (
    <Screen scroll>
      <Header title="Time off" onBack={() => router.back()} />
      <YStack paddingHorizontal="$4" paddingBottom="$6" gap="$4">
        <YStack gap="$2">
          <Text variant="h4">Request a day off</Text>
          <Text variant="caption" color="muted">Date (YYYY-MM-DD)</Text>
          <Input value={date} onChangeText={setDate} placeholder="2026-10-05" accessibilityLabel="Day off date" />
          <XStack gap="$2">
            {(['sick', 'leave'] as const).map((k) => (
              <Button key={k} size="sm" variant={kind === k ? 'primary' : 'secondary'} onPress={() => setKind(k)}>
                {k === 'sick' ? 'Sick day' : 'Leave'}
              </Button>
            ))}
          </XStack>
          <Input
            placeholder="Note (optional)"
            value={note}
            onChangeText={setNote}
            accessibilityLabel="Time off note"
          />
          <Button
            label={busy ? 'Filing…' : 'File request'}
            onPress={onSubmit}
            variant="primary"
            size="lg"
            disabled={busy}
            icon={<Plane size={18} color="$textOnBrand" />}
          />
        </YStack>

        <YStack gap="$2">
          <Text variant="h4">My requests</Text>
          {mine === undefined ? (
            <Skeleton height={80} />
          ) : items.length === 0 ? (
            <EmptyState title="No requests" message="Your day-off requests appear here." />
          ) : (
            items.map((t: any) => {
              const r = t.record ?? t;
              return (
                <Card key={String(r._id)} variant="outlined" padding="sm">
                  <XStack alignItems="center" justifyContent="space-between">
                    <YStack gap="$1">
                      <Text weight="600">{r.date} · {r.kind}</Text>
                      {r.note ? (
                        <Text variant="bodySmall" color="muted">{r.note}</Text>
                      ) : null}
                    </YStack>
                    <Badge
                      label={r.status}
                      variant={r.status === 'approved' ? 'success' : r.status === 'denied' ? 'danger' : 'warning'}
                      size="sm"
                    />
                  </XStack>
                </Card>
              );
            })
          )}
        </YStack>
      </YStack>
    </Screen>
  );
}
