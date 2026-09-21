import React from 'react';
import { YStack, ScrollView } from 'tamagui';
import { Screen, Text, Card, Button, Header, Skeleton, EmptyState, useToast, Badge } from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';

const opsQueries = (api.queries as any).operations;
const opsMutations = (api.mutations as any).operations;

const TYPE_LABELS: Record<string, string> = {
  booking: 'Booking',
  class_reminder: 'Class reminder',
  payment: 'Payment',
  membership: 'Membership',
  access: 'Access',
  reward: 'Reward',
  system: 'System',
  promotion: 'Promotion',
};

export default function MemberNotificationsScreen() {
  const toast = useToast();
  const inbox = useConvexQuery(opsQueries.getMyNotifications, {});
  const markOne = useConvexMutation(opsMutations.markNotificationRead);
  const markAll = useConvexMutation(opsMutations.markAllNotificationsRead);

  const items: any[] = inbox ?? [];
  const unread = items.filter((n) => !n.read).length;

  async function onOpen(id: string) {
    try {
      await markOne({ notificationId: id as any });
    } catch {
      // Reading state is best-effort; the message is already visible.
    }
  }

  async function onMarkAll() {
    try {
      const n = await markAll({});
      toast.success(n > 0 ? `${n} marked read` : 'Already all read');
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not update');
    }
  }

  return (
    <Screen padded={false}>
      <Header title="Notifications" subtitle={unread > 0 ? `${unread} unread` : 'All caught up'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
          {inbox === undefined ? (
            <Skeleton height={90} />
          ) : (
            <>
              {unread > 0 && (
                <Button variant="secondary" onPress={onMarkAll}>
                  Mark all read
                </Button>
              )}
              {items.length === 0 ? (
                <EmptyState title="No notifications" message="Reminders about classes, payments and rewards land here." />
              ) : (
                items.map((n) => (
                  <Card key={String(n._id)} padded={false} onPress={() => onOpen(String(n._id))}>
                    <YStack padding="$3" gap="$1" opacity={n.read ? 0.65 : 1}>
                      <YStack flexDirection="row" alignItems="center" gap="$2">
                        {!n.read && <Badge label="New" variant="brand" size="sm" />}
                        <Text variant="caption" color="muted">
                          {TYPE_LABELS[n.type] ?? 'Update'} · {new Date(n.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </Text>
                      </YStack>
                      <Text weight="600">{n.title}</Text>
                      <Text color="$muted">{n.body}</Text>
                    </YStack>
                  </Card>
                ))
              )}
            </>
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
