import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Badge,
  Button,
  Input,
  Header,
  EmptyState,
  Skeleton,
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import { MemberRow, type Member } from '@/components/support/MemberRow';
import { NewTicketSheet, type Category, type Priority } from '@/components/support/NewTicketSheet';
import { TicketRow, type Ticket } from '@/components/support/TicketRow';
import { getInitials, formatRelative } from '@/components/support/format';
import { Search, Plus, Ticket as TicketIcon } from '@tamagui/lucide-icons-2';

const TICKET_CODE_PREFIX = 'QNX';

export default function OpsSupportScreen() {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('general');
  const [priority, setPriority] = useState<Priority>('medium');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Live queue (open + in_progress) from Convex
  const queue = useConvexQuery(api.queries.users.getSupportQueue, { status: 'open' });
  const inProgress = useConvexQuery(api.queries.users.getSupportQueue, { status: 'in_progress' });
  const allTickets = useMemo(() => {
    const a = (queue ?? []) as any[];
    const b = (inProgress ?? []) as any[];
    return [...a, ...b];
  }, [queue, inProgress]);

  const createTicket = useConvexMutation(api.mutations.operations.createSupportTicket);

  // Map Convex tickets → UI shape
  const tickets: Ticket[] = useMemo(() => {
    return allTickets.map((t: any) => {
      const priorityVal = (t.priority ?? 'medium') as Priority;
      const statusVal = (t.status ?? 'open') as Ticket['status'];
      const categoryVal = (t.category ?? 'general') as Category;
      const memberName = t.member?.fullName ?? t.memberName ?? 'Member';
      return {
        id: t._id,
        ticketCode: `${TICKET_CODE_PREFIX}-${t._id.slice(-4).toUpperCase()}`,
        memberName,
        memberInitials: getInitials(memberName),
        subject: t.subject,
        status: statusVal,
        priority: priorityVal,
        category: categoryVal,
        timeAgo: formatRelative(t.createdAt),
      };
    });
  }, [allTickets]);

  // Member directory — in production this would be a paginated Convex
  // query. We use a small embedded mock for the search bar (the
  // full directory lives in the Owner → Members view).
  const ALL_MEMBERS: Member[] = [
    { id: 'm1', name: 'Aisha Al-Mansoori', initials: 'AM', tier: 'Elite', status: 'active', lastVisit: '2 hours ago', visits: 18 },
    { id: 'm2', name: 'Sara Al-Maktoum', initials: 'SM', tier: 'Premium', status: 'active', lastVisit: 'Yesterday', visits: 12 },
    { id: 'm3', name: 'Hala Al-Suwaidi', initials: 'HA', tier: 'Elite', status: 'active', lastVisit: '1 hour ago', visits: 24 },
    { id: 'm4', name: 'Daniel Pereira', initials: 'DP', tier: 'Standard', status: 'frozen', lastVisit: '3 weeks ago', visits: 7 },
    { id: 'm5', name: 'Yusuf Khan', initials: 'YK', tier: 'Premium', status: 'lapsed', lastVisit: '2 months ago', visits: 4 },
    { id: 'm6', name: 'Maryam Al-Falasi', initials: 'MA', tier: 'Premium', status: 'active', lastVisit: '30 min ago', visits: 15 },
  ];

  const filtered = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return [];
    return ALL_MEMBERS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.id ?? "").toLowerCase().includes(q) ||
        m.tier.toLowerCase().includes(q)
    );
  }, [memberQuery]);

  const openCount = tickets.filter((t) => t.status !== 'waiting' && t.status !== 'resolved').length;
  const criticalCount = tickets.filter((t) => t.priority === 'critical').length;

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.warning('Subject and details are required');
      return;
    }
    try {
      await createTicket({
        memberId: selectedMember ? (selectedMember.id as any) : undefined,
        memberName: selectedMember?.name,
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      });
      toast.success('Ticket logged');
      setComposeOpen(false);
      setSubject('');
      setDescription('');
      setMemberQuery('');
      setSelectedMember(null);
      setCategory('general');
      setPriority('medium');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to log ticket');
    }
  };

  return (
    <Screen padded={false}>
      <Header
        title="Member support"
        subtitle={`${openCount} open • ${criticalCount} critical`}
        right={
          <Button
            label="New ticket"
            variant="primary"
            size="sm"
            icon={<Plus size={16} color="$textOnBrand" />}
            onPress={() => setComposeOpen(true)}
            aria-label="Create new support ticket"
          />
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <YStack paddingHorizontal="$4" marginTop="$2">
          <Input
            placeholder="Search members by name, ID, or tier"
            value={query}
            onChangeText={setQuery}
            leftIcon={<Search size={18} color="$textMuted" />}
            aria-label="Search members"
          />
        </YStack>

        {/* Search results */}
        {query.trim().length > 0 && (
          <YStack paddingHorizontal="$4" marginTop="$3">
            <Text variant="label" color="muted" marginBottom="$2">
              {ALL_MEMBERS.filter(
                (m) =>
                  m.name.toLowerCase().includes(query.toLowerCase()) ||
                  (m.id ?? "").toLowerCase().includes(query.toLowerCase())
              ).length}{' '}
              result(s)
            </Text>
            <YStack gap="$2">
              {ALL_MEMBERS.filter(
                (m) =>
                  m.name.toLowerCase().includes(query.toLowerCase()) ||
                  (m.id ?? "").toLowerCase().includes(query.toLowerCase())
              )
                .slice(0, 5)
                .map((m) => (
                  <MemberRow key={m.id ?? m.name} member={m} />
                ))}
            </YStack>
          </YStack>
        )}

        {/* Support queue */}
        <YStack paddingHorizontal="$4" marginTop={query.trim() ? '$5' : '$3'}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <YStack>
              <Text variant="h4">Support queue</Text>
              <Text variant="caption" color="muted">
                Sorted by recency
              </Text>
            </YStack>
            <XStack gap="$2">
              <Badge label={`${openCount} open`} variant="info" />
              {criticalCount > 0 && (
                <Badge label={`${criticalCount} critical`} variant="danger" />
              )}
            </XStack>
          </XStack>

          {queue === undefined ? (
            <YStack gap="$2">
              <Skeleton height={88} borderRadius={12} />
              <Skeleton height={88} borderRadius={12} />
            </YStack>
          ) : queue === null ? (
            <ErrorState onRetry={() => {}} />
          ) : tickets.length === 0 ? (
            <EmptyState
              title="Queue is clear"
              message="No open or in-progress tickets right now. Log a new ticket if a member needs help."
              icon={<TicketIcon size={32} color="$textMuted" />}
            />
          ) : (
            <YStack gap="$2">
              {tickets.map((t) => (
                <TicketRow key={t.id} ticket={t} />
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>

      {/* New ticket sheet */}
      <NewTicketSheet
        open={composeOpen}
        onOpenChange={setComposeOpen}
        memberQuery={memberQuery}
        setMemberQuery={setMemberQuery}
        selectedMember={selectedMember}
        setSelectedMember={setSelectedMember}
        filtered={filtered}
        category={category}
        setCategory={setCategory}
        priority={priority}
        setPriority={setPriority}
        subject={subject}
        setSubject={setSubject}
        description={description}
        setDescription={setDescription}
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}

