import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Badge,
  Button,
  Input,
  Header,
  EmptyState,
  Sheet,
  Skeleton,
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import {
  Search,
  Plus,
  Clock,
  MessageSquare,
  Phone,
  ChevronRight,
  Ticket,
  Crown,
  Sparkles,
} from '@tamagui/lucide-icons';

type Tier = 'Premium' | 'Elite' | 'Standard';
type MemberStatus = 'active' | 'frozen' | 'lapsed';
type Priority = 'low' | 'medium' | 'high' | 'critical';

type Category = 'billing' | 'access' | 'class' | 'general';

interface Member {
  id: string;
  name: string;
  initials: string;
  tier: Tier;
  status: MemberStatus;
  lastVisit: string;
  visits: number;
}

interface Ticket {
  id: string;
  ticketCode: string;
  memberName: string;
  memberInitials: string;
  subject: string;
  status: 'open' | 'in_progress' | 'waiting' | 'resolved';
  priority: Priority;
  category: Category;
  timeAgo: string;
}

function getInitials(name?: string | null): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

function formatRelative(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return `${Math.max(1, Math.floor(d / 1000))}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} min ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

const TICKET_CODE_PREFIX = 'QNX';
const CATEGORIES: Category[] = ['access', 'class', 'billing', 'general'];
const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];

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
        m.id.toLowerCase().includes(q) ||
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
            accessibilityLabel="Create new support ticket"
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
            accessibilityLabel="Search members"
          />
        </YStack>

        {/* Search results */}
        {query.trim().length > 0 && (
          <YStack paddingHorizontal="$4" marginTop="$3">
            <Text variant="label" color="muted" marginBottom="$2">
              {ALL_MEMBERS.filter(
                (m) =>
                  m.name.toLowerCase().includes(query.toLowerCase()) ||
                  m.id.toLowerCase().includes(query.toLowerCase())
              ).length}{' '}
              result(s)
            </Text>
            <YStack gap="$2">
              {ALL_MEMBERS.filter(
                (m) =>
                  m.name.toLowerCase().includes(query.toLowerCase()) ||
                  m.id.toLowerCase().includes(query.toLowerCase())
              )
                .slice(0, 5)
                .map((m) => (
                  <MemberRow key={m.id} member={m} />
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
              icon={<Ticket size={32} color="$textMuted" />}
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
      <Sheet open={composeOpen} onOpenChange={setComposeOpen}>
        <YStack gap="$3">
          <YStack gap="$0.5" marginBottom="$1">
            <Text variant="h2">New support ticket</Text>
            <Text variant="bodySmall" color="secondary">
              Logged for operations follow-up
            </Text>
          </YStack>

          {/* Member picker */}
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Member
            </Text>
            <Input
              placeholder="Search member name or ID"
              value={selectedMember?.name ?? memberQuery}
              onChangeText={(v) => {
                setMemberQuery(v);
                setSelectedMember(null);
              }}
              leftIcon={<Search size={16} color="$textMuted" />}
              accessibilityLabel="Member name or ID"
            />
            {memberQuery.length > 0 && !selectedMember && (
              <YStack gap="$1" marginTop="$1">
                {filtered.slice(0, 4).map((m) => (
                  <Card
                    key={m.id}
                    variant="outlined"
                    padding="sm"
                    onPress={() => {
                      setSelectedMember(m);
                      setMemberQuery('');
                    }}
                  >
                    <XStack alignItems="center" gap="$2">
                      <Avatar name={m.name} size="sm" fallbackColor="$brand" />
                      <YStack flex={1}>
                        <Text variant="label" numberOfLines={1}>{m.name}</Text>
                        <Text variant="caption" color="muted">
                          {m.tier} • {m.visits} visits
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                ))}
                {filtered.length === 0 && (
                  <Text variant="caption" color="muted">No matches — leave blank for walk-in.</Text>
                )}
              </YStack>
            )}
            {selectedMember && (
              <XStack alignItems="center" gap="$2" marginTop="$1">
                <Badge label={`Selected: ${selectedMember.name}`} variant="info" />
                <Button
                  label="Clear"
                  variant="ghost"
                  size="sm"
                  onPress={() => setSelectedMember(null)}
                />
              </XStack>
            )}
          </YStack>

          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Category
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {CATEGORIES.map((c) => {
                const active = category === c;
                return (
                  <Card
                    key={c}
                    variant={active ? 'elevated' : 'outlined'}
                    padding="sm"
                    onPress={() => setCategory(c)}
                    backgroundColor={active ? '$brand50' : undefined}
                    accessibilityLabel={`Category ${c}`}
                  >
                    <Text
                      variant="caption"
                      weight="600"
                      textTransform="capitalize"
                      color={active ? 'brand' : 'primary'}
                    >
                      {c}
                    </Text>
                  </Card>
                );
              })}
            </XStack>
          </YStack>
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Priority
            </Text>
            <XStack gap="$2">
              {PRIORITIES.map((p) => {
                const active = priority === p;
                return (
                  <Card
                    key={p}
                    variant={active ? 'elevated' : 'outlined'}
                    padding="sm"
                    flex={1}
                    onPress={() => setPriority(p)}
                    backgroundColor={
                      active
                        ? p === 'critical'
                          ? '$danger50'
                          : p === 'high'
                          ? '$warning50'
                          : '$brand50'
                        : undefined
                    }
                    accessibilityLabel={`Priority ${p}`}
                  >
                    <Text
                      variant="caption"
                      weight="600"
                      textTransform="capitalize"
                      textAlign="center"
                      color={
                        active
                          ? p === 'critical'
                            ? 'danger'
                            : p === 'high'
                            ? 'warning'
                            : 'brand'
                          : 'primary'
                      }
                    >
                      {p}
                    </Text>
                  </Card>
                );
              })}
            </XStack>
          </YStack>
          <Input
            label="Subject"
            placeholder="Brief description"
            value={subject}
            onChangeText={setSubject}
            accessibilityLabel="Ticket subject"
          />
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Details
            </Text>
            <YStack
              borderWidth={1}
              borderColor="$borderColor"
              borderRadius="$md"
              padding="$3"
              backgroundColor="$surface"
              minHeight={120}
            >
              <textarea
                value={description}
                onChange={(e: any) => setDescription(e.target.value)}
                placeholder="What happened? Any context for the team?"
                style={{
                  width: '100%',
                  minHeight: 100,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 14,
                  color: 'inherit',
                  fontFamily: 'inherit',
                  resize: 'none',
                }}
                aria-label="Ticket details"
              />
            </YStack>
          </YStack>
          <Button
            label="Log ticket"
            variant="primary"
            size="md"
            fullWidth
            onPress={handleSubmit}
            accessibilityLabel="Log new ticket"
          />
        </YStack>
      </Sheet>
    </Screen>
  );
}

function MemberRow({ member }: { member: Member }) {
  const statusVariant: Record<MemberStatus, 'success' | 'info' | 'neutral'> = {
    active: 'success',
    frozen: 'info',
    lapsed: 'neutral',
  };
  const tierIcon =
    member.tier === 'Elite' ? <Crown size={12} color="$brand" /> : <Sparkles size={12} color="$textMuted" />;
  return (
    <Card
      variant="outlined"
      padding="sm"
      accessibilityLabel={`${member.name}, ${member.tier}, last visit ${member.lastVisit}`}
    >
      <XStack alignItems="center" gap="$3">
        <Avatar name={member.name} size="md" fallbackColor="$brand" />
        <YStack flex={1} gap="$0.5">
          <Text variant="label" numberOfLines={1}>
            {member.name}
          </Text>
          <XStack alignItems="center" gap="$1.5">
            {tierIcon}
            <Text variant="caption" color="secondary">
              {member.tier} • {member.visits} visits
            </Text>
          </XStack>
          <Text variant="caption" color="muted">
            Last visit {member.lastVisit}
          </Text>
        </YStack>
        <YStack alignItems="flex-end" gap="$1">
          <Badge label={member.status} variant={statusVariant[member.status]} />
          <XStack gap="$2">
            <YStack
              onPress={() => {}}
              padding="$1.5"
              borderRadius="$full"
              backgroundColor="$surfaceMuted"
              accessibilityLabel={`Message ${member.name}`}
            >
              <MessageSquare size={14} color="$textPrimary" />
            </YStack>
            <YStack
              onPress={() => {}}
              padding="$1.5"
              borderRadius="$full"
              backgroundColor="$surfaceMuted"
              accessibilityLabel={`Call ${member.name}`}
            >
              <Phone size={14} color="$textPrimary" />
            </YStack>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const priorityVariant: Record<Priority, 'success' | 'info' | 'warning' | 'danger'> = {
    low: 'success',
    medium: 'info',
    high: 'warning',
    critical: 'danger',
  };
  const statusLabel: Record<Ticket['status'], string> = {
    open: 'Open',
    in_progress: 'In progress',
    waiting: 'Waiting on member',
    resolved: 'Resolved',
  };
  return (
    <Card
      variant="outlined"
      padding="sm"
      accessibilityLabel={`Ticket ${ticket.ticketCode}, ${ticket.priority} priority, ${statusLabel[ticket.status]}`}
    >
      <XStack alignItems="flex-start" gap="$3">
        <Avatar
          name={ticket.memberName}
          size="md"
          fallbackColor="$info"
        />
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text variant="caption" weight="600" color="brand">
              {ticket.ticketCode}
            </Text>
            <Badge label={ticket.category} variant="neutral" />
            <Badge label={ticket.priority} variant={priorityVariant[ticket.priority]} />
          </XStack>
          <Text variant="label" numberOfLines={2}>
            {ticket.subject}
          </Text>
          <XStack alignItems="center" gap="$2">
            <Text variant="caption" color="muted">
              {ticket.memberName}
            </Text>
            <Text variant="caption" color="muted">
              •
            </Text>
            <XStack alignItems="center" gap="$1">
              <Clock size={12} color="$textMuted" />
              <Text variant="caption" color="muted">
                {ticket.timeAgo}
              </Text>
            </XStack>
          </XStack>
          <XStack alignItems="center" gap="$1" marginTop="$0.5">
            <Ticket size={12} color="$textMuted" />
            <Text variant="caption" color="secondary" weight="500">
              {statusLabel[ticket.status]}
            </Text>
          </XStack>
        </YStack>
        <ChevronRight size={18} color="$textMuted" />
      </XStack>
    </Card>
  );
}
