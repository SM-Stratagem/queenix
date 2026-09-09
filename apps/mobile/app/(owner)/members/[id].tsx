import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Screen,
  Header,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Chip,
  Divider,
  useToast,
} from '@queenix/ui';
import {
  MoreVertical,
  MessageCircle,
  Snowflake,
  CreditCard,
  Plus,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Car,
  Activity,
  TrendingUp,
  CalendarCheck,
  Dumbbell,
  FileText,
  Edit3,
} from '@tamagui/lucide-icons';
import { Pressable } from 'react-native';
import { formatDate, formatDateTime, formatCurrency } from '@queenix/types';

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

  // Mock data — in production: Convex query by id
  const member = {
    id: params.id ?? '1',
    name: 'Layla Al-Mansoori',
    email: 'layla.mansoori@gmail.com',
    phone: '+971 50 123 4567',
    tier: 'Premium',
    status: 'active' as const,
    joinedAt: 'Mar 2024',
    lastVisit: 'Today, 18:24',
    dob: 'Sep 14, 1992',
    occupation: 'Marketing Director, Dubai Media City',
    emergency: {
      name: 'Khalid Al-Mansoori',
      relation: 'Husband',
      phone: '+971 50 765 4321',
    },
    vehicles: [
      { plate: 'D 84721', color: 'White', model: 'Toyota Land Cruiser' },
      { plate: 'D 22019', color: 'Black', model: 'Lexus RX350' },
    ],
  };

  const overview = {
    plan: 'Premium Annual',
    monthlyValue: 89900,
    paidThrough: Date.now() + 23 * 24 * 60 * 60 * 1000,
    classesRemaining: 18,
    ptRemaining: 4,
    visitsThisMonth: 12,
    streak: 6,
  };

  const visits = [
    { id: 'v1', when: Date.now() - 2 * 60 * 60 * 1000, location: 'Main entrance' },
    { id: 'v2', when: Date.now() - 24 * 60 * 60 * 1000, location: 'Main entrance' },
    { id: 'v3', when: Date.now() - 2 * 24 * 60 * 60 * 1000, location: 'Studio 2' },
    { id: 'v4', when: Date.now() - 3 * 24 * 60 * 60 * 1000, location: 'Main entrance' },
    { id: 'v5', when: Date.now() - 4 * 24 * 60 * 60 * 1000, location: 'Main entrance' },
    { id: 'v6', when: Date.now() - 5 * 24 * 60 * 60 * 1000, location: 'PT room' },
    { id: 'v7', when: Date.now() - 6 * 24 * 60 * 60 * 1000, location: 'Main entrance' },
    { id: 'v8', when: Date.now() - 7 * 24 * 60 * 60 * 1000, location: 'Studio 1' },
  ];

  const classes = [
    { id: 'c1', name: 'Power Yoga', trainer: 'Maya Patel', when: 'Tomorrow, 07:00', room: 'Studio 2' },
    { id: 'c2', name: 'HIIT Burn', trainer: 'Sara Ahmed', when: 'Thu, 18:00', room: 'Studio 1' },
    { id: 'c3', name: 'Reformer Pilates', trainer: 'Noora Al-Suwaidi', when: 'Fri, 09:00', room: 'Reformer Room' },
    { id: 'c4', name: 'Barre Sculpt', trainer: 'Layla Hassan', when: 'Sat, 10:00', room: 'Studio 2' },
    { id: 'c5', name: 'Power Yoga', trainer: 'Maya Patel', when: 'Last Tue, 07:00', room: 'Studio 2' },
    { id: 'c6', name: 'HIIT Burn', trainer: 'Sara Ahmed', when: 'Last Sun, 18:00', room: 'Studio 1' },
  ];

  const ptSessions = [
    { id: 'p1', trainer: 'Maya Patel', focus: 'Lower body strength', when: 'Tomorrow, 06:00', status: 'upcoming' as const },
    { id: 'p2', trainer: 'Maya Patel', focus: 'Upper body push', when: 'Yesterday, 06:00', status: 'completed' as const },
    { id: 'p3', trainer: 'Maya Patel', focus: 'Glute activation', when: '3 days ago, 06:00', status: 'completed' as const },
    { id: 'p4', trainer: 'Maya Patel', focus: 'Mobility + core', when: '5 days ago, 06:00', status: 'completed' as const },
    { id: 'p5', trainer: 'Maya Patel', focus: 'Full body', when: 'Last week, 06:00', status: 'completed' as const },
    { id: 'p6', trainer: 'Maya Patel', focus: 'Assessment', when: '2 weeks ago, 06:00', status: 'completed' as const },
  ];

  const payments = [
    { id: 'pay1', label: 'Annual plan — premium', amount: 1078800, status: 'paid' as const, date: Date.now() - 7 * 24 * 60 * 60 * 1000, method: 'Visa •• 4321' },
    { id: 'pay2', label: 'PT pack — 10 sessions', amount: 350000, status: 'paid' as const, date: Date.now() - 14 * 24 * 60 * 60 * 1000, method: 'Apple Pay' },
    { id: 'pay3', label: 'Class pack — 20', amount: 160000, status: 'paid' as const, date: Date.now() - 21 * 24 * 60 * 60 * 1000, method: 'Visa •• 4321' },
    { id: 'pay4', label: 'Smoothie bar', amount: 4500, status: 'paid' as const, date: Date.now() - 5 * 24 * 60 * 60 * 1000, method: 'Wallet' },
    { id: 'pay5', label: 'PT session — single', amount: 38000, status: 'paid' as const, date: Date.now() - 9 * 24 * 60 * 60 * 1000, method: 'Wallet' },
    { id: 'pay6', label: 'Annual plan — premium', amount: 1078800, status: 'paid' as const, date: Date.now() - 365 * 24 * 60 * 60 * 1000, method: 'Visa •• 4321' },
    { id: 'pay7', label: 'Personal training', amount: 35000, status: 'refunded' as const, date: Date.now() - 12 * 24 * 60 * 60 * 1000, method: 'Wallet' },
  ];

  const notes = [
    { id: 'n1', author: 'Operations', when: '2 days ago', body: 'Requested early-morning classes (6am) for Q4. Prefers Studio 2.' },
    { id: 'n2', author: 'Trainer — Maya', when: '5 days ago', body: 'Hit new squat PR (80kg). Recovery looks great, no joint complaints.' },
    { id: 'n3', author: 'Front desk', when: '1 week ago', body: 'Lost her access card on 02 Sep. Replacement issued (#QNX-2841).' },
    { id: 'n4', author: 'Operations', when: '2 weeks ago', body: 'Referred sister Amna Al-Mansoori — credited 500 loyalty points.' },
    { id: 'n5', author: 'Trainer — Maya', when: '3 weeks ago', body: 'Goal updated: focus on glute strength + posture correction.' },
    { id: 'n6', author: 'Owner', when: '1 month ago', body: 'VIP — invite to members-only retreat in Nov.' },
  ];

  return (
    <Screen padded={false}>
      <Header
        showBack
        onBack={() => router.back()}
        title="Member"
        right={
          <Pressable
            onPress={() => toast.show('Menu coming soon', 'info')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <MoreVertical size={22} color="$textPrimary" />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile header */}
        <YStack paddingHorizontal="$4" paddingTop="$3">
          <Card variant="elevated" padding="lg">
            <XStack gap="$3" alignItems="flex-start">
              <Avatar name={member.name} size="xl" />
              <YStack flex={1} gap="$1.5">
                <Text variant="h2" numberOfLines={1}>{member.name}</Text>
                <XStack gap="$2" flexWrap="wrap">
                  <Badge label={member.tier} variant="brand" />
                  <Badge label="Active" variant="success" />
                </XStack>
                <XStack gap="$3" marginTop="$1">
                  <XStack alignItems="center" gap="$1.5">
                    <Calendar size={14} color="$textMuted" />
                    <Text variant="caption" color="muted">Joined {member.joinedAt}</Text>
                  </XStack>
                  <XStack alignItems="center" gap="$1.5">
                    <Activity size={14} color="$textMuted" />
                    <Text variant="caption" color="muted">Last {member.lastVisit}</Text>
                  </XStack>
                </XStack>
              </YStack>
            </XStack>
          </Card>
        </YStack>

        {/* Quick actions */}
        <XStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Button
            label="Message"
            variant="outline"
            size="sm"
            icon={<MessageCircle size={16} color="$brand" />}
            onPress={() => toast.show('Opening chat…', 'info')}
            accessibilityLabel="Send message"
            flex={1}
          />
          <Button
            label="Freeze"
            variant="outline"
            size="sm"
            icon={<Snowflake size={16} color="$brand" />}
            onPress={() => toast.show('Freeze flow coming soon', 'info')}
            accessibilityLabel="Freeze membership"
            flex={1}
          />
          <Button
            label="Payment"
            variant="outline"
            size="sm"
            icon={<CreditCard size={16} color="$brand" />}
            onPress={() => setTab('payments')}
            accessibilityLabel="View payment"
            flex={1}
          />
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

        {/* Tab content */}
        {tab === 'overview' && (
          <YStack paddingHorizontal="$4" gap="$3">
            <Section title="Contact">
              <KeyValue icon={<Mail size={16} color="$textSecondary" />} label="Email" value={member.email} />
              <Divider />
              <KeyValue icon={<Phone size={16} color="$textSecondary" />} label="Phone" value={member.phone} />
              <Divider />
              <KeyValue icon={<Calendar size={16} color="$textSecondary" />} label="DOB" value={member.dob} />
              <Divider />
              <KeyValue icon={<FileText size={16} color="$textSecondary" />} label="Occupation" value={member.occupation} />
            </Section>

            <Section title="Emergency contact">
              <KeyValue icon={<AlertCircle size={16} color="$danger500" />} label="Name" value={`${member.emergency.name} (${member.emergency.relation})`} />
              <Divider />
              <KeyValue icon={<Phone size={16} color="$textSecondary" />} label="Phone" value={member.emergency.phone} />
            </Section>

            <Section title="Vehicles on file">
              {member.vehicles.map((v, i) => (
                <YStack key={v.plate}>
                  <XStack alignItems="center" gap="$2" paddingVertical="$2.5">
                    <Car size={16} color="$textSecondary" />
                    <YStack flex={1}>
                      <Text variant="bodySmall" weight="500">{v.model}</Text>
                      <Text variant="caption" color="muted">{v.color} • {v.plate}</Text>
                    </YStack>
                  </XStack>
                  {i < member.vehicles.length - 1 && <Divider />}
                </YStack>
              ))}
            </Section>

            <Section title="Membership summary">
              <KeyValue icon={<TrendingUp size={16} color="$brand" />} label="Plan" value={overview.plan} />
              <Divider />
              <KeyValue icon={<CalendarCheck size={16} color="$textSecondary" />} label="Paid through" value={formatDate(overview.paidThrough)} />
              <Divider />
              <KeyValue icon={<Dumbbell size={16} color="$textSecondary" />} label="Classes / PT left" value={`${overview.classesRemaining} / ${overview.ptRemaining}`} />
            </Section>
          </YStack>
        )}

        {tab === 'activity' && (
          <YStack paddingHorizontal="$4" gap="$3">
            <XStack gap="$3">
              <Stat label="Visits / mo" value={overview.visitsThisMonth.toString()} />
              <Stat label="Streak" value={`${overview.streak} days`} />
              <Stat label="PT / mo" value="6" />
            </XStack>

            <Section title="Recent visits">
              {visits.map((v) => (
                <XStack key={v.id} alignItems="center" gap="$3" paddingVertical="$2.5">
                  <YStack width={8} height={8} borderRadius="$full" backgroundColor="$success500" />
                  <YStack flex={1}>
                    <Text variant="bodySmall" weight="500">{v.location}</Text>
                    <Text variant="caption" color="muted">{formatDateTime(v.when)}</Text>
                  </YStack>
                </XStack>
              ))}
            </Section>

            <Section title="Recent classes">
              {classes.map((c) => (
                <XStack key={c.id} alignItems="center" gap="$3" paddingVertical="$2.5">
                  <YStack
                    backgroundColor="$brand50"
                    padding="$2"
                    borderRadius="$md"
                    alignItems="center"
                    justifyContent="center"
                    width={36}
                    height={36}
                  >
                    <Activity size={16} color="$brand" />
                  </YStack>
                  <YStack flex={1}>
                    <Text variant="bodySmall" weight="500">{c.name}</Text>
                    <Text variant="caption" color="muted">with {c.trainer} • {c.room}</Text>
                  </YStack>
                  <Text variant="caption" color="muted">{c.when}</Text>
                </XStack>
              ))}
            </Section>

            <Section title="PT sessions">
              {ptSessions.map((p) => (
                <XStack key={p.id} alignItems="center" gap="$3" paddingVertical="$2.5">
                  <YStack
                    backgroundColor={p.status === 'upcoming' ? '$brand' : '$surfaceMuted'}
                    padding="$2"
                    borderRadius="$md"
                    alignItems="center"
                    justifyContent="center"
                    width={36}
                    height={36}
                  >
                    <Dumbbell size={16} color={p.status === 'upcoming' ? '$textOnBrand' : '$textSecondary'} />
                  </YStack>
                  <YStack flex={1}>
                    <Text variant="bodySmall" weight="500">{p.focus}</Text>
                    <Text variant="caption" color="muted">{p.trainer} • {p.when}</Text>
                  </YStack>
                  <Badge
                    label={p.status === 'upcoming' ? 'Upcoming' : 'Done'}
                    variant={p.status === 'upcoming' ? 'brand' : 'success'}
                    size="sm"
                  />
                </XStack>
              ))}
            </Section>
          </YStack>
        )}

        {tab === 'membership' && (
          <YStack paddingHorizontal="$4" gap="$3">
            <Card variant="elevated" padding="lg">
              <YStack gap="$2">
                <XStack justifyContent="space-between" alignItems="flex-start">
                  <YStack flex={1}>
                    <Text variant="caption" color="muted" textTransform="uppercase">Current plan</Text>
                    <Text variant="h3" marginTop="$1">{overview.plan}</Text>
                  </YStack>
                  <Badge label={member.tier} variant="brand" />
                </XStack>
                <YStack paddingVertical="$2"><Divider /></YStack>
                <XStack gap="$4">
                  <YStack flex={1}>
                    <Text variant="caption" color="muted">Monthly</Text>
                    <Text variant="body" weight="600">{formatCurrency(overview.monthlyValue)}</Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text variant="caption" color="muted">Renews</Text>
                    <Text variant="body" weight="600">{formatDate(overview.paidThrough)}</Text>
                  </YStack>
                </XStack>
              </YStack>
            </Card>

            <Section title="Remaining this cycle">
              <KeyValue label="Group classes" value={`${overview.classesRemaining} of 24`} />
              <Divider />
              <KeyValue label="PT sessions" value={`${overview.ptRemaining} of 12`} />
              <Divider />
              <KeyValue label="Guest passes" value="2 of 4" />
            </Section>

            <XStack gap="$2">
              <Button
                label="Renew early"
                variant="primary"
                onPress={() => toast.show('Renewal flow', 'info')}
                accessibilityLabel="Renew membership"
                flex={1}
              />
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => toast.show('Cancellation requires confirm', 'warning')}
                accessibilityLabel="Cancel membership"
                flex={1}
              />
            </XStack>
          </YStack>
        )}

        {tab === 'payments' && (
          <YStack paddingHorizontal="$4" gap="$2">
            <XStack gap="$3" marginBottom="$1">
              <Stat label="Lifetime" value={formatCurrency(3828400)} />
              <Stat label="Last paid" value={`${formatCurrency(1078800)}`} />
            </XStack>
            {payments.map((p) => (
              <Card key={p.id} variant="outlined" padding="sm">
                <XStack alignItems="center" gap="$3">
                  <YStack
                    backgroundColor={p.status === 'paid' ? '$success50' : '$warning50'}
                    padding="$2"
                    borderRadius="$md"
                    width={40}
                    height={40}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <CreditCard size={18} color={p.status === 'paid' ? '$success500' : '$warning500'} />
                  </YStack>
                  <YStack flex={1}>
                    <Text variant="bodySmall" weight="500">{p.label}</Text>
                    <Text variant="caption" color="muted">{formatDate(p.date)} • {p.method}</Text>
                  </YStack>
                  <YStack alignItems="flex-end" gap="$1">
                    <Text variant="bodySmall" weight="600">{formatCurrency(p.amount)}</Text>
                    <Badge
                      label={p.status === 'paid' ? 'Paid' : 'Refunded'}
                      variant={p.status === 'paid' ? 'success' : 'warning'}
                      size="sm"
                    />
                  </YStack>
                </XStack>
              </Card>
            ))}
          </YStack>
        )}

        {tab === 'notes' && (
          <YStack paddingHorizontal="$4" gap="$3">
            <Button
              label="Add note"
              variant="primary"
              icon={<Plus size={16} color="$textOnBrand" />}
              onPress={() => toast.show('Note composer', 'info')}
              accessibilityLabel="Add internal note"
            />
            {notes.map((n) => (
              <Card key={n.id} variant="outlined" padding="sm">
                <XStack alignItems="flex-start" gap="$2">
                  <Edit3 size={16} color="$textMuted" />
                  <YStack flex={1} gap="$1">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text variant="bodySmall" weight="600">{n.author}</Text>
                      <Text variant="caption" color="muted">{n.when}</Text>
                    </XStack>
                    <Text variant="bodySmall" color="secondary">{n.body}</Text>
                  </YStack>
                </XStack>
              </Card>
            ))}
          </YStack>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <YStack gap="$2">
      <Text variant="h4">{title}</Text>
      <Card variant="outlined" padding="sm">
        <YStack>{children}</YStack>
      </Card>
    </YStack>
  );
}

function KeyValue({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <XStack alignItems="center" gap="$2" paddingVertical="$2.5">
      {icon}
      <Text variant="bodySmall" color="secondary" flex={1}>{label}</Text>
      <Text variant="bodySmall" weight="500" textAlign="right" flex={1.5} numberOfLines={1}>{value}</Text>
    </XStack>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="outlined" padding="sm" flex={1}>
      <YStack gap="$0.5">
        <Text variant="caption" color="muted">{label}</Text>
        <Text variant="h4">{value}</Text>
      </YStack>
    </Card>
  );
}
