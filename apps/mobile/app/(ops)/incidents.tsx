import React, { useState, useMemo } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import {
  Screen,
  Text,
  Card,
  Button,
  Input,
  Sheet,
  Header,
  Skeleton,
  ErrorState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import { useRouter } from 'expo-router';
import {
  Plus,
  CheckCircle2,
} from '@tamagui/lucide-icons';
import {
  TYPE_META,
  SEVERITY_META,
  type Severity,
  type IncidentType,
  type IncidentStatus,
  type Incident,
} from '@/components/incidents/meta';
import { SeverityStat } from '@/components/incidents/SeverityStat';
import { IncidentCard } from '@/components/incidents/IncidentCard';
import { IncidentDetail } from '@/components/incidents/IncidentDetail';

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

