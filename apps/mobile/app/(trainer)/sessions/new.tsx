import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Input,
  Button,
  Header,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import { Search, CalendarPlus } from '@tamagui/lucide-icons';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function NewSessionScreen() {
  const router = useRouter();
  const toast = useToast();
  const [memberSearch, setMemberSearch] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState('18:00');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hits = useConvexQuery(
    api.queries.users.getMembersDirectory,
    memberSearch.trim() ? { search: memberSearch.trim(), limit: 8 } : 'skip'
  );
  // See today.tsx note: training module postdates the committed api snapshot.
  const schedule = useConvexMutation((api.mutations as any).training.scheduleSession);

  async function onSave() {
    setError(null);
    if (!memberId) {
      setError('Pick a member first.');
      return;
    }
    const at = Date.parse(`${date}T${time}:00`);
    if (!Number.isFinite(at)) {
      setError('Use YYYY-MM-DD and HH:MM (24h).');
      return;
    }
    const durationMinutes = Math.round(Number(duration));
    const priceCents = Math.round(Number(price) * 100);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setError('Duration must be a positive number of minutes.');
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setError('Price must be zero or more (AED).');
      return;
    }
    setBusy(true);
    try {
      await schedule({
        memberId: memberId as any,
        scheduledAt: at,
        durationMinutes,
        priceCents,
        currency: 'AED',
        notes: notes.trim() || undefined,
      });
      toast.success('Session scheduled');
      router.back();
    } catch (e: any) {
      setError(e?.data?.message ?? e?.message ?? 'Could not schedule session.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Header title="New session" onBack={() => router.back()} />
      <YStack paddingHorizontal="$4" paddingBottom="$6" gap="$4">
        <YStack gap="$2">
          <Text variant="h4">Member</Text>
          {memberId ? (
            <Card variant="outlined" padding="sm">
              <XStack alignItems="center" justifyContent="space-between">
                <Text weight="600">{memberName}</Text>
                <Text
                  variant="bodySmall"
                  color="brand"
                  onPress={() => {
                    setMemberId('');
                    setMemberName('');
                  }}
                >
                  Change
                </Text>
              </XStack>
            </Card>
          ) : (
            <>
              <Input
                placeholder="Search members by name or email"
                value={memberSearch}
                onChangeText={setMemberSearch}
                leftIcon={<Search size={18} color="$textMuted" />}
                accessibilityLabel="Search members"
              />
              {memberSearch.trim().length > 0 &&
                (hits === undefined ? (
                  <Text variant="bodySmall" color="muted">
                    Searching…
                  </Text>
                ) : hits.length === 0 ? (
                  <EmptyState title="No members found" message="Check the spelling." />
                ) : (
                  <YStack gap="$2">
                    {hits.map((m: any) => (
                      <Card
                        key={String(m.user._id)}
                        variant="outlined"
                        padding="sm"
                        onPress={() => {
                          setMemberId(String(m.user._id));
                          setMemberName(m.user.fullName ?? m.user.email);
                          setMemberSearch('');
                        }}
                      >
                        <Text weight="600">{m.user.fullName}</Text>
                        <Text variant="bodySmall" color="muted">
                          {m.user.email}
                        </Text>
                      </Card>
                    ))}
                  </YStack>
                ))}
            </>
          )}
        </YStack>

        <YStack gap="$2">
          <Text variant="h4">When</Text>
          <XStack gap="$2">
            <YStack flex={1} gap="$1">
              <Text variant="caption" color="muted">
                Date (YYYY-MM-DD)
              </Text>
              <Input value={date} onChangeText={setDate} accessibilityLabel="Session date" />
            </YStack>
            <YStack flex={1} gap="$1">
              <Text variant="caption" color="muted">
                Time (HH:MM)
              </Text>
              <Input value={time} onChangeText={setTime} accessibilityLabel="Session time" />
            </YStack>
          </XStack>
        </YStack>

        <YStack gap="$2">
          <Text variant="h4">Details</Text>
          <XStack gap="$2">
            <YStack flex={1} gap="$1">
              <Text variant="caption" color="muted">
                Duration (min)
              </Text>
              <Input
                value={duration}
                onChangeText={setDuration}
                accessibilityLabel="Duration minutes"
              />
            </YStack>
            <YStack flex={1} gap="$1">
              <Text variant="caption" color="muted">
                Price (AED)
              </Text>
              <Input value={price} onChangeText={setPrice} accessibilityLabel="Price AED" />
            </YStack>
          </XStack>
          <Input
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            accessibilityLabel="Session notes"
          />
        </YStack>

        {error && (
          <Text variant="bodySmall" color="danger">
            {error}
          </Text>
        )}

        <Button
          label={busy ? 'Scheduling…' : 'Schedule session'}
          onPress={onSave}
          variant="primary"
          size="lg"
          disabled={busy}
          icon={<CalendarPlus size={18} color="$textOnBrand" />}
        />
      </YStack>
    </Screen>
  );
}
