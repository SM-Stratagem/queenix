import React, { useState } from 'react';
import { YStack, XStack, ScrollView, Progress as TProgress } from 'tamagui';
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
  MessageCircle,
  CalendarPlus,
  Activity,
  Target,
  Heart,
  Mail,
  Phone,
  Calendar,
  Dumbbell,
  Plus,
  CheckCircle2,
  Clock,
  TrendingUp,
  Ruler,
  FileText,
  Send,
} from '@tamagui/lucide-icons';
import { Pressable } from 'react-native';
import { formatDate, formatTime, formatDateTime } from '@queenix/types';

type Tab = 'overview' | 'sessions' | 'programs' | 'notes' | 'progress';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'programs', label: 'Programs' },
  { key: 'notes', label: 'Notes' },
  { key: 'progress', label: 'Progress' },
];

export default function TrainerClientDetail() {
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [noteDraft, setNoteDraft] = useState('');

  // Mock data — in production: Convex query by id
  const client = {
    id: params.id ?? 'c1',
    name: 'Amna Al-Mazrouei',
    status: 'active' as const,
    goal: 'Strength + glute hypertrophy',
    progressPct: 64,
    joinedAt: 'Jan 2024',
    bio: 'Marketing exec, busy weekdays. Trains 5x/week, prefers early-morning sessions. Loves compound lifts and Pilates on weekends.',
    email: 'amna.mazrouei@outlook.com',
    phone: '+971 55 882 4190',
    dob: 'Mar 22, 1990',
    health: {
      notes: 'Mild lower-back tightness (managed with mobility). Cleared for full strength work.',
      injuries: 'No current injuries. ACL repair 2019 (R) — fully rehabbed.',
      goals: ['Deadlift 100kg', '5 unbroken pull-ups', 'Visible glute growth by Q1 2027'],
    },
  };

  const stats = {
    totalSessions: 24,
    lastSessionLabel: '2 days ago',
    nextSessionLabel: 'Mon, 07:00',
    goalProgress: 64,
  };

  const sessions = [
    { id: 's1', when: Date.now() + 24 * 60 * 60 * 1000, focus: 'Lower body — glutes', status: 'upcoming' as const, note: '' },
    { id: 's2', when: Date.now() + 3 * 24 * 60 * 60 * 1000, focus: 'Upper push + core', status: 'upcoming' as const, note: '' },
    { id: 's3', when: Date.now() - 2 * 24 * 60 * 60 * 1000, focus: 'Lower body — quads', status: 'completed' as const, note: 'Hit 80kg back squat (PR). Excellent bar speed.' },
    { id: 's4', when: Date.now() - 4 * 24 * 60 * 60 * 1000, focus: 'Upper pull + posterior', status: 'completed' as const, note: 'Strict pull-ups 3x6. Rows 50kg x8.' },
    { id: 's5', when: Date.now() - 6 * 24 * 60 * 60 * 1000, focus: 'Full body conditioning', status: 'completed' as const, note: 'RPE 8. Sweat rate high — hydrate +200ml.' },
    { id: 's6', when: Date.now() - 9 * 24 * 60 * 60 * 1000, focus: 'Glute activation + mobility', status: 'completed' as const, note: 'Hip flexor tight on L side. Add couch stretch daily.' },
    { id: 's7', when: Date.now() - 11 * 24 * 60 * 60 * 1000, focus: 'Lower body — hinge', status: 'completed' as const, note: 'Deadlift 90kg x5. Brace cues locked in.' },
    { id: 's8', when: Date.now() - 14 * 24 * 60 * 60 * 1000, focus: 'Assessment', status: 'completed' as const, note: 'Re-measure: waist 71cm, hips 96cm, R thigh 56cm.' },
  ];

  const programs = [
    {
      id: 'pr1',
      name: 'Glute Builder — 8 weeks',
      started: Date.now() - 21 * 24 * 60 * 60 * 1000,
      sessionsPerWeek: 3,
      progress: 0.4,
      status: 'active' as const,
    },
    {
      id: 'pr2',
      name: 'Pull-up Progression — 6 weeks',
      started: Date.now() - 10 * 24 * 60 * 60 * 1000,
      sessionsPerWeek: 2,
      progress: 0.6,
      status: 'active' as const,
    },
    {
      id: 'pr3',
      name: 'Foundation — full body',
      started: Date.now() - 90 * 24 * 60 * 60 * 1000,
      ended: Date.now() - 30 * 24 * 60 * 60 * 1000,
      sessionsPerWeek: 3,
      progress: 1,
      status: 'completed' as const,
    },
  ];

  const notes = [
    { id: 'n1', when: '2 days ago', body: 'Loves morning energy. Avoid scheduling PM sessions if possible.' },
    { id: 'n2', when: '5 days ago', body: 'Traveled to London for work — missed 1 week. Resumed well.' },
    { id: 'n3', when: '2 weeks ago', body: 'Sister Layla referred her. Both train with me on Mon/Wed/Fri.' },
    { id: 'n4', when: '3 weeks ago', body: 'Wants competition-ready glutes by April 2027. Long horizon.' },
    { id: 'n5', when: '1 month ago', body: 'Hip mobility limited on L. Added daily 10-min mobility block.' },
  ];

  const strength = [
    { lift: 'Back squat', current: '80kg', delta: '+10kg', pct: 80 },
    { lift: 'Deadlift', current: '90kg', delta: '+15kg', pct: 72 },
    { lift: 'Bench press', current: '45kg', delta: '+5kg', pct: 60 },
    { lift: 'Overhead press', current: '30kg', delta: '+5kg', pct: 55 },
    { lift: 'Strict pull-up', current: '6 reps', delta: '+3 reps', pct: 65 },
  ];

  const measurements = [
    { date: 'Aug 2026', waist: '73cm', hips: '97cm', rThigh: '55cm', lThigh: '54.5cm', weight: '64kg' },
    { date: 'Sep 2026', waist: '71cm', hips: '96cm', rThigh: '56cm', lThigh: '55.5cm', weight: '63.4kg' },
  ];

  const weightTrend = [64.8, 64.6, 64.7, 64.3, 64.0, 63.7, 63.4];

  const handleSendNote = () => {
    if (noteDraft.trim().length === 0) {
      toast.show('Type a note first', 'warning');
      return;
    }
    toast.show('Note saved', 'success');
    setNoteDraft('');
  };

  return (
    <Screen padded={false}>
      <Header
        showBack
        onBack={() => router.back()}
        title="Client"
        right={
          <Pressable
            onPress={() => toast.show('Opening chat…', 'info')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Message client"
          >
            <MessageCircle size={22} color="$textPrimary" />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile header */}
        <YStack paddingHorizontal="$4" paddingTop="$3">
          <Card variant="elevated" padding="lg">
            <XStack gap="$3" alignItems="flex-start">
              <Avatar name={client.name} size="xl" />
              <YStack flex={1} gap="$1.5">
                <Text variant="h2" numberOfLines={1}>{client.name}</Text>
                <XStack gap="$2" flexWrap="wrap">
                  <Badge label="Active" variant="success" />
                  <Badge label={client.goal} variant="info" />
                </XStack>
                <Text variant="caption" color="muted">Client since {client.joinedAt}</Text>
              </YStack>
            </XStack>
            <XStack gap="$2" marginTop="$3">
              <Button
                label="Book session"
                variant="primary"
                size="sm"
                icon={<CalendarPlus size={16} color="$textOnBrand" />}
                onPress={() => toast.show('Opening scheduler…', 'info')}
                accessibilityLabel="Book session"
                flex={1}
              />
              <Button
                label="Message"
                variant="outline"
                size="sm"
                icon={<MessageCircle size={16} color="$brand" />}
                onPress={() => toast.show('Opening chat…', 'info')}
                accessibilityLabel="Send message"
                flex={1}
              />
            </XStack>
          </Card>
        </YStack>

        {/* Quick stats */}
        <XStack paddingHorizontal="$4" marginTop="$4" gap="$2">
          <Stat label="Total sessions" value={stats.totalSessions.toString()} flex={1} />
          <Stat label="Last session" value={stats.lastSessionLabel} flex={1} />
          <Stat label="Next session" value={stats.nextSessionLabel} flex={1} />
        </XStack>
        <YStack paddingHorizontal="$4" marginTop="$2">
          <Card variant="outlined" padding="sm">
            <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
              <XStack alignItems="center" gap="$1.5">
                <Target size={14} color="$brand" />
                <Text variant="label">Goal progress</Text>
              </XStack>
              <Text variant="bodySmall" weight="600" color="brand">{stats.goalProgress}%</Text>
            </XStack>
            <TProgress value={stats.goalProgress} />
            <Text variant="caption" color="muted" marginTop="$1.5">
              On track — 6 weeks to phase 2
            </Text>
          </Card>
        </YStack>

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
          <YStack paddingHorizontal="$4" gap="$3">
            <Section title="About">
              <Text variant="bodySmall" color="secondary">{client.bio}</Text>
            </Section>

            <Section title="Contact">
              <KeyValue icon={<Mail size={16} color="$textSecondary" />} label="Email" value={client.email} />
              <Divider />
              <KeyValue icon={<Phone size={16} color="$textSecondary" />} label="Phone" value={client.phone} />
              <Divider />
              <KeyValue icon={<Calendar size={16} color="$textSecondary" />} label="DOB" value={client.dob} />
            </Section>

            <Section title="Goals">
              <YStack gap="$2">
                {client.health.goals.map((g, i) => (
                  <XStack key={g} alignItems="center" gap="$2">
                    <Target size={14} color="$brand" />
                    <Text variant="bodySmall" color="secondary" flex={1}>{g}</Text>
                  </XStack>
                ))}
              </YStack>
            </Section>

            <Section title="Health notes">
              <XStack alignItems="flex-start" gap="$2" paddingVertical="$1">
                <Heart size={16} color="$danger500" />
                <YStack flex={1} gap="$1">
                  <Text variant="bodySmall" weight="500">{client.health.notes}</Text>
                  <Text variant="caption" color="muted">{client.health.injuries}</Text>
                </YStack>
              </XStack>
            </Section>
          </YStack>
        )}

        {tab === 'sessions' && (
          <YStack paddingHorizontal="$4" gap="$2">
            <XStack justifyContent="space-between" alignItems="center" marginBottom="$1">
              <Text variant="h4">Sessions</Text>
              <Button
                label="Add note"
                size="sm"
                variant="primary"
                icon={<Plus size={14} color="$textOnBrand" />}
                onPress={() => toast.show('Compose note', 'info')}
                accessibilityLabel="Add session note"
              />
            </XStack>
            {sessions.map((s) => {
              const isUpcoming = s.status === 'upcoming';
              return (
                <Card key={s.id} variant="outlined" padding="sm">
                  <XStack alignItems="flex-start" gap="$3">
                    <YStack
                      backgroundColor={isUpcoming ? '$brand' : '$surfaceMuted'}
                      padding="$2"
                      borderRadius="$md"
                      width={40}
                      height={40}
                      alignItems="center"
                      justifyContent="center"
                    >
                      {isUpcoming ? <Clock size={18} color="$textOnBrand" /> : <CheckCircle2 size={18} color="$success500" />}
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <XStack justifyContent="space-between" alignItems="center">
                        <Text variant="bodySmall" weight="600">{s.focus}</Text>
                        <Badge
                          label={isUpcoming ? 'Upcoming' : 'Completed'}
                          variant={isUpcoming ? 'brand' : 'success'}
                          size="sm"
                        />
                      </XStack>
                      <Text variant="caption" color="muted">
                        {isUpcoming ? formatDateTime(s.when) : `Done — ${formatDate(s.when)}`}
                      </Text>
                      {s.note && (
                        <Text variant="caption" color="secondary" marginTop="$0.5">
                          “{s.note}”
                        </Text>
                      )}
                    </YStack>
                  </XStack>
                </Card>
              );
            })}
          </YStack>
        )}

        {tab === 'programs' && (
          <YStack paddingHorizontal="$4" gap="$3">
            <Button
              label="Create program"
              variant="primary"
              icon={<Plus size={16} color="$textOnBrand" />}
              onPress={() => toast.show('Program builder', 'info')}
              accessibilityLabel="Create new program"
            />
            {programs.map((p) => (
              <Card key={p.id} variant="outlined" padding="sm">
                <YStack gap="$2">
                  <XStack justifyContent="space-between" alignItems="flex-start">
                    <YStack flex={1} gap="$0.5">
                      <Text variant="label">{p.name}</Text>
                      <Text variant="caption" color="muted">
                        Started {formatDate(p.started)} • {p.sessionsPerWeek}x / week
                      </Text>
                    </YStack>
                    <Badge
                      label={p.status === 'active' ? 'Active' : 'Completed'}
                      variant={p.status === 'active' ? 'brand' : 'success'}
                      size="sm"
                    />
                  </XStack>
                  <TProgress value={p.progress * 100} />
                  <Text variant="caption" color="muted">{Math.round(p.progress * 100)}% complete</Text>
                </YStack>
              </Card>
            ))}
          </YStack>
        )}

        {tab === 'notes' && (
          <YStack paddingHorizontal="$4" gap="$3">
            <Card variant="outlined" padding="sm">
              <YStack gap="$2">
                <Text variant="label">Quick note</Text>
                <YStack
                  backgroundColor="$surfaceMuted"
                  borderRadius="$md"
                  padding="$3"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <Text variant="bodySmall" color="secondary" numberOfLines={3}>
                    {noteDraft || 'Type a trainer-only note for Amna…'}
                  </Text>
                </YStack>
                <XStack gap="$2" alignItems="center">
                  <YStack
                    flex={1}
                    backgroundColor="$surfaceMuted"
                    borderRadius="$md"
                    paddingHorizontal="$3"
                    paddingVertical="$2.5"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <Text variant="caption" color="muted">Use the field below to add structured notes</Text>
                  </YStack>
                  <Button
                    label="Save"
                    size="sm"
                    variant="primary"
                    icon={<Send size={14} color="$textOnBrand" />}
                    onPress={handleSendNote}
                    accessibilityLabel="Save note"
                  />
                </XStack>
                <XStack gap="$2" flexWrap="wrap">
                  {['Hit PR', 'Skipped', 'Form fix', 'Travel week'].map((tag) => (
                    <Chip
                      key={tag}
                      label={`+ ${tag}`}
                      selected={false}
                      onPress={() => setNoteDraft((d) => `${d}${d ? ' • ' : ''}${tag}`)}
                    />
                  ))}
                </XStack>
              </YStack>
            </Card>

            {notes.map((n) => (
              <Card key={n.id} variant="outlined" padding="sm">
                <XStack alignItems="flex-start" gap="$2">
                  <FileText size={16} color="$textMuted" />
                  <YStack flex={1} gap="$0.5">
                    <Text variant="caption" color="muted">{n.when}</Text>
                    <Text variant="bodySmall" color="secondary">{n.body}</Text>
                  </YStack>
                </XStack>
              </Card>
            ))}
          </YStack>
        )}

        {tab === 'progress' && (
          <YStack paddingHorizontal="$4" gap="$3">
            <Section title="Strength (current)">
              {strength.map((s) => (
                <YStack key={s.lift} paddingVertical="$2.5" gap="$1">
                  <XStack justifyContent="space-between" alignItems="center">
                    <Text variant="bodySmall" weight="500">{s.lift}</Text>
                    <XStack gap="$2" alignItems="center">
                      <Text variant="bodySmall" weight="600">{s.current}</Text>
                      <Badge label={s.delta} variant="success" size="sm" />
                    </XStack>
                  </XStack>
                  <TProgress value={s.pct} />
                </YStack>
              ))}
            </Section>

            <Section title="Weight trend (7 weeks)">
              <XStack alignItems="flex-end" gap="$1.5" height={80} marginVertical="$2">
                {weightTrend.map((w, i) => {
                  const min = Math.min(...weightTrend);
                  const max = Math.max(...weightTrend);
                  const range = max - min || 1;
                  const h = ((w - min) / range) * 60 + 16;
                  return (
                    <YStack key={i} flex={1} alignItems="center" gap="$1">
                      <YStack
                        width="100%"
                        height={h}
                        backgroundColor="$brand"
                        borderTopLeftRadius="$sm"
                        borderTopRightRadius="$sm"
                      />
                      <Text variant="caption" color="muted">{w.toFixed(1)}</Text>
                    </YStack>
                  );
                })}
              </XStack>
              <XStack alignItems="center" gap="$1.5" marginTop="$1">
                <TrendingUp size={14} color="$success500" />
                <Text variant="caption" color="muted">Down 1.4kg over 7 weeks</Text>
              </XStack>
            </Section>

            <Section title="Body measurements">
              {measurements.map((m, i) => (
                <YStack key={m.date} paddingVertical="$2.5" gap="$1.5">
                  <Text variant="label">{m.date}</Text>
                  <XStack flexWrap="wrap" gap="$2">
                    <Tag label={`Weight ${m.weight}`} />
                    <Tag label={`Waist ${m.waist}`} />
                    <Tag label={`Hips ${m.hips}`} />
                    <Tag label={`R thigh ${m.rThigh}`} />
                    <Tag label={`L thigh ${m.lThigh}`} />
                  </XStack>
                  {i < measurements.length - 1 && <Divider marginTop="$1.5" />}
                </YStack>
              ))}
              <Button
                label="Log new measurement"
                size="sm"
                variant="outline"
                icon={<Ruler size={14} color="$brand" />}
                onPress={() => toast.show('Measurement form', 'info')}
                accessibilityLabel="Log new measurement"
                marginTop="$2"
              />
            </Section>
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

function Stat({ label, value, flex }: { label: string; value: string; flex?: number }) {
  return (
    <Card variant="outlined" padding="sm" flex={flex}>
      <YStack gap="$0.5">
        <Text variant="caption" color="muted">{label}</Text>
        <Text variant="bodySmall" weight="600">{value}</Text>
      </YStack>
    </Card>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <XStack
      backgroundColor="$brand50"
      paddingHorizontal="$2.5"
      paddingVertical="$1"
      borderRadius="$full"
    >
      <Text variant="caption" color="brand" weight="500">{label}</Text>
    </XStack>
  );
}
