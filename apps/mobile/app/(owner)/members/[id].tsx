import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  Header,
  Chip,
  Skeleton,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import { Stat } from '@/components/member-detail/primitives';
import { formatCents } from '@/components/member-detail/format';
import {
  OverviewTab,
  ActivityTab,
  MembershipTab,
  PaymentsTab,
  NotesTab,
} from '@/components/member-detail/tabs';
import { FreezeSheet } from '@/components/member-detail/FreezeSheet';
import { MemberProfileCard } from '@/components/member-detail/ProfileCard';
import { Linking } from 'react-native';

type Tab = 'overview' | 'activity' | 'membership' | 'payments' | 'notes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'activity', label: 'Activity' },
  { key: 'membership', label: 'Membership' },
  { key: 'payments', label: 'Payments' },
  { key: 'notes', label: 'Notes' },
];

export default function OwnerMemberDetail() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeDays, setFreezeDays] = useState('30');
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeBusy, setFreezeBusy] = useState(false);
  const freezeMembership = useConvexMutation(api.mutations.membershipAdmin.freezeAnyMembership);
  const unfreezeMembership = useConvexMutation(api.mutations.membershipAdmin.unfreezeAnyMembership);

  const memberId = (params.id as string) || '';
  const detailQuery = useConvexQuery(
    api.queries.users.getOwnerMemberDetail,
    memberId ? ({ memberId: memberId as any } as any) : 'skip'
  );
  const isLoading = detailQuery === undefined;

  if (isLoading) {
    return (
      <Screen padded={false}>
        <Header showBack onBack={() => router.back()} title="Member" />
        <YStack padding="$4" gap="$3">
          <Skeleton height={140} />
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </YStack>
      </Screen>
    );
  }

  if (!detailQuery || !detailQuery.member) {
    return (
      <Screen padded={false}>
        <Header showBack onBack={() => router.back()} title="Member" />
        <YStack padding="$4">
          <EmptyState
            title="Member not found"
            message="This member may have been removed."
          />
        </YStack>
      </Screen>
    );
  }

  const {
    member,
    profile,
    activeMembership,
    memberships,
    payments,
    visits,
    notes,
  } = detailQuery;

  const fullName = member.fullName ?? 'Member';
  const totalSpentCents = payments
    .filter((p: any) => p.status === 'succeeded')
    .reduce((acc: number, p: any) => acc + p.amountCents, 0);
  const lastVisit = visits[0];
  const lastVisitLabel = lastVisit
    ? new Date(lastVisit.timestamp).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  const onWhatsApp = () => {
    const digits = (member.phone ?? '').replace(/\D/g, '');
    if (!digits) {
      toast.show('No phone number on file', 'warning');
      return;
    }
    Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${fullName}! This is Queenix Gym — how can we help?`)}`);
  };

  const onUnfreeze = async () => {
    if (!activeMembership) return;
    try {
      await unfreezeMembership({ membershipId: activeMembership._id as any });
      toast.show('Membership reactivated', 'success');
    } catch (err: any) {
      toast.show(err?.data?.message ?? err?.message ?? 'Could not unfreeze', 'error');
    }
  };

  const onConfirmFreeze = async () => {
    const days = Math.round(Number(freezeDays));
    if (!activeMembership || !Number.isFinite(days) || days <= 0) {
      toast.show('Enter a positive number of days', 'warning');
      return;
    }
    setFreezeBusy(true);
    try {
      await freezeMembership({
        membershipId: activeMembership._id as any,
        days,
        reason: freezeReason.trim() || undefined,
      });
      toast.show(`Frozen for ${days} days`, 'success');
      setFreezeOpen(false);
    } catch (err: any) {
      toast.show(err?.data?.message ?? err?.message ?? 'Could not freeze', 'error');
    } finally {
      setFreezeBusy(false);
    }
  };

  return (
    <Screen padded={false}>
      <Header
        showBack
        onBack={() => router.back()}
        title="Member"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile header */}
        <YStack paddingHorizontal="$4" paddingTop="$3">
          <MemberProfileCard
            fullName={fullName}
            createdAt={member.createdAt}
            activeMembership={activeMembership}
            onWhatsApp={onWhatsApp}
            onUnfreeze={onUnfreeze}
            onFreeze={() => setFreezeOpen(true)}
          />
        </YStack>

        {/* Quick stats */}
        <XStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Stat label="Visits (30d)" value={visits.length.toString()} flex={1} />
          <Stat label="Total spent" value={formatCents(totalSpentCents)} flex={1} />
          <Stat label="Last visit" value={lastVisitLabel} flex={1} />
        </XStack>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 12 }}
        >
          {TABS.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              selected={tab === t.key}
              onPress={() => setTab(t.key)}
            />
          ))}
        </ScrollView>

        {tab === 'overview' && (
          <OverviewTab member={member} profile={profile} />
        )}

        {tab === 'activity' && (
          <ActivityTab visits={visits} />
        )}

        {tab === 'membership' && (
          <MembershipTab memberships={memberships} />
        )}

        {tab === 'payments' && <PaymentsTab payments={payments} />}

        {tab === 'notes' && <NotesTab notes={notes} />}
      </ScrollView>

      <FreezeSheet
        open={freezeOpen}
        onOpenChange={setFreezeOpen}
        activeMembership={activeMembership}
        days={freezeDays}
        setDays={setFreezeDays}
        reason={freezeReason}
        setReason={setFreezeReason}
        busy={freezeBusy}
        onConfirm={onConfirmFreeze}
      />
    </Screen>
  );
}


export { ScreenError as ErrorBoundary } from '@/components/common/ScreenError';
