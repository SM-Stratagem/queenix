/**
 * Member profile → "Verify your ID": photo of Emirates ID / passport → OCR →
 * editable review → confirm → saved as self-scanned (staff can re-verify at the desk).
 */
import React, { useState } from 'react';
import { XStack, YStack } from 'tamagui';
import { Button, Card, Input, Text, useToast } from '@queenix/ui';
import { api, identityFromOcr, type IdentityDraft, type OcrResult } from '@queenix/convex';
import { useConvexMutation } from '@/lib/convex';
import { ocrScan, pickPhoto, uploadPhoto, type Photo } from '@/lib/ocr';

const FIELDS: Array<[keyof IdentityDraft, string]> = [
  ['docNumber', 'Document number'],
  ['fullName', 'Full name'],
  ['nationality', 'Nationality'],
  ['dateOfBirth', 'Date of birth (YYYY-MM-DD)'],
  ['expiryDate', 'Expiry date (YYYY-MM-DD)'],
  ['sex', 'Sex (M/F)'],
];

export function VerifyIdCard({ identity, userId }: { identity?: any; userId?: string }) {
  const toast = useToast();
  const save = useConvexMutation(api.mutations.scans.saveIdentity);
  const generateUploadUrl = useConvexMutation(api.mutations.scans.generateUploadUrl);
  const [docType, setDocType] = useState<'emirates_id' | 'passport'>('emirates_id');
  const [scan, setScan] = useState<{ photo: Photo; result: OcrResult } | null>(null);
  const [draft, setDraft] = useState<IdentityDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const fail = (e: any) => toast.error(e?.data?.message ?? e?.message ?? 'Something went wrong');

  async function scanFrom(source: 'camera' | 'library') {
    try {
      const photo = await pickPhoto(source);
      if (!photo) return;
      setBusy(true);
      const result = await ocrScan(docType, photo);
      setScan({ photo, result });
      setDraft(identityFromOcr(result));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!scan || !draft) return;
    setBusy(true);
    try {
      const scanStorageId = await uploadPhoto(generateUploadUrl, scan.photo);
      await save({ ...draft, scanStorageId });
      toast.success('ID saved');
      setScan(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  const verifiedByStaff = identity && userId && String(identity.verifiedBy) !== String(userId);
  return (
    <Card variant="outlined">
      <Text variant="label" marginBottom="$2">Verify your ID</Text>
      {identity && !scan && (
        <Text variant="caption" color="muted" marginBottom="$2">
          {`${identity.docType === 'passport' ? 'Passport' : 'Emirates ID'} ${identity.docNumber} · ${
            verifiedByStaff ? 'verified by staff' : 'self-scanned, staff will confirm at the desk'
          }`}
        </Text>
      )}
      {!scan ? (
        <YStack gap="$2">
          <XStack gap="$2">
            {(['emirates_id', 'passport'] as const).map((t) => (
              <Button
                key={t}
                size="sm"
                label={t === 'passport' ? 'Passport' : 'Emirates ID'}
                variant={docType === t ? 'primary' : 'outline'}
                onPress={() => setDocType(t)}
              />
            ))}
          </XStack>
          <XStack gap="$2">
            <Button size="sm" label={busy ? 'Reading…' : 'Take photo'} disabled={busy} onPress={() => scanFrom('camera')} />
            <Button size="sm" variant="outline" label="From library" disabled={busy} onPress={() => scanFrom('library')} />
          </XStack>
        </YStack>
      ) : (
        <YStack gap="$2">
          <Text variant="caption" color="muted">
            {`Read with ${Math.round(scan.result.confidence * 100)}% confidence. Check every field against your card (Arabic isn't read).`}
          </Text>
          {scan.result.warnings.map((w) => (
            <Text key={w} variant="caption" color="warning">{w}</Text>
          ))}
          {draft &&
            FIELDS.map(([k, label]) => (
              <Input
                key={k}
                label={label}
                aria-label={label}
                value={draft[k]}
                disabled={busy}
                onChangeText={(v: string) => setDraft({ ...draft, [k]: v })}
              />
            ))}
          <XStack gap="$2">
            <Button size="sm" label={busy ? 'Saving…' : 'Confirm & save'} disabled={busy} onPress={confirm} />
            <Button size="sm" variant="ghost" label="Discard" onPress={() => setScan(null)} />
          </XStack>
        </YStack>
      )}
    </Card>
  );
}
