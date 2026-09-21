import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Button, Badge, EmptyState, Sheet, Input, Skeleton, useToast } from '@queenix/ui';
import { FileText, CheckCircle, AlertCircle, ChevronRight, FileSignature } from '@tamagui/lucide-icons';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';

const docsQueries = (api.queries as any).documentsAdmin;
const docsMutations = (api.mutations as any).documents;

type Template = {
  _id: string;
  type: string;
  title: string;
  content: string;
  version: string;
  required: boolean;
  effectiveDate: number;
  mySignature: { signedAt: number; documentVersion: string; signatureData: string } | null;
};

export default function DocumentsScreen() {
  const router = useRouter();
  const toast = useToast();
  const templates = useConvexQuery(docsQueries.listActiveTemplates, {});
  const sign = useConvexMutation(docsMutations.signDocument);

  const [selected, setSelected] = useState<Template | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [busy, setBusy] = useState(false);

  const docs: Template[] = (templates as any[]) ?? [];
  const required = docs.filter((d) => d.required && !d.mySignature);
  const signed = docs.filter((d) => d.mySignature);
  const optional = docs.filter((d) => !d.required && !d.mySignature);

  function openDoc(doc: Template) {
    setSelected(doc);
    setSignerName('');
    setSheetOpen(true);
  }

  async function handleSign() {
    if (!selected) return;
    if (!signerName.trim()) {
      toast.warning('Type your full name to sign');
      return;
    }
    setBusy(true);
    try {
      await sign({ templateId: selected._id as any, signatureData: signerName.trim() });
      toast.success(`${selected.title} signed`);
      setSheetOpen(false);
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not sign');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded={false}>
      <XStack
        paddingTop="$4"
        paddingHorizontal="$4"
        paddingBottom="$3"
        alignItems="center"
        gap="$2"
      >
        <Button
          onPress={() => router.back()}
          variant="ghost"
          size="sm"
          icon={<ChevronRight size={20} color="$textPrimary" style={{ transform: [{ rotate: '180deg' }] }} />}
        />
        <Text variant="h2">Documents</Text>
      </XStack>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {templates === undefined ? (
          <YStack paddingHorizontal="$4" gap="$2">
            <Skeleton height={90} />
            <Skeleton height={76} />
          </YStack>
        ) : (
          <>
            <YStack paddingHorizontal="$4">
              <Card variant="filled">
                <XStack alignItems="center" gap="$3">
                  <YStack backgroundColor="$brand" padding="$3" borderRadius="$lg">
                    <FileText size={24} color="white" />
                  </YStack>
                  <YStack flex={1}>
                    <Text variant="h4">{signed.length}/{docs.length} signed</Text>
                    <Text variant="bodySmall" color="muted">
                      {required.length === 0
                        ? 'All required documents are up to date'
                        : `${required.length} document(s) need your attention`}
                    </Text>
                  </YStack>
                  {required.length === 0 ? (
                    <CheckCircle size={28} color="$success500" />
                  ) : (
                    <AlertCircle size={28} color="$warning500" />
                  )}
                </XStack>
              </Card>
            </YStack>

            {required.length > 0 && (
              <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
                <Text variant="h4">Action required</Text>
                {required.map((doc) => (
                  <DocumentCard key={String(doc._id)} doc={doc} onPress={() => openDoc(doc)} />
                ))}
              </YStack>
            )}

            {signed.length > 0 && (
              <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
                <Text variant="h4">Signed</Text>
                {signed.map((doc) => (
                  <DocumentCard key={String(doc._id)} doc={doc} onPress={() => openDoc(doc)} />
                ))}
              </YStack>
            )}

            {optional.length > 0 && (
              <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
                <Text variant="h4">Optional</Text>
                {optional.map((doc) => (
                  <DocumentCard key={String(doc._id)} doc={doc} onPress={() => openDoc(doc)} />
                ))}
              </YStack>
            )}

            {docs.length === 0 && (
              <YStack paddingHorizontal="$4" marginTop="$4">
                <EmptyState title="No documents" message="The club has not published any documents yet." />
              </YStack>
            )}
          </>
        )}
      </ScrollView>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} snapPoints={[80]}>
        {selected && (
          <YStack gap="$3" flex={1}>
            <XStack alignItems="center" gap="$3">
              <YStack backgroundColor="$brand50" padding="$3" borderRadius="$lg">
                <FileText size={24} color="$brand" />
              </YStack>
              <YStack flex={1}>
                <Text variant="h3">{selected.title}</Text>
                <Text variant="caption" color="muted">Version {selected.version}</Text>
              </YStack>
              {selected.mySignature ? (
                <Badge label="Signed" variant="success" size="sm" />
              ) : selected.required ? (
                <Badge label="Required" variant="warning" size="sm" />
              ) : (
                <Badge label="Optional" variant="neutral" size="sm" />
              )}
            </XStack>

            <ScrollView style={{ maxHeight: 220 }}>
              <Text variant="body" color="secondary">
                {selected.content}
              </Text>
            </ScrollView>

            {selected.mySignature ? (
              <Card variant="outlined" padding="sm">
                <YStack gap="$1">
                  <XStack justifyContent="space-between">
                    <Text variant="caption" color="muted">Signed by</Text>
                    <Text variant="caption" weight="600">{selected.mySignature.signatureData}</Text>
                  </XStack>
                  <XStack justifyContent="space-between">
                    <Text variant="caption" color="muted">Signed on</Text>
                    <Text variant="caption" weight="600">
                      {new Date(selected.mySignature.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                  </XStack>
                  <XStack justifyContent="space-between">
                    <Text variant="caption" color="muted">Version</Text>
                    <Text variant="caption" weight="600">{selected.mySignature.documentVersion}</Text>
                  </XStack>
                </YStack>
              </Card>
            ) : (
              <YStack gap="$2">
                <Text variant="caption" color="muted">
                  Type your full name below — it is recorded as your signature.
                </Text>
                <Input
                  value={signerName}
                  onChangeText={setSignerName}
                  placeholder="Full legal name"
                  accessibilityLabel="Signature name"
                />
                <Button
                  label={busy ? 'Signing…' : 'Read & sign'}
                  onPress={handleSign}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={busy}
                  icon={<FileSignature size={18} color="white" />}
                />
              </YStack>
            )}
            <YStack flex={1} />
          </YStack>
        )}
      </Sheet>
    </Screen>
  );
}

function DocumentCard({ doc, onPress }: { doc: Template; onPress: () => void }) {
  return (
    <Card variant="outlined" padding="sm" onPress={onPress}>
      <XStack alignItems="center" gap="$3">
        <YStack flex={1}>
          <Text variant="body" weight="500">{doc.title}</Text>
          <Text variant="caption" color="muted">
            v{doc.version}
            {doc.mySignature
              ? ` · signed ${new Date(doc.mySignature.signedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`
              : doc.required ? ' · needs signature' : ' · optional'}
          </Text>
        </YStack>
        <ChevronRight size={18} color="$textMuted" />
      </XStack>
    </Card>
  );
}
