import React, { useState } from 'react';
import { YStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen, Text, Card, Button, Input, Header, useToast,
} from '@queenix/ui';
import { useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';

const CATEGORIES = ['general', 'billing', 'access', 'staff'] as const;

export default function OwnerSupportScreen() {
  const router = useRouter();
  const toast = useToast();
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
      await file({ subject: subject.trim(), description: description.trim(), category, priority: 'high' as any });
      toast.success('Sent to the support queue');
      setSubject('');
      setDescription('');
    } catch (e: any) {
      toast.error(e?.data?.message ?? e?.message ?? 'Could not send');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Header title="Help & support" subtitle="Straight to the support queue" onBack={() => router.back()} />
      <YStack paddingHorizontal="$4" paddingBottom="$6" gap="$3">
        <Card padded>
          <Text variant="h4">Contact Concierge</Text>
          <Text color="$muted" marginTop="$2">Subject</Text>
          <Input value={subject} onChangeText={setSubject} placeholder="e.g. AC issue in studio 2" />
          <Text color="$muted" marginTop="$2">Details</Text>
          <Input value={description} onChangeText={setDescription} placeholder="What do you need?" multiline numberOfLines={3} />
          <Text color="$muted" marginTop="$2">Category</Text>
          <YStack flexDirection="row" flexWrap="wrap" gap="$2">
            {CATEGORIES.map((c) => (
              <Button key={c} size="sm" variant={category === c ? 'primary' : 'secondary'} onPress={() => setCategory(c)}>
                {c}
              </Button>
            ))}
          </YStack>
          <Button marginTop="$3" label={busy ? 'Sending…' : 'Send request'} onPress={onFile} variant="primary" size="lg" disabled={busy} />
        </Card>
      </YStack>
    </Screen>
  );
}
