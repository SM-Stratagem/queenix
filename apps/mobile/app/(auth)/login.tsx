import React, { useState } from 'react';
import { YStack, XStack } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Input, Button, Logo } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { Mail, Lock, Phone, KeyRound } from '@tamagui/lucide-icons-2';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, sendPhoneCode, signInWithPhone } = useAuth();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) => {
    setError(null);
    setLoading(true);
    const res = await fn();
    setLoading(false);
    if (!res.ok) setError(res.error ?? 'Something went wrong');
    else onOk?.();
  };

  const onEmail = () => {
    if (!email || !password) return setError('Please enter your email and password');
    void run(() => signIn(email, password));
  };

  const onPhone = () => {
    // E.164: the SMS gateway needs the country code (UAE = +971).
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) return setError('Enter your number with country code, e.g. +971501234567');
    if (!codeSent) void run(() => sendPhoneCode(phone), () => setCodeSent(true));
    else if (code.trim().length !== 6) setError('Enter the 6-digit code');
    else void run(() => signInWithPhone(phone, code));
  };

  return (
    <Screen scroll>
      <YStack flex={1} justifyContent="center" paddingVertical="$6" gap="$4">
        <YStack alignItems="center" gap="$3" marginBottom="$4">
          <Logo size="xl" showText />
          <Text variant="h2" align="center">Welcome back</Text>
          <Text variant="body" color="secondary" align="center">
            Premium women's fitness, designed for you
          </Text>
        </YStack>

        <XStack backgroundColor="$surfaceMuted" borderRadius="$lg" padding="$1" alignSelf="stretch">
          {(['email', 'phone'] as const).map((m) => (
            <Button
              key={m}
              label={m === 'email' ? 'Email' : 'Phone'}
              onPress={() => {
                setMode(m);
                setError(null);
              }}
              variant={mode === m ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
            />
          ))}
        </XStack>

        {mode === 'email' ? (
          <YStack gap="$3">
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon={<Mail size={18} color="$textMuted" />}
              required
            />
            <Input
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoComplete="password"
              leftIcon={<Lock size={18} color="$textMuted" />}
              required
            />
            <Text variant="caption" color="brand" align="right" onPress={() => router.push('/(auth)/forgot-password')}>
              Forgot password?
            </Text>
          </YStack>
        ) : (
          <YStack gap="$3">
            <Input
              label="Phone number"
              placeholder="+971 50 123 4567"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^\d+]/g, ''))}
              keyboardType="phone-pad"
              autoComplete="tel"
              disabled={codeSent}
              leftIcon={<Phone size={18} color="$textMuted" />}
              required
            />
            {codeSent && (
              <>
                <Input
                  label="SMS code"
                  placeholder="6-digit code"
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  autoComplete="sms-otp"
                  textContentType="oneTimeCode"
                  leftIcon={<KeyRound size={18} color="$textMuted" />}
                  required
                />
                <Text
                  variant="caption"
                  color="brand"
                  align="right"
                  onPress={() => {
                    setCodeSent(false);
                    setCode('');
                  }}
                >
                  Use a different number
                </Text>
              </>
            )}
          </YStack>
        )}

        {error && (
          <Text variant="bodySmall" color="danger" align="center">{error}</Text>
        )}

        <Button
          label={mode === 'email' ? 'Sign in' : codeSent ? 'Verify & sign in' : 'Text me a code'}
          onPress={mode === 'email' ? onEmail : onPhone}
          loading={loading}
          variant="primary"
          size="lg"
          fullWidth
        />

        <XStack justifyContent="center" alignItems="center" gap="$1" marginTop="$3">
          <Text variant="bodySmall" color="secondary">Don't have an account?</Text>
          <Text variant="bodySmall" color="brand" fontWeight="600" onPress={() => router.push('/(auth)/signup')}>
            Sign up
          </Text>
        </XStack>
      </YStack>
    </Screen>
  );
}
