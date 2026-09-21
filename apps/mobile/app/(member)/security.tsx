import React, { useState } from 'react';
import { YStack, ScrollView } from 'tamagui';
import { Screen, Text, Card, Button, Input, Header, useToast } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { authClient } from '@queenix/auth';

export default function MemberSecurityScreen() {
  const toast = useToast();
  const { session } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  async function onChangePassword() {
    if (!current || !next || !confirm) {
      toast.warning('Fill all three fields');
      return;
    }
    if (next !== confirm) {
      toast.warning('New passwords do not match');
      return;
    }
    if (next.length < 8) {
      toast.warning('New password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      const res: any = await (authClient as any).changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (res?.error) throw new Error(res.error.message ?? 'Change failed');
      toast.success('Password changed — other devices signed out');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Could not change password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded={false}>
      <Header title="Privacy & security" subtitle={session?.email ?? 'Your account'} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack paddingHorizontal="$4" marginTop="$2" gap="$3">
          <Card padded>
            <Text variant="h4">Change password</Text>
            <Text color="$muted" marginTop="$2">Current password</Text>
            <Input value={current} onChangeText={setCurrent} isPassword accessibilityLabel="Current password" />
            <Text color="$muted" marginTop="$2">New password (8+ characters)</Text>
            <Input value={next} onChangeText={setNext} isPassword accessibilityLabel="New password" />
            <Text color="$muted" marginTop="$2">Confirm new password</Text>
            <Input value={confirm} onChangeText={setConfirm} isPassword accessibilityLabel="Confirm new password" />
            <Button marginTop="$3" onPress={onChangePassword} disabled={busy}>
              {busy ? 'Changing…' : 'Change password'}
            </Button>
            <Text variant="caption" color="muted" marginTop="$2">
              Changing signs you out on all other devices.
            </Text>
          </Card>
          <Card padded>
            <Text variant="h4">Your data</Text>
            <Text color="$muted" marginTop="$1">
              Signed in as {session?.email}. Your health details are only visible to you and
              club staff. To delete your account, contact the front desk.
            </Text>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}
