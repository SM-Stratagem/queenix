import React, { useEffect, useState } from 'react';
import { YStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen, Text, Card, Button, Input, Header, Skeleton, EmptyState, useToast,
} from '@queenix/ui';
import { useConvexQuery, useConvexMutation } from '@/lib/convex';
import { api } from '@queenix/convex';

export default function OwnerBranchScreen() {
  const router = useRouter();
  const toast = useToast();
  const branches = useConvexQuery(api.queries.branches.branchesList, {});
  const update = useConvexMutation(api.mutations.branches.updateBranch);

  const list: any[] = branches ?? [];
  const branch = list.find((b) => b.isActive) ?? list[0];

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [primed, setPrimed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (branch && !primed) {
      setName(branch.name ?? '');
      setCity(branch.city ?? '');
      setAddress(branch.address ?? '');
      setPhone(branch.phone ?? '');
      setPrimed(true);
    }
  }, [branch, primed]);

  async function onSave() {
    if (!branch) return;
    if (!name.trim() || !city.trim()) {
      toast.warning('Name and city are required');
      return;
    }
    setBusy(true);
    try {
      await update({
        branchId: branch._id as any,
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      toast.success('Branch updated');
    } catch (e: any) {
      toast.error(e?.data?.message ?? e?.message ?? 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <Header title="Gym info" subtitle={branch ? `${branch.name} · ${branch.city}` : 'Club details'} onBack={() => router.back()} />
      <YStack paddingHorizontal="$4" paddingBottom="$6" gap="$3">
        {branches === undefined ? (
          <Skeleton height={220} />
        ) : !branch ? (
          <EmptyState title="No branch yet" message="Create one in the web admin first." />
        ) : (
          <Card padded>
            <Text variant="h4">Club details</Text>
            <Text color="$muted" marginTop="$2">Name</Text>
            <Input value={name} onChangeText={setName} accessibilityLabel="Branch name" />
            <Text color="$muted" marginTop="$2">City</Text>
            <Input value={city} onChangeText={setCity} accessibilityLabel="City" />
            <Text color="$muted" marginTop="$2">Address (optional)</Text>
            <Input value={address} onChangeText={setAddress} accessibilityLabel="Address" />
            <Text color="$muted" marginTop="$2">Phone (optional)</Text>
            <Input value={phone} onChangeText={setPhone} accessibilityLabel="Phone" />
            <Button marginTop="$3" label={busy ? 'Saving…' : 'Save changes'} onPress={onSave} variant="primary" size="lg" disabled={busy} />
          </Card>
        )}
      </YStack>
    </Screen>
  );
}
