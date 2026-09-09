import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
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
} from '@queenix/ui';
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
  status: 'open' | 'in_progress' | 'waiting';
  priority: Priority;
  category: 'billing' | 'access' | 'class' | 'general';
  timeAgo: string;
}

const MEMBERS: Member[] = [
  { id: 'm1', name: 'Aisha Al-Mansoori', initials: 'AM', tier: 'Elite', status: 'active', lastVisit: '2 hours ago', visits: 18 },
  { id: 'm2', name: 'Sara Al-Maktoum', initials: 'SM', tier: 'Premium', status: 'active', lastVisit: 'Yesterday', visits: 12 },
  { id: 'm3', name: 'Hala Al-Suwaidi', initials: 'HA', tier: 'Elite', status: 'active', lastVisit: '1 hour ago', visits: 24 },
  { id: 'm4', name: 'Daniel Pereira', initials: 'DP', tier: 'Standard', status: 'frozen', lastVisit: '3 weeks ago', visits: 7 },
  { id: 'm5', name: 'Yusuf Khan', initials: 'YK', tier: 'Premium', status: 'lapsed', lastVisit: '2 months ago', visits: 4 },
  { id: 'm6', name: 'Maryam Al-Falasi', initials: 'MA', tier: 'Premium', status: 'active', lastVisit: '30 min ago', visits: 15 },
];

const TICKETS: Ticket[] = [
  { id: 't1', ticketCode: 'QNX-4921', memberName: 'Priya Sharma', memberInitials: 'PS', subject: 'Cannot book HIIT 45 — slot shows full', status: 'open', priority: 'high', category: 'class', timeAgo: '4 min ago' },
  { id: 't2', ticketCode: 'QNX-4920', memberName: 'James Wilson', memberInitials: 'JW', subject: 'Locker #87 lock malfunction', status: 'in_progress', priority: 'medium', category: 'general', timeAgo: '12 min ago' },
  { id: 't3', ticketCode: 'QNX-4919', memberName: 'Fatima Al-Zahra', memberInitials: 'FZ', subject: 'Refund for cancelled reformer class', status: 'waiting', priority: 'medium', category: 'billing', timeAgo: '28 min ago' },
  { id: 't4', ticketCode: 'QNX-4918', memberName: 'Mohammed Ali', memberInitials: 'MA', subject: 'Door access denied despite active plan', status: 'open', priority: 'critical', category: 'access', timeAgo: '1 hour ago' },
  { id: 't5', ticketCode: 'QNX-4917', memberName: 'Noura Al-Marri', memberInitials: 'NM', subject: 'Guest pass — bring spouse tomorrow', status: 'in_progress', priority: 'low', category: 'general', timeAgo: '2 hours ago' },
  { id: 't6', ticketCode: 'QNX-4916', memberName: 'Carlos Mendoza', memberInitials: 'CM', subject: 'Update billing card on file', status: 'open', priority: 'low', category: 'billing', timeAgo: '3 hours ago' },
];

export default function OpsSupportScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return MEMBERS.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.tier.toLowerCase().includes(q)
    );
  }, [query]);

  const openCount = TICKETS.filter((t) => t.status !== 'waiting').length;
  const criticalCount = TICKETS.filter((t) => t.priority === 'critical').length;

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
              {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </Text>
            {filtered.length === 0 ? (
              <EmptyState
                title="No members found"
                message={`No one matches "${query}". Try a name, member ID, or tier.`}
                icon={<Search size={32} color="$textMuted" />}
              />
            ) : (
              <YStack gap="$2">
                {filtered.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </YStack>
            )}
          </YStack>
        )}

        {/* Support queue */}
        <YStack paddingHorizontal="$4" marginTop={query.trim() ? '$5' : '$3'}>
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <YStack>
              <Text variant="h4">Support queue</Text>
              <Text variant="caption" color="muted">
                Sorted by priority
              </Text>
            </YStack>
            <XStack gap="$2">
              <Badge label={`${openCount} open`} variant="info" />
              {criticalCount > 0 && (
                <Badge label={`${criticalCount} critical`} variant="danger" />
              )}
            </XStack>
          </XStack>
          <YStack gap="$2">
            {TICKETS.map((t) => (
              <TicketRow key={t.id} ticket={t} />
            ))}
          </YStack>
        </YStack>
      </ScrollView>

      {/* New ticket sheet */}
      <Sheet
        open={composeOpen}
        onOpenChange={setComposeOpen}
      >
        <YStack gap="$3">
          <YStack gap="$0.5" marginBottom="$1">
            <Text variant="h2">New support ticket</Text>
            <Text variant="bodySmall" color="secondary">
              Logged for operations follow-up
            </Text>
          </YStack>
          <Input
            label="Member"
            placeholder="Search member name or ID"
            accessibilityLabel="Member name or ID"
          />
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Category
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {(['access', 'class', 'billing', 'general'] as const).map((c) => (
                <Card
                  key={c}
                  variant="outlined"
                  padding="sm"
                  onPress={() => {}}
                  accessibilityLabel={`Category ${c}`}
                >
                  <Text variant="caption" weight="600" textTransform="capitalize">
                    {c}
                  </Text>
                </Card>
              ))}
            </XStack>
          </YStack>
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Priority
            </Text>
            <XStack gap="$2">
              {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
                <Card
                  key={p}
                  variant="outlined"
                  padding="sm"
                  flex={1}
                  onPress={() => {}}
                  accessibilityLabel={`Priority ${p}`}
                >
                  <Text variant="caption" weight="600" textTransform="capitalize" textAlign="center">
                    {p}
                  </Text>
                </Card>
              ))}
            </XStack>
          </YStack>
          <Input
            label="Subject"
            placeholder="Brief description"
            accessibilityLabel="Ticket subject"
          />
          <Input
            label="Details"
            placeholder="What happened? Any context for the team?"
            multiline
            numberOfLines={4}
            accessibilityLabel="Ticket details"
          />
          <Button
            label="Log ticket"
            variant="primary"
            size="md"
            fullWidth
            onPress={() => setComposeOpen(false)}
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
