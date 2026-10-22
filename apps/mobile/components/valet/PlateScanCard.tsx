/**
 * Ops valet: "Scan plate" → OCR → editable plate → members whose saved vehicle
 * matches → check in (valet.staffCheckIn). No match: plate stays for the web desk.
 */
import React, { useState } from 'react';
import { XStack, YStack } from 'tamagui';
import { Button, Card, Input, Text, useToast } from '@queenix/ui';
import { api, type OcrResult } from '@queenix/convex';
import { useConvexMutation, useConvexQuery } from '@/lib/convex';
import { ocrScan, pickPhoto } from '@/lib/ocr';

export function PlateScanCard() {
  const toast = useToast();
  const [plate, setPlate] = useState('');
  const [result, setResult] = useState<OcrResult | null>(null);
  const [busy, setBusy] = useState(false);
  const matches = useConvexQuery(api.queries.valet.membersByPlate, plate.trim().length >= 2 ? { plate } : 'skip');
  const checkIn = useConvexMutation(api.mutations.valet.staffCheckIn);
  const fail = (e: any) => toast.error(e?.data?.message ?? e?.message ?? 'Something went wrong');

  async function scan() {
    try {
      const photo = await pickPhoto('camera');
      if (!photo) return;
      setBusy(true);
      const r = await ocrScan('plate', photo);
      setResult(r);
      setPlate(r.fields?.plate ?? '');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(userId: string, name: string) {
    try {
      await checkIn({ userId: userId as any, plate });
      toast.success(`${plate} checked in for ${name}`);
      setPlate('');
      setResult(null);
    } catch (e) {
      fail(e);
    }
  }

  return (
    <Card padded>
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text weight="bold">Check in a car</Text>
          <Button size="sm" label={busy ? 'Reading…' : 'Scan plate'} disabled={busy} onPress={scan} />
        </XStack>
        {result && (
          <Text size="sm" color="$muted">
            {`${Math.round(result.confidence * 100)}% confidence — check the plate.${result.warnings.length ? ` ${result.warnings.join(' ')}` : ''}`}
          </Text>
        )}
        <Input aria-label="Plate" placeholder="Plate" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
        {plate.trim().length >= 2 &&
          (matches === undefined ? null : matches.length === 0 ? (
            <Text size="sm" color="$muted">No saved vehicle matches — check in from the web valet desk.</Text>
          ) : (
            matches.map((m: any) => (
              <XStack key={`${m.userId}${m.vehicle.plate}`} justifyContent="space-between" alignItems="center">
                <Text>{`${m.fullName} · ${m.vehicle.plate}`}</Text>
                <Button size="sm" label="Check in" onPress={() => confirm(m.userId, m.fullName)} />
              </XStack>
            ))
          ))}
      </YStack>
    </Card>
  );
}
