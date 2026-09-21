import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen, Text, Card, Button, Input, Header, Skeleton, EmptyState, Badge, useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import { Megaphone } from '@tamagui/lucide-icons';

export default function OwnerAnnounceScreen() {
  const router = useRouter();
  const toast = useToast();
  const history = useConvexQuery((api.queries as any).engagement.listBroadcasts, { limit: 20 });
  const send = useConvexMutation(api.mutations.engagement.sendBroadcastNotification);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'members' | 'all'>('members');
  const [busy, setBusy] = useState(false);

  async function onSend() {
    if (!title.trim() || !body.trim()) {
      toast.warning('Title and message are required');
      return;
    }
    setBusy(true);
    try {
      const res: any = await send({ title: title.trim(), body: body.trim(), audience, type: 'system' as any });
      toast.success(res?.capped ? `Sent (capped at ${res.sent})` : `Sent to ${res?.sent ?? 'audience'}`);
      setTitle('');
      setBody('');
    } catch (e: any) {
      toast.error(e?.data?.message ?? e?.message ?? 'Could not send');
    } finally {
      setBusy(false);
    }
  }

  const items: any[] = history ?? [];

  return (
    <Screen scroll>
      <Header title="Announcements" subtitle="Push to the club inbox" onBack={() => router.back()} />
      <YStack paddingHorizontal="$4" paddingBottom="$6" gap="$4">
        <YStack gap="$2">
          <Text variant="h4">New announcement</Text>
          <Input value={title} onChangeText={setTitle} placeholder="Title" accessibilityLabel="Announcement title" />
          <Input
            value={body}
            onChangeText={setBody}
            placeholder="Message for the club…"
            multiline
            numberOfLines={3}
            accessibilityLabel="Announcement message"
          />
          <XStack gap="$2">
            {(['members', 'all'] as const).map((a) => (
              <Button key={a} size="sm" variant={audience === a ? 'primary' : 'secondary'} onPress={() => setAudience(a)}>
                {a === 'members' ? 'Members' : 'Everyone incl. staff'}
              </Button>
            ))}
          </XStack>
          <Button
            label={busy ? 'Sending…' : 'Send announcement'}
            onPress={onSend}
            variant="primary"
            size="lg"
            disabled={busy}
            icon={<Megaphone size={18} color="$textOnBrand" />}
          />
        </YStack>
        <YStack gap="$2">
          <Text variant="h4">Recent</Text>
          {history === undefined ? (
            <Skeleton height={80} />
          ) : items.length === 0 ? (
            <EmptyState title="Nothing sent yet" message="Announcements appear here after sending." />
          ) : (
            items.map((b: any, i: number) => (
              <Card key={String(b._id ?? i)} variant="outlined" padding="sm">
                <YStack gap="$1">
                  <XStack alignItems="center" justifyContent="space-between">
                    <Text weight="600" flex={1}>{b.title}</Text>
                    <Badge label={b.audience ?? 'members'} variant="neutral" size="sm" />
                  </XStack>
                  <Text variant="bodySmall" color="muted" numberOfLines={2}>{b.body}</Text>
                </YStack>
              </Card>
            ))
          )}
        </YStack>
      </YStack>
    </Screen>
  );
}
