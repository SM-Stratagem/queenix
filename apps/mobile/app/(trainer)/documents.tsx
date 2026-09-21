import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Badge,
  Input,
  Button,
  Header,
  Skeleton,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';
import { FileCheck, ShieldCheck, ShieldAlert, ShieldX, Infinity as InfinityIcon } from '@tamagui/lucide-icons';

type Cert = {
  name: string;
  issuer: string;
  issuedAt: number;
  expiresAt?: number | null;
  documentUrl?: string | null;
};

type Validity = 'valid' | 'expiring' | 'expired' | 'lifetime';

function validityOf(cert: Cert): Validity {
  if (!cert.expiresAt) return 'lifetime';
  const ms = cert.expiresAt - Date.now();
  if (ms < 0) return 'expired';
  if (ms < 60 * 24 * 60 * 60 * 1000) return 'expiring';
  return 'valid';
}

const VALIDITY_META: Record<Validity, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  valid: { label: 'Valid', variant: 'success' },
  expiring: { label: 'Expiring soon', variant: 'warning' },
  expired: { label: 'Expired', variant: 'danger' },
  lifetime: { label: 'No expiry', variant: 'info' },
};

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TrainerDocuments() {
  const router = useRouter();
  const toast = useToast();
  const profile = useConvexQuery(api.queries.users.getMyTrainerProfile, {});
  const addCert = useConvexMutation(api.mutations.users.addTrainerCertification);

  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issued, setIssued] = useState(todayInput());
  const [expires, setExpires] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const certs: Cert[] = (profile as any)?.certifications ?? [];
  const expiredCount = certs.filter((c) => validityOf(c) === 'expired').length;

  async function onAdd() {
    setError(null);
    if (!name.trim() || !issuer.trim()) {
      setError('Name and issuer are required.');
      return;
    }
    const issuedAt = Date.parse(`${issued}T12:00:00`);
    if (!Number.isFinite(issuedAt)) {
      setError('Issued date must be YYYY-MM-DD.');
      return;
    }
    let expiresAt: number | undefined;
    if (expires.trim()) {
      expiresAt = Date.parse(`${expires.trim()}T12:00:00`);
      if (!Number.isFinite(expiresAt)) {
        setError('Expiry date must be YYYY-MM-DD or empty.');
        return;
      }
    }
    setBusy(true);
    try {
      await addCert({
        name: name.trim(),
        issuer: issuer.trim(),
        issuedAt,
        expiresAt,
        documentUrl: docUrl.trim() || undefined,
      });
      toast.success('Document added');
      setName('');
      setIssuer('');
      setExpires('');
      setDocUrl('');
    } catch (e: any) {
      setError(e?.data?.message ?? e?.message ?? 'Could not add document.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Header title="Documents" onBack={() => router.back()} />
      <YStack paddingHorizontal="$4" paddingBottom="$6" gap="$4">
        <YStack gap="$1">
          <Text variant="h2">Certifications</Text>
          <Text variant="bodySmall" color="muted">
            Upload your credentials — expiry is checked automatically
            {expiredCount > 0 ? ` · ${expiredCount} expired` : ''}.
          </Text>
        </YStack>

        {profile === undefined ? (
          <YStack gap="$2">
            <Skeleton height={92} borderRadius="$md" />
            <Skeleton height={92} borderRadius="$md" />
          </YStack>
        ) : certs.length === 0 ? (
          <EmptyState
            icon={<FileCheck size={48} color="$textMuted" />}
            title="No documents yet"
            message="Add your first certification below."
          />
        ) : (
          <YStack gap="$2">
            {certs.map((c, i) => {
              const v = validityOf(c);
              const meta = VALIDITY_META[v];
              const Icon =
                v === 'valid' ? ShieldCheck : v === 'expiring' ? ShieldAlert : v === 'expired' ? ShieldX : InfinityIcon;
              return (
                <Card key={`${c.name}-${i}`} variant="outlined" padding="sm">
                  <XStack alignItems="center" gap="$3">
                    <Icon size={22} color="$brand" />
                    <YStack flex={1} gap="$1">
                      <Text weight="600">{c.name}</Text>
                      <Text variant="bodySmall" color="muted">
                        {c.issuer} · issued {fmtDate(c.issuedAt)}
                        {c.expiresAt ? ` · expires ${fmtDate(c.expiresAt)}` : ' · no expiry'}
                      </Text>
                    </YStack>
                    <Badge label={meta.label} variant={meta.variant} size="sm" />
                  </XStack>
                </Card>
              );
            })}
          </YStack>
        )}

        <YStack gap="$2" marginTop="$2">
          <Text variant="h4">Add document</Text>
          <Input placeholder="Certificate name" value={name} onChangeText={setName} accessibilityLabel="Certificate name" />
          <Input placeholder="Issuer" value={issuer} onChangeText={setIssuer} accessibilityLabel="Issuer" />
          <XStack gap="$2">
            <YStack flex={1} gap="$1">
              <Text variant="caption" color="muted">
                Issued (YYYY-MM-DD)
              </Text>
              <Input value={issued} onChangeText={setIssued} accessibilityLabel="Issued date" />
            </YStack>
            <YStack flex={1} gap="$1">
              <Text variant="caption" color="muted">
                Expires (optional)
              </Text>
              <Input value={expires} onChangeText={setExpires} accessibilityLabel="Expiry date" />
            </YStack>
          </XStack>
          <Input
            placeholder="Document URL (optional)"
            value={docUrl}
            onChangeText={setDocUrl}
            accessibilityLabel="Document URL"
          />
          {error && (
            <Text variant="bodySmall" color="danger">
              {error}
            </Text>
          )}
          <Button
            label={busy ? 'Adding…' : 'Add document'}
            onPress={onAdd}
            variant="primary"
            size="lg"
            disabled={busy}
          />
        </YStack>
      </YStack>
    </Screen>
  );
}
