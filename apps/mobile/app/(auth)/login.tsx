import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Input, Button, Logo, Spacer } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { Mail, Lock, Phone } from '@tamagui/lucide-icons';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, sendOtp } = useAuth();
  const [mode, setMode] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailLogin = async () => {
    setError(null);
    if (!email || !password) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (!res.ok) setError(res.error ?? 'Sign in failed');
  };

  const handlePhoneLogin = async () => {
    setError(null);
    if (!phone || phone.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    const res = await sendOtp(phone);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to send code');
      return;
    }
    router.push({ pathname: '/(auth)/otp', params: { phone } });
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

        <XStack
          backgroundColor="$surfaceMuted"
          borderRadius="$lg"
          padding="$1"
          alignSelf="stretch"
        >
          <Button
            label="Email"
            onPress={() => setMode('email')}
            variant={mode === 'email' ? 'primary' : 'ghost'}
            size="sm"
            fullWidth
          />
          <Button
            label="Phone"
            onPress={() => setMode('phone')}
            variant={mode === 'phone' ? 'primary' : 'ghost'}
            size="sm"
            fullWidth
          />
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
            <Text
              variant="caption"
              color="brand"
              align="right"
              onPress={() => {/* TODO: forgot password */}}
            >
              Forgot password?
            </Text>
          </YStack>
        ) : (
          <Input
            label="Phone number"
            placeholder="+971 50 123 4567"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            leftIcon={<Phone size={18} color="$textMuted" />}
            required
          />
        )}

        {error && (
          <Text variant="bodySmall" color="danger" align="center">{error}</Text>
        )}

        <Button
          label={mode === 'email' ? 'Sign in' : 'Send code'}
          onPress={mode === 'email' ? handleEmailLogin : handlePhoneLogin}
          loading={loading}
          variant="primary"
          size="lg"
          fullWidth
        />

        <XStack justifyContent="center" alignItems="center" gap="$1" marginTop="$3">
          <Text variant="bodySmall" color="secondary">Don't have an account?</Text>
          <Text
            variant="bodySmall"
            color="brand"
            fontWeight="600"
            onPress={() => router.push('/(auth)/signup')}
          >
            Sign up
          </Text>
        </XStack>
      </YStack>
    </Screen>
  );
}
