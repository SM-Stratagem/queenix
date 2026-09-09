import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
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
  Skeleton,
  ErrorState,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
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
type IncidentType = 'access_denied' | 'equipment' | 'safety' | 'complaint' | 'other';
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
  createdAt: number;
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
  other: {
    label: 'Other',
    icon: <Info size={18} color="$textMuted" />,
    bg: '$surfaceMuted',
    fg: '$textMuted',
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

type Tab = 'open' | 'resolved' | 'all';
const TABS: Tab[] = ['open', 'resolved', 'all'];

const SEVERITY_OPTIONS: Severity[] = ['low', 'medium', 'high', 'critical'];
const TYPE_OPTIONS: IncidentType[] = ['access_denied', 'equipment', 'safety', 'complaint', 'other'];

export default function IncidentsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('open');
  const [reportOpen, setReportOpen] = useState(false);
  const [selected, setSelected] = useState<Incident | null>(null);

  // Report form state
  const [reportType, setReportType] = useState<IncidentType>('equipment');
  const [reportSeverity, setReportSeverity] = useState<Severity>('medium');
  const [reportLocation, setReportLocation] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');

  const allIncidents = useConvexQuery(api.queries.users.getIncidents, {});
  const createIncident = useConvexMutation(api.mutations.operations.createIncident);
  const resolveIncident = useConvexMutation(api.mutations.operations.resolveIncident);

  // Map Convex incidents → UI shape
  const incidents: Incident[] = useMemo(() => {
    if (!allIncidents) return [];
    return (allIncidents as any[]).map((i) => {
      const type = (i.type ?? 'other') as IncidentType;
      const severity = (i.severity ?? 'medium') as Severity;
      const status = (i.status ?? (i.resolved ? 'resolved' : 'open')) as IncidentStatus;
      return {
        id: i._id,
        code: `INC-${i._id.slice(-4).toUpperCase()}`,
        type,
        severity,
        title: i.title ?? `${TYPE_META[type].label} report`,
        location: i.location ?? '—',
        reportedBy: i.reportedByUser?.fullName ?? 'Team',
        reportedByInitials: getInitials(i.reportedByUser?.fullName),
        timeAgo: formatRelative(i.createdAt),
        status,
        description: i.description,
        createdAt: i.createdAt,
      };
    });
  }, [allIncidents]);

  const counts = useMemo(() => {
    const acc = { critical: 0, high: 0, medium: 0, low: 0, open: 0, resolved: 0, all: incidents.length };
    for (const i of incidents) {
      if (i.status !== 'resolved') {
        acc[i.severity] += 1;
        acc.open += 1;
      } else {
        acc.resolved += 1;
      }
    }
    return acc;
  }, [incidents]);

  const filtered = useMemo(() => {
    if (tab === 'open') return incidents.filter((i) => i.status !== 'resolved');
    if (tab === 'resolved') return incidents.filter((i) => i.status === 'resolved');
    return incidents;
  }, [incidents, tab]);

  const handleSubmit = async () => {
    if (!reportDescription.trim() || !reportTitle.trim()) {
      toast.warning('Title and description are required');
      return;
    }
    try {
      await createIncident({
        type: reportType,
        severity: reportSeverity,
        title: reportTitle.trim(),
        location: reportLocation.trim() || undefined,
        description: reportDescription.trim(),
      });
      toast.success('Incident reported');
      setReportOpen(false);
      setReportTitle('');
      setReportDescription('');
      setReportLocation('');
      setReportType('equipment');
      setReportSeverity('medium');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to submit');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveIncident({ incidentId: id as any });
      toast.success('Incident resolved');
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to resolve');
    }
  };

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
            {TABS.map((t) => {
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
                    {t}{' '}
                    {t === 'all'
                      ? `(${counts.all})`
                      : `(${t === 'open' ? counts.open : counts.resolved})`}
                  </Text>
                </YStack>
              );
            })}
          </XStack>
        </YStack>

        {/* List */}
        <YStack paddingHorizontal="$4" marginTop="$3" gap="$2">
          {allIncidents === undefined ? (
            <YStack gap="$2">
              <Skeleton height={96} borderRadius={12} />
              <Skeleton height={96} borderRadius={12} />
            </YStack>
          ) : allIncidents === null ? (
            <ErrorState onRetry={() => {}} />
          ) : filtered.length === 0 ? (
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
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected ? (
          <YStack gap="$3">
            <YStack gap="$0.5">
              <Text variant="h2">{selected.title}</Text>
              <Text variant="bodySmall" color="secondary">
                {selected.code} • {selected.location}
              </Text>
            </YStack>
            <IncidentDetail
              incident={selected}
              onResolve={() => handleResolve(selected.id)}
            />
          </YStack>
        ) : null}
      </Sheet>

      {/* Report sheet */}
      <Sheet open={reportOpen} onOpenChange={setReportOpen}>
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
              {TYPE_OPTIONS.map((t) => {
                const active = reportType === t;
                return (
                  <Card
                    key={t}
                    variant={active ? 'elevated' : 'outlined'}
                    padding="sm"
                    onPress={() => setReportType(t)}
                    backgroundColor={active ? '$brand50' : undefined}
                    accessibilityLabel={`Type ${TYPE_META[t].label}`}
                  >
                    <XStack alignItems="center" gap="$1.5">
                      {TYPE_META[t].icon}
                      <Text variant="caption" weight="600">
                        {TYPE_META[t].label}
                      </Text>
                    </XStack>
                  </Card>
                );
              })}
            </XStack>
          </YStack>
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Severity
            </Text>
            <XStack gap="$2">
              {SEVERITY_OPTIONS.map((s) => {
                const active = reportSeverity === s;
                const meta = SEVERITY_META[s];
                return (
                  <Card
                    key={s}
                    variant={active ? 'elevated' : 'outlined'}
                    padding="sm"
                    flex={1}
                    onPress={() => setReportSeverity(s)}
                    backgroundColor={
                      active
                        ? meta.variant === 'danger'
                          ? '$danger50'
                          : meta.variant === 'warning'
                          ? '$warning50'
                          : meta.variant === 'success'
                          ? '$success50'
                          : '$brand50'
                        : undefined
                    }
                    accessibilityLabel={`Severity ${meta.label}`}
                  >
                    <Text
                      variant="caption"
                      weight="600"
                      textTransform="capitalize"
                      textAlign="center"
                      color={
                        active
                          ? meta.variant === 'danger'
                            ? 'danger'
                            : meta.variant === 'warning'
                            ? 'warning'
                            : 'brand'
                          : 'primary'
                      }
                    >
                      {meta.label}
                    </Text>
                  </Card>
                );
              })}
            </XStack>
          </YStack>
          <Input
            label="Title"
            placeholder="Short summary"
            value={reportTitle}
            onChangeText={setReportTitle}
            accessibilityLabel="Incident title"
          />
          <Input
            label="Location"
            placeholder="e.g. Studio 2, Reception, Rooftop"
            value={reportLocation}
            onChangeText={setReportLocation}
            accessibilityLabel="Incident location"
          />
          <YStack gap="$1">
            <Text variant="caption" color="secondary" fontWeight="600">
              Description
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
                value={reportDescription}
                onChange={(e: any) => setReportDescription(e.target.value)}
                placeholder="What happened? Who is affected?"
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
                aria-label="Incident description"
              />
            </YStack>
          </YStack>
          <Button
            label="Submit report"
            variant="primary"
            size="md"
            fullWidth
            onPress={handleSubmit}
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

function IncidentDetail({
  incident,
  onResolve,
}: {
  incident: Incident;
  onResolve: () => void;
}) {
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
          onPress={onResolve}
          accessibilityLabel="Mark incident as resolved"
          disabled={incident.status === 'resolved'}
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
