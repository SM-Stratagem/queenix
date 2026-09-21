import React, { useEffect, useState } from 'react';
import { YStack, ScrollView } from 'tamagui';
import { Screen, Text, Card, Button, Input, Header, Skeleton, useToast } from '@queenix/ui';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';

const usersMutations = (api.mutations as any).users;

export default function MemberHealthScreen() {
  const toast = useToast();
  const profile = useConvexQuery(api.queries.users.getMemberProfile, {});
  const save = useConvexMutation(usersMutations.updateMyProfile);

  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRel, setEcRel] = useState('');
  const [primed, setPrimed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile && !primed) {
      setDob((profile as any).dateOfBirth ?? '');
      setGender((profile as any).gender ?? '');
      const ec = (profile as any).emergencyContact;
      if (ec) {
        setEcName(ec.name ?? '');
        setEcPhone(ec.phone ?? '');
        setEcRel(ec.relationship ?? '');
      }
      setPrimed(true);
    }
  }, [profile, primed]);

  async function onSave() {
    if (!ecName.trim() || !ecPhone.trim()) {
      toast.warning('Emergency contact name and phone are required');
      return;
    }
    setBusy(true);
    try {
      await save({
        dateOfBirth: dob.trim() || undefined,
        gender: gender.trim() || undefined,
        emergencyContact: {
          name: ecName.trim(),
          phone: ecPhone.trim(),
          relationship: ecRel.trim() || undefined,
        },
      });
      toast.success('Health details saved');
    } catch (err: any) {
      toast.error(err?.data?.message ?? err?.message ?? 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded={false}>
      <Header title="Health & preferences" subtitle="Used by trainers in an emergency" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
          {profile === undefined ? (
            <Skeleton height={220} />
          ) : (
            <>
              <Card padded>
                <Text variant="h4">About you</Text>
                <Text color="$muted" marginTop="$2">Date of birth (YYYY-MM-DD)</Text>
                <Input value={dob} onChangeText={setDob} placeholder="1990-05-14" />
                <Text color="$muted" marginTop="$2">Gender</Text>
                <Input value={gender} onChangeText={setGender} placeholder="Female" />
              </Card>
              <Card padded>
                <Text variant="h4">Emergency contact</Text>
                <Text color="$muted" marginTop="$2">Full name</Text>
                <Input value={ecName} onChangeText={setEcName} placeholder="Sara Khan" />
                <Text color="$muted" marginTop="$2">Phone</Text>
                <Input value={ecPhone} onChangeText={setEcPhone} placeholder="+971 50 000 0000" />
                <Text color="$muted" marginTop="$2">Relationship (optional)</Text>
                <Input value={ecRel} onChangeText={setEcRel} placeholder="Sister" />
              </Card>
              <Button onPress={onSave} disabled={busy}>
                {busy ? 'Saving…' : 'Save health details'}
              </Button>
            </>
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}
