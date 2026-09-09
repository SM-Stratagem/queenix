import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Badge,
  Button,
  Input,
  Sheet,
  Header,
  Divider,
} from '@queenix/ui';
import {
  Plus,
  ShieldAlert,
  Wrench,
  HardHat,
  MessageCircleWarning,
  ChevronRight,
  Clock,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  User,
} from '@tamagui/lucide-icons';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type IncidentType = 'access_denied' | 'equipment' | 'safety' | 'complaint';
type IncidentStatus = 'open' | 'in_progress' | 'resolved';

interface Incident {
  id: string;
  code: string;
  type: IncidentType;
  severity: Severity;
  title: string;
  location: string;
  reportedBy: string;
  reportedByInitials: string;
  timeAgo: string;
  status: IncidentStatus;
  description: string;
}

const TYPE_META: Record<
  IncidentType,
  { label: string; icon: React.ReactNode; bg: string; fg: string }
> = {
  access_denied: {
    label: 'Access denied',
    icon: <ShieldAlert size={18} color="$danger" />,
    bg: '$danger100',
    fg: '$danger',
  },
  equipment: {
    label: 'Equipment',
    icon: <Wrench size={18} color="$warning" />,
    bg: '$warning100',
    fg: '$warning',
  },
  safety: {
    label: 'Safety',
    icon: <HardHat size={18} color="$warning" />,
    bg: '$warning100',
    fg: '$warning',
  },
  complaint: {
    label: 'Complaint',
    icon: <MessageCircleWarning size={18} color="$info" />,
    bg: '$info100',
    fg: '$info',
  },
};

const SEVERITY_META: Record<Severity, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' }> = {
  low: { label: 'Low', variant: 'success' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  critical: { label: 'Critical', variant: 'danger' },
};

const STATUS_META: Record<IncidentStatus, { label: string; variant: 'neutral' | 'info' | 'success' }> = {
  open: { label: 'Open', variant: 'info' },
  in_progress: { label: 'In progress', variant: 'info' },
  resolved: { label: 'Resolved', variant: 'success' },
};

const INCIDENTS: Incident[] = [
  {
    id: 'i1',
    code: 'INC-2031',
    type: 'access_denied',
    severity: 'critical',
    title: 'Main turnstile rejecting valid members',
    location: 'Front entrance',
    reportedBy: 'Hala Al-Suwaidi',
    reportedByInitials: 'HA',
    timeAgo: '8 min ago',
    status: 'open',
    description: 'Multiple members reporting the right-side turnstile rejecting valid QR codes since 17:40.',
  },
  {
    id: 'i2',
    code: 'INC-2030',
    type: 'equipment',
    severity: 'high',
    title: 'Treadmill #4 emergency stop triggered',
    location: 'Cardio zone',
    reportedBy: 'Sam Khan',
    reportedByInitials: 'SK',
    timeAgo: '24 min ago',
    status: 'in_progress',
    description: 'Member pulled the safety lanyard. Belt stopped correctly; awaiting maintenance inspection.',
  },
  {
    id: 'i3',
    code: 'INC-2029',
    type: 'safety',
    severity: 'medium',
    title: 'Wet floor — Studio 1 entrance',
    location: 'Studio 1',
    reportedBy: 'Maya Patel',
    reportedByInitials: 'MP',
    timeAgo: '41 min ago',
    status: 'in_progress',
    description: 'Caution sign placed, janitorial team notified. Class starts in 30 min.',
  },
  {
    id: 'i4',
    code: 'INC-2028',
    type: 'complaint',
    severity: 'medium',
    title: 'Noise complaint — rooftop class volume',
    location: 'Rooftop',
    reportedBy: 'Reem Al-Suwaidi',
    reportedByInitials: 'RA',
    timeAgo: '1 hour ago',
    status: 'open',
    description: 'Office tenant reports amplified audio during evening classes. Need sound check schedule.',
  },
  {
    id: 'i5',
    code: 'INC-2027',
    type: 'equipment',
    severity: 'low',
    title: 'Cable machine #2 — minor fraying',
    location: 'Strength zone',
    reportedBy: 'Latifa Hassan',
    reportedByInitials: 'LH',
    timeAgo: '3 hours ago',
    status: 'open',
    description: 'Visual wear on right cable. Marked out of service pending replacement.',
  },
  {
    id: 'i6',
    code: 'INC-2026',
    type: 'access_denied',
    severity: 'low',
    title: 'Door sensor delay — Studio 2',
    location: 'Studio 2',
    reportedBy: 'Maryam Al-Falasi',
    reportedByInitials: 'MA',
    timeAgo: '5 hours ago',
    status: 'resolved',
    description: 'Sensor recalibrated by facilities. Verified working at 13:00.',
  },
  {
    id: 'i7',
    code: 'INC-2025',
    type: 'safety',
    severity: 'high',
    title: 'Spilled cleaning solution near reception',
    location: 'Reception',
    reportedBy: 'Hala Al-Suwaidi',
    reportedByInitials: 'HA',
    timeAgo: 'Yesterday',
    status: 'resolved',
    description: 'Cleaned and area cordoned. Cleaning vendor briefed on dilution ratios.',
  },
  {
    id: 'i8',
    code: 'INC-2024',
    type: 'complaint',
    severity: 'low',
    title: 'AC too cold in stretch zone',
    location: 'Stretch zone',
    reportedBy: 'Yusuf Khan',
    reportedByInitials: 'YK',
    timeAgo: 'Yesterday',
    status: 'resolved',
    description: 'HVAC adjusted to 22°C. Member acknowledged.',
  },
];

type Tab = 'open' | 'resolved' | 'all';

export default function IncidentsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('open');
  const [reportOpen, setReportOpen] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);

  const counts = useMemo(() => {
    const acc = { critical: 0, high: 0, medium: 0, low: 0, open: 0, resolved: 0, all: INCIDENTS.length };
    for (const i of INCIDENTS) {
      if (i.status !== 'resolved') {
        acc[i.severity] += 1;
        acc.open += 1;
      } else {
        acc.resolved += 1;
      }
    }
    return acc;
  }, []);

  const filtered = useMemo(() => {
    if (tab === 'open') return INCIDENTS.filter((i) => i.status !== 'resolved');
    if (tab === 'resolved') return INCIDENTS.filter((i) => i.status === 'resolved');
    return INCIDENTS;
  }, [tab]);

  return (
    <Screen padded={false}>
      <Header
        title="Incident reports"
        subtitle={`${counts.open} open across the facility`}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Stats */}
        <YStack paddingHorizontal="$4" marginTop="$2">
          <Text variant="h4" marginBottom="$2">Open by severity</Text>
          <XStack gap="$2">
            <SeverityStat
              label="Critical"
              count={counts.critical}
              tone="critical"
              flex={1}
            />
            <SeverityStat
              label="High"
              count={counts.high}
              tone="high"
              flex={1}
            />
            <SeverityStat
              label="Medium"
              count={counts.medium}
              tone="medium"
              flex={1}
            />
            <SeverityStat
              label="Low"
              count={counts.low}
              tone="low"
              flex={1}
            />
          </XStack>
        </YStack>

        {/* Tabs */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <XStack
            backgroundColor="$surfaceMuted"
            padding="$1"
            borderRadius="$lg"
            gap="$1"
          >
            {(['open', 'resolved', 'all'] as Tab[]).map((t) => {
              const active = tab === t;
              return (
                <YStack
                  key={t}
                  flex={1}
                  paddingVertical="$2.5"
                  alignItems="center"
                  borderRadius="$md"
                  backgroundColor={active ? '$surface' : 'transparent'}
                  borderWidth={active ? 1 : 0}
                  borderColor="$borderColor"
                  onPress={() => setTab(t)}
                  pressStyle={{ opacity: 0.8 }}
                  accessibilityRole="tab"
                  accessibilityLabel={`Show ${t} incidents`}
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    color={active ? 'brand' : 'muted'}
                    textTransform="capitalize"
                  >
                    {t} {t === 'all' ? `(${INCIDENTS.length})` : `(${t === 'open' ? counts.open : counts.resolved})`}
                  </Text>
                </YStack>
              );
            })}
          </XStack>
        </YStack>

        {/* List */}
        <YStack paddingHorizontal="$4" marginTop="$3" gap="$2">
          {filtered.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <YStack alignItems="center" gap="$2">
                <CheckCircle2 size={32} color="$success500" />
                <Text variant="label">All clear</Text>
                <Text variant="bodySmall" color="muted" textAlign="center">
                  No {tab === 'open' ? 'open' : tab} incidents at the moment.
                </Text>
              </YStack>
            </Card>
          ) : (
            filtered.map((i) => (
              <IncidentCard
                key={i.id}
                incident={i}
                onPress={() => setSelected(i)}
              />
            ))
          )}
        </YStack>
      </ScrollView>

      {/* Floating report button */}
      <YStack
        position="absolute"
        bottom="$5"
        right="$4"
        accessibilityLabel="Report new incident"
      >
        <Button
          label="Report incident"
          variant="primary"
          size="md"
          icon={<Plus size={18} color="$textOnBrand" />}
          onPress={() => setReportOpen(true)}
        />
      </YStack>

      {/* Detail sheet */}
      <Sheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      >
        {selected ? (
          <YStack gap="$3">
            <YStack gap="$0.5">
              <Text variant="h2">{selected.title}</Text>
              <Text variant="bodySmall" color="secondary">
                {selected.code} • {selected.location}
              </Text>
            </YStack>
            <IncidentDetail incident={selected} />
          </YStack>
        ) : null}
      </Sheet>

      {/* Report sheet */}
      <Sheet
        open={reportOpen}
        onOpenChange={setReportOpen}
      >
        <YStack gap="$3">
          <YStack gap="$0.5" marginBottom="$1">
            <Text variant="h2">Report an incident</Text>
            <Text variant="bodySmall" color="secondary">
              Logged immediately for the operations team
            </Text>
          </YStack>
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Type
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {(Object.keys(TYPE_META) as IncidentType[]).map((t) => (
                <Card
                  key={t}
                  variant="outlined"
                  padding="sm"
                  onPress={() => {}}
                  accessibilityLabel={`Type ${TYPE_META[t].label}`}
                >
                  <XStack alignItems="center" gap="$1.5">
                    {TYPE_META[t].icon}
                    <Text variant="caption" weight="600">
                      {TYPE_META[t].label}
                    </Text>
                  </XStack>
                </Card>
              ))}
            </XStack>
          </YStack>
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Severity
            </Text>
            <XStack gap="$2">
              {(['low', 'medium', 'high', 'critical'] as Severity[]).map((s) => (
                <Card
                  key={s}
                  variant="outlined"
                  padding="sm"
                  flex={1}
                  onPress={() => {}}
                  accessibilityLabel={`Severity ${SEVERITY_META[s].label}`}
                >
                  <Text
                    variant="caption"
                    weight="600"
                    textTransform="capitalize"
                    textAlign="center"
                    color={SEVERITY_META[s].variant === 'danger' ? 'danger' : SEVERITY_META[s].variant === 'warning' ? 'warning' : 'primary'}
                  >
                    {SEVERITY_META[s].label}
                  </Text>
                </Card>
              ))}
            </XStack>
          </YStack>
          <Input
            label="Location"
            placeholder="e.g. Studio 2, Reception, Rooftop"
            accessibilityLabel="Incident location"
          />
          <Input
            label="Title"
            placeholder="Short summary"
            accessibilityLabel="Incident title"
          />
          <Input
            label="Description"
            placeholder="What happened? Who is affected?"
            multiline
            numberOfLines={4}
            accessibilityLabel="Incident description"
          />
          <Button
            label="Submit report"
            variant="primary"
            size="md"
            fullWidth
            onPress={() => setReportOpen(false)}
            accessibilityLabel="Submit incident report"
          />
        </YStack>
      </Sheet>
    </Screen>
  );
}

function SeverityStat({
  label,
  count,
  tone,
  flex,
}: {
  label: string;
  count: number;
  tone: 'critical' | 'high' | 'medium' | 'low';
  flex?: number;
}) {
  const colorMap = {
    critical: '$danger',
    high: '$warning',
    medium: '$info',
    low: '$success',
  } as const;
  const bgMap = {
    critical: '$danger100',
    high: '$warning100',
    medium: '$info100',
    low: '$success100',
  } as const;
  const iconMap = {
    critical: <AlertOctagon size={16} color={colorMap[tone]} />,
    high: <AlertTriangle size={16} color={colorMap[tone]} />,
    medium: <Info size={16} color={colorMap[tone]} />,
    low: <CheckCircle2 size={16} color={colorMap[tone]} />,
  };
  return (
    <Card
      variant="outlined"
      padding="sm"
      flex={flex}
      accessibilityLabel={`${count} ${label} open incidents`}
    >
      <YStack gap="$1">
        {iconMap[tone]}
        <Text variant="h3" color={colorMap[tone]}>
          {count}
        </Text>
        <Text variant="caption" color="muted">
          {label}
        </Text>
      </YStack>
    </Card>
  );
}

function IncidentCard({
  incident,
  onPress,
}: {
  incident: Incident;
  onPress: () => void;
}) {
  const t = TYPE_META[incident.type];
  const s = SEVERITY_META[incident.severity];
  const st = STATUS_META[incident.status];
  return (
    <Card
      variant="outlined"
      padding="sm"
      onPress={onPress}
      accessibilityLabel={`${incident.severity} severity ${incident.type.replace('_', ' ')} incident: ${incident.title}`}
    >
      <XStack alignItems="flex-start" gap="$3">
        <YStack
          backgroundColor={t.bg}
          padding="$2.5"
          borderRadius="$md"
          alignItems="center"
          justifyContent="center"
        >
          {t.icon}
        </YStack>
        <YStack flex={1} gap="$1">
          <XStack alignItems="center" gap="$2" flexWrap="wrap">
            <Text variant="caption" weight="600" color="brand">
              {incident.code}
            </Text>
            <Badge label={t.label} variant="neutral" />
            <Badge label={s.label} variant={s.variant} />
            <Badge label={st.label} variant={st.variant} />
          </XStack>
          <Text variant="label" numberOfLines={2}>
            {incident.title}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {incident.location}
          </Text>
          <XStack alignItems="center" gap="$2" marginTop="$0.5">
            <User size={12} color="$textMuted" />
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {incident.reportedBy}
            </Text>
            <Text variant="caption" color="muted">
              •
            </Text>
            <XStack alignItems="center" gap="$1">
              <Clock size={12} color="$textMuted" />
              <Text variant="caption" color="muted">
                {incident.timeAgo}
              </Text>
            </XStack>
          </XStack>
        </YStack>
        <ChevronRight size={18} color="$textMuted" />
      </XStack>
    </Card>
  );
}

function IncidentDetail({ incident }: { incident: Incident }) {
  const t = TYPE_META[incident.type];
  const s = SEVERITY_META[incident.severity];
  return (
    <YStack gap="$3">
      <XStack gap="$2" flexWrap="wrap">
        <Badge label={t.label} variant="neutral" />
        <Badge label={s.label} variant={s.variant} />
        <Badge label={STATUS_META[incident.status].label} variant={STATUS_META[incident.status].variant} />
      </XStack>
      <Card variant="filled" backgroundColor="$surfaceMuted" padding="md">
        <Text variant="label">Description</Text>
        <Text variant="bodySmall" color="secondary" marginTop="$1">
          {incident.description}
        </Text>
      </Card>
      <YStack gap="$2">
        <XStack justifyContent="space-between">
          <Text variant="caption" color="muted">Location</Text>
          <Text variant="caption" weight="600">{incident.location}</Text>
        </XStack>
        <Divider />
        <XStack justifyContent="space-between">
          <Text variant="caption" color="muted">Reported by</Text>
          <Text variant="caption" weight="600">{incident.reportedBy}</Text>
        </XStack>
        <Divider />
        <XStack justifyContent="space-between">
          <Text variant="caption" color="muted">Reported</Text>
          <Text variant="caption" weight="600">{incident.timeAgo}</Text>
        </XStack>
      </YStack>
      <XStack gap="$2">
        <Button
          label="Mark resolved"
          variant="primary"
          size="md"
          flex={1}
          onPress={() => {}}
          accessibilityLabel="Mark incident as resolved"
        />
        <Button
          label="Escalate"
          variant="outline"
          size="md"
          flex={1}
          onPress={() => {}}
          accessibilityLabel="Escalate incident"
        />
      </XStack>
    </YStack>
  );
}
