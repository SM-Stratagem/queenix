import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { Screen, Text, Card, Button, Input, Header, Skeleton, EmptyState, useToast } from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';

const usersMutations = (api.mutations as any).users;

type Vehicle = { plate: string; make?: string; model?: string; color?: string };

export default function MemberVehiclesScreen() {
  const toast = useToast();
  const profile = useConvexQuery(api.queries.users.getMemberProfile, {});
  const save = useConvexMutation(usersMutations.updateMyProfile);

  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [busy, setBusy] = useState(false);

  const vehicles: Vehicle[] = (profile as any)?.vehicles ?? [];

  async function persist(next: Vehicle[], msg: string) {
    setBusy(true);
    try {
      await save({ vehicles: next });
      toast.success(msg);
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not save vehicles');
    } finally {
      setBusy(false);
    }
  }

  async function onAdd() {
    if (!plate.trim()) {
      toast.warning('Enter the plate number');
      return;
    }
    await persist(
      [...vehicles, { plate: plate.trim().toUpperCase(), make: make.trim() || undefined, model: model.trim() || undefined, color: color.trim() || undefined }],
      'Vehicle added'
    );
    setPlate('');
    setMake('');
    setModel('');
    setColor('');
  }

  async function onRemove(idx: number) {
    await persist(vehicles.filter((_, i) => i !== idx), 'Vehicle removed');
  }

  return (
    <Screen padded={false}>
      <Header title="Vehicles & parking" subtitle="Plates the valet will recognise" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
          {profile === undefined ? (
            <Skeleton height={120} />
          ) : vehicles.length === 0 ? (
            <EmptyState title="No vehicles yet" message="Add your car below for valet and parking." />
          ) : (
            vehicles.map((v, i) => (
              <Card key={`${v.plate}-${i}`} padded>
                <XStack justifyContent="space-between" alignItems="center">
                  <YStack gap="$1">
                    <Text weight="bold">{v.plate}</Text>
                    <Text color="$muted">{[v.make, v.model, v.color].filter(Boolean).join(' · ') || 'Car'}</Text>
                  </YStack>
                  <Button size="sm" variant="secondary" onPress={() => onRemove(i)} disabled={busy}>
                    Remove
                  </Button>
                </XStack>
              </Card>
            ))
          )}
          <Card padded>
            <Text variant="h4">Add vehicle</Text>
            <Text color="$muted" marginTop="$2">Plate number</Text>
            <Input value={plate} onChangeText={setPlate} placeholder="DXB 12345" autoCapitalize="characters" />
            <Text color="$muted" marginTop="$2">Make (optional)</Text>
            <Input value={make} onChangeText={setMake} placeholder="Tesla" />
            <Text color="$muted" marginTop="$2">Model (optional)</Text>
            <Input value={model} onChangeText={setModel} placeholder="Model 3" />
            <Text color="$muted" marginTop="$2">Color (optional)</Text>
            <Input value={color} onChangeText={setColor} placeholder="White" />
            <Button marginTop="$3" onPress={onAdd} disabled={busy}>
              {busy ? 'Saving…' : 'Add vehicle'}
            </Button>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
