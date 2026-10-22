import React, { useState } from 'react';
import { YStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Input, Button } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { Mail, Lock, KeyRound } from '@tamagui/lucide-icons-2';

/** Email-code password reset: request a code, then set a new password. */
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!sent) {
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter your email address');
      setLoading(true);
      const res = await requestPasswordReset(email);
      setLoading(false);
      return res.ok ? setSent(true) : setError(res.error ?? 'Could not send the code');
    }
    if (code.length !== 6) return setError('Enter the 6-digit code');
    if (password.length < 8) return setError('Use at least 8 characters');
    setLoading(true);
    const res = await resetPassword(email, code, password);
    setLoading(false);
    if (res.ok) setDone(true);
    else setError(res.error ?? 'Could not reset the password');
  };

  return (
    <Screen scroll>
      <YStack flex={1} justifyContent="center" paddingVertical="$6" gap="$4">
        <Text variant="h2">Reset password</Text>
        {done ? (
          <>
            <Text variant="body" color="secondary">Your password is updated. Sign in with the new one.</Text>
            <Button label="Back to sign in" onPress={() => router.replace('/(auth)/login')} variant="primary" size="lg" fullWidth />
          </>
        ) : (
          <>
            <Text variant="body" color="secondary">
              {sent ? `If an account exists for ${email.trim()}, a 6-digit code is on its way.` : "We'll email you a 6-digit code."}
            </Text>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              disabled={sent}
              leftIcon={<Mail size={18} color="$textMuted" />}
            />
            {sent && (
              <>
                <Input
                  label="Code"
                  placeholder="6-digit code"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  leftIcon={<KeyRound size={18} color="$textMuted" />}
                />
                <Input
                  label="New password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  autoComplete="new-password"
                  leftIcon={<Lock size={18} color="$textMuted" />}
                />
              </>
            )}
            {error && <Text variant="bodySmall" color="danger" align="center">{error}</Text>}
            <Button label={sent ? 'Set new password' : 'Email me a code'} onPress={submit} loading={loading} variant="primary" size="lg" fullWidth />
            <Text variant="bodySmall" color="brand" align="center" onPress={() => router.back()}>
              Back to sign in
            </Text>
          </>
        )}
      </YStack>
    </Screen>
  );
}
