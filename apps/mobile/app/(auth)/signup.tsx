import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Input, Button, Logo, Spacer } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { Mail, Lock, User } from '@tamagui/lucide-icons';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setError(null);
    if (!fullName || !email || !password) {
      setError('Please complete all fields');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const res = await signUp(email, password, fullName);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Sign up failed');
      return;
    }
    router.replace('/(auth)/onboarding');
  };

  return (
    <Screen scroll>
      <YStack flex={1} justifyContent="center" paddingVertical="$6" gap="$4">
        <YStack alignItems="center" gap="$3" marginBottom="$4">
          <Logo size="lg" showText />
          <Text variant="h2" align="center">Create your account</Text>
          <Text variant="body" color="secondary" align="center">
            Join Queenix — where women train their way
          </Text>
        </YStack>

        <YStack gap="$3">
          <Input
            label="Full name"
            placeholder="Your name"
            value={fullName}
            onChangeText={setFullName}
            leftIcon={<User size={18} color="$textMuted" />}
            autoCapitalize="words"
            required
          />
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            leftIcon={<Mail size={18} color="$textMuted" />}
            required
          />
          <Input
            label="Password"
            placeholder="At least 8 characters"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIcon={<Lock size={18} color="$textMuted" />}
            required
            hint="Use 8+ characters with a mix of letters, numbers and symbols"
          />
          <Input
            label="Confirm password"
            placeholder="Re-enter your password"
            value={confirm}
            onChangeText={setConfirm}
            isPassword
            leftIcon={<Lock size={18} color="$textMuted" />}
            required
          />
        </YStack>

        {error && (
          <Text variant="bodySmall" color="danger" align="center">{error}</Text>
        )}

        <Button
          label="Create account"
          onPress={handleSignUp}
          loading={loading}
          variant="primary"
          size="lg"
          fullWidth
        />

        <Text variant="caption" color="muted" align="center">
          By creating an account, you agree to our Terms of Service and Privacy Policy.
        </Text>

        <XStack justifyContent="center" alignItems="center" gap="$1">
          <Text variant="bodySmall" color="secondary">Already have an account?</Text>
          <Text
            variant="bodySmall"
            color="brand"
            fontWeight="600"
            onPress={() => router.back()}
          >
            Sign in
          </Text>
        </XStack>
      </YStack>
    </Screen>
  );
}
