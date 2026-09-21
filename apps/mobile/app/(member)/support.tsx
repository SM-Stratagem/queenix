import React, { useState } from 'react';
import { YStack, ScrollView } from 'tamagui';
import { Screen, Text, Card, Button, Input, Header, Skeleton, EmptyState, Badge, useToast } from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';

const opsQueries = (api.queries as any).operations;

const CATEGORIES = ['general', 'billing', 'access', 'class'] as const;

const STATUS_VARIANT: Record<string, 'neutral' | 'warning' | 'brand' | 'success'> = {
  open: 'warning',
  in_progress: 'brand',
  waiting: 'neutral',
  resolved: 'success',
};

export default function MemberSupportScreen() {
  const toast = useToast();
  const tickets = useConvexQuery(opsQueries.getMyTickets, {});
  const file = useConvexMutation(api.mutations.operations.createSupportTicket);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('general');
  const [busy, setBusy] = useState(false);

  async function onFile() {
    if (!subject.trim() || !description.trim()) {
      toast.warning('Subject and description are required');
      return;
    }
    setBusy(true);
    try {
      await file({ subject: subject.trim(), description: description.trim(), category, priority: 'medium' as any });
      toast.success('Ticket filed — the team will respond');
      setSubject('');
      setDescription('');
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not file ticket');
    } finally {
      setBusy(false);
    }
  }

  const items: any[] = tickets ?? [];

  return (
    <Screen padded={false}>
      <Header title="Help & support" subtitle="We reply within a day" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
          <Card padded>
            <Text variant="h4">New request</Text>
            <Text color="$muted" marginTop="$2">Subject</Text>
            <Input value={subject} onChangeText={setSubject} placeholder="e.g. Frozen membership question" />
            <Text color="$muted" marginTop="$2">What happened?</Text>
            <Input value={description} onChangeText={setDescription} placeholder="Tell us the details" multiline numberOfLines={3} />
            <Text color="$muted" marginTop="$2">Category</Text>
            <YStack flexDirection="row" flexWrap="wrap" gap="$2">
              {CATEGORIES.map((c) => (
                <Button key={c} size="sm" variant={category === c ? 'primary' : 'secondary'} onPress={() => setCategory(c)}>
                  {c}
                </Button>
              ))}
            </YStack>
            <Button marginTop="$3" onPress={onFile} disabled={busy}>
              {busy ? 'Filing…' : 'File request'}
            </Button>
          </Card>
          <Text variant="h4">My requests</Text>
          {tickets === undefined ? (
            <Skeleton height={90} />
          ) : items.length === 0 ? (
            <EmptyState title="No requests" message="File one above and track it here." />
          ) : (
            items.map((t) => (
              <Card key={String(t._id)} padded>
                <YStack gap="$1">
                  <YStack flexDirection="row" alignItems="center" justifyContent="space-between">
                    <Text weight="600" flex={1}>{t.subject}</Text>
                    <Badge label={String(t.status).replace('_', ' ')} variant={STATUS_VARIANT[t.status] ?? 'neutral'} size="sm" />
                  </YStack>
                  <Text color="$muted">{t.description}</Text>
                  <Text variant="caption" color="muted">
                    {new Date(t.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </YStack>
              </Card>
            ))
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
