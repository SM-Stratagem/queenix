import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Button, Badge, Spacer, EmptyState, Sheet } from '@queenix/ui';
import { useToast } from '@queenix/ui';
import { FileText, CheckCircle, AlertCircle, ChevronRight, Download, Shield, Heart, FileSignature } from '@tamagui/lucide-icons';

interface Document {
  id: string;
  type: 'agreement' | 'waiver' | 'health' | 'rules' | 'parq' | 'consent';
  title: string;
  description: string;
  version: string;
  status: 'signed' | 'unsigned' | 'expired' | 'pending';
  signedAt?: number;
  expiresAt?: number;
  required: boolean;
}

const mockDocuments: Document[] = [
  {
    id: '1',
    type: 'agreement',
    title: 'Membership Agreement',
    description: 'Standard terms and conditions for Queenix Gym membership',
    version: '2.1',
    status: 'signed',
    signedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    required: true,
  },
  {
    id: '2',
    type: 'waiver',
    title: 'Liability Waiver',
    description: 'Acknowledgment of risks associated with physical training',
    version: '1.5',
    status: 'signed',
    signedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    required: true,
  },
  {
    id: '3',
    type: 'health',
    title: 'Health Declaration (PAR-Q)',
    description: 'Physical Activity Readiness Questionnaire',
    version: '1.2',
    status: 'signed',
    signedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    expiresAt: Date.now() + 335 * 24 * 60 * 60 * 1000,
    required: true,
  },
  {
    id: '4',
    type: 'rules',
    title: 'Gym Rules & Code of Conduct',
    description: 'Facility rules, etiquette, and behavioral expectations',
    version: '1.0',
    status: 'signed',
    signedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    required: true,
  },
  {
    id: '5',
    type: 'consent',
    title: 'Photo & Video Consent',
    description: 'Optional consent for promotional photography in facility',
    version: '1.0',
    status: 'unsigned',
    required: false,
  },
  {
    id: '6',
    type: 'parq',
    title: 'Updated PAR-Q 2026',
    description: 'Annual health questionnaire refresh',
    version: '2.0',
    status: 'pending',
    required: true,
  },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Document | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openDoc = (doc: Document) => {
    setSelected(doc);
    setSheetOpen(true);
  };

  const handleSign = () => {
    toast.success(`${selected?.title} signed`);
    setSheetOpen(false);
  };

  const grouped = {
    required: mockDocuments.filter((d) => d.required && d.status !== 'signed'),
    signed: mockDocuments.filter((d) => d.status === 'signed'),
    optional: mockDocuments.filter((d) => !d.required),
  };

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
        {/* Summary */}
        <YStack paddingHorizontal="$4">
          <Card variant="filled">
            <XStack alignItems="center" gap="$3">
              <YStack
                backgroundColor="$brand"
                padding="$3"
                borderRadius="$lg"
              >
                <FileText size={24} color="white" />
              </YStack>
              <YStack flex={1}>
                <Text variant="h4">{grouped.signed.length}/{mockDocuments.length} signed</Text>
                <Text variant="bodySmall" color="muted">
                  {grouped.required.length === 0
                    ? 'All required documents are up to date'
                    : `${grouped.required.length} document(s) need your attention`}
                </Text>
              </YStack>
              {grouped.required.length === 0 ? (
                <CheckCircle size={28} color="$success500" />
              ) : (
                <AlertCircle size={28} color="$warning500" />
              )}
            </XStack>
          </Card>
        </YStack>

        {/* Pending required */}
        {grouped.required.length > 0 && (
          <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
            <Text variant="h4">Action required</Text>
            {grouped.required.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onPress={() => openDoc(doc)}
              />
            ))}
          </YStack>
        )}

        {/* Signed */}
        {grouped.signed.length > 0 && (
          <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
            <Text variant="h4">Signed</Text>
            {grouped.signed.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onPress={() => openDoc(doc)}
              />
            ))}
          </YStack>
        )}

        {/* Optional */}
        {grouped.optional.length > 0 && (
          <YStack paddingHorizontal="$4" marginTop="$4" gap="$2">
            <Text variant="h4">Optional</Text>
            {grouped.optional.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onPress={() => openDoc(doc)}
              />
            ))}
          </YStack>
        )}
      </ScrollView>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen} snapPoints={[70]}>
        {selected && (
          <YStack gap="$3" flex={1}>
            <XStack alignItems="center" gap="$3">
              <YStack
                backgroundColor="$brand50"
                padding="$3"
                borderRadius="$lg"
              >
                <FileText size={24} color="$brand" />
              </YStack>
              <YStack flex={1}>
                <Text variant="h3">{selected.title}</Text>
                <Text variant="caption" color="muted">Version {selected.version}</Text>
              </YStack>
            </XStack>

            <Text variant="body" color="secondary">
              {selected.description}
            </Text>

            <Card variant="outlined" padding="sm">
              <YStack gap="$1">
                <XStack justifyContent="space-between">
                  <Text variant="caption" color="muted">Type</Text>
                  <Text variant="caption" weight="600">{selected.type.toUpperCase()}</Text>
                </XStack>
                <XStack justifyContent="space-between">
                  <Text variant="caption" color="muted">Required</Text>
                  <Text variant="caption" weight="600">{selected.required ? 'Yes' : 'No'}</Text>
                </XStack>
                {selected.signedAt && (
                  <XStack justifyContent="space-between">
                    <Text variant="caption" color="muted">Signed on</Text>
                    <Text variant="caption" weight="600">
                      {new Date(selected.signedAt).toLocaleDateString()}
                    </Text>
                  </XStack>
                )}
                {selected.expiresAt && (
                  <XStack justifyContent="space-between">
                    <Text variant="caption" color="muted">Expires</Text>
                    <Text variant="caption" weight="600">
                      {new Date(selected.expiresAt).toLocaleDateString()}
                    </Text>
                  </XStack>
                )}
              </YStack>
            </Card>

            <YStack flex={1} />

            <YStack gap="$2">
              {selected.status === 'unsigned' || selected.status === 'pending' ? (
                <Button
                  label="Read & sign"
                  onPress={handleSign}
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<FileSignature size={18} color="white" />}
                />
              ) : (
                <Button
                  label="View signed document"
                  onPress={() => toast.info('Opening document...')}
                  variant="outline"
                  size="lg"
                  fullWidth
                  icon={<Download size={18} color="$brand" />}
                />
              )}
            </YStack>
          </YStack>
        )}
      </Sheet>
    </Screen>
  );
}

function DocumentCard({ doc, onPress }: { doc: Document; onPress: () => void }) {
  const iconMap = {
    agreement: Shield,
    waiver: Shield,
    health: Heart,
    rules: FileText,
    parq: Heart,
    consent: FileText,
  } as const;

  const Icon = iconMap[doc.type] || FileText;
  const variant =
    doc.status === 'signed' ? 'success' :
    doc.status === 'pending' ? 'warning' :
    'neutral';

  return (
    <Card variant="outlined" padding="sm" onPress={onPress}>
      <XStack alignItems="center" gap="$3">
        <YStack backgroundColor="$surfaceMuted" padding="$2.5" borderRadius="$md">
          <Icon size={20} color="$textPrimary" />
        </YStack>
        <YStack flex={1}>
          <Text variant="body" weight="600">{doc.title}</Text>
          <Text variant="caption" color="muted">
            v{doc.version} • {doc.required ? 'Required' : 'Optional'}
          </Text>
        </YStack>
        <Badge
          label={doc.status === 'signed' ? 'Signed' : doc.status === 'pending' ? 'Action' : 'Sign'}
          variant={variant}
        />
      </XStack>
    </Card>
  );
}
