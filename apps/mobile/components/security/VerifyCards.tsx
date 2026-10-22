import React, { useState } from 'react';
import { XStack } from 'tamagui';
import { Badge, Button, Card, Input, Text, useToast } from '@queenix/ui';
import { useAuth } from '@/lib/auth';

/** Email verification: code is emailed at sign-up; resend + enter it here. */
export function EmailVerifyCard() {
  const { session, sendEmailCode, verifyEmail } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  if (!session) return null;

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.ok) toast.success(ok);
    else toast.error(res.error ?? 'Something went wrong');
  };

  return (
    <Card padded>
      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="h4">Email</Text>
        <Badge label={session.emailVerified ? 'Verified' : 'Not verified'} variant={session.emailVerified ? 'success' : 'warning'} size="sm" />
      </XStack>
      <Text color="$muted" marginTop="$1">{session.email}</Text>
      {!session.emailVerified && (
        <>
          <Input
            marginTop="$2"
            label="Verification code"
            placeholder="6-digit code from your email"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
          />
          <XStack gap="$2" marginTop="$2">
            <Button label="Verify" variant="primary" disabled={busy || code.length !== 6} onPress={() => run(() => verifyEmail(code), 'Email verified')} />
            <Button label="Resend code" variant="ghost" disabled={busy} onPress={() => run(sendEmailCode, 'Code sent — check your inbox')} />
          </XStack>
        </>
      )}
    </Card>
  );
}

/** Add or change the phone used for SMS sign-in. */
export function PhoneCard() {
  const { session, sendPhoneCode, confirmPhone } = useAuth();
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!session) return null;

  const send = async () => {
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) return toast.warning('Use your number with country code, e.g. +971501234567');
    setBusy(true);
    const res = await sendPhoneCode(phone);
    setBusy(false);
    if (res.ok) setSent(true);
    else toast.error(res.error ?? 'Could not send the code');
  };
  const confirm = async () => {
    setBusy(true);
    const res = await confirmPhone(phone, code);
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? 'That code did not work');
    toast.success('Phone verified — you can now sign in by SMS');
    setSent(false);
    setPhone('');
    setCode('');
  };

  return (
    <Card padded>
      <XStack justifyContent="space-between" alignItems="center">
        <Text variant="h4">Phone</Text>
        {session.phoneNumber ? <Badge label="Verified" variant="success" size="sm" /> : null}
      </XStack>
      <Text color="$muted" marginTop="$1">
        {session.phoneNumber ? `${session.phoneNumber} · used for SMS sign-in` : 'Add a phone to sign in with an SMS code.'}
      </Text>
      <Input
        marginTop="$2"
        label={session.phoneNumber ? 'New phone number' : 'Phone number'}
        placeholder="+971 50 123 4567"
        value={phone}
        onChangeText={(t) => setPhone(t.replace(/[^\d+]/g, ''))}
        keyboardType="phone-pad"
        disabled={sent}
      />
      {sent && (
        <Input
          marginTop="$2"
          label="SMS code"
          placeholder="6-digit code"
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
        />
      )}
      <Button
        marginTop="$2"
        label={sent ? 'Confirm phone' : 'Text me a code'}
        variant="primary"
        disabled={busy || (sent && code.length !== 6)}
        onPress={sent ? confirm : send}
      />
    </Card>
  );
}
