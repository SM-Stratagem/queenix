import React, { useState, useRef, useEffect } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Text, Button, Logo, Input, Spacer } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useToast } from '@queenix/ui';

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const { verifyOtp } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<(any | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const handleChange = (text: string, idx: number) => {
    if (!/^\d?$/.test(text)) return;
    const next = [...code];
    next[idx] = text;
    setCode(next);
    if (text && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }
    if (next.every((c) => c !== '') && next.length === 6) {
      handleVerify(next.join(''));
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const finalCode = fullCode ?? code.join('');
    if (finalCode.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setLoading(true);
    const res = await verifyOtp(phone ?? '', finalCode);
    setLoading(false);
    if (res.ok) {
      toast.success('Phone verified');
      router.replace('/(auth)/onboarding');
    } else {
      toast.error(res.error ?? 'Invalid code');
    }
  };

  return (
    <Screen scroll>
      <YStack flex={1} justifyContent="center" paddingVertical="$6" gap="$4">
        <YStack alignItems="center" gap="$3" marginBottom="$4">
          <Logo size="lg" showText />
          <Text variant="h2" align="center">Enter verification code</Text>
          <Text variant="body" color="secondary" align="center" maxWidth={280}>
            We sent a 6-digit code to {phone}. Enter it below to continue.
          </Text>
        </YStack>

        <XStack justifyContent="space-between" gap="$2" alignSelf="stretch">
          {code.map((digit, idx) => (
            <Input
              key={idx}
              ref={(el) => (inputs.current[idx] = el)}
              value={digit}
              onChangeText={(t) => handleChange(t, idx)}
              onKeyPress={(e) => handleKeyPress(e, idx)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              size="lg"
              width={48}
              paddingHorizontal="$0"
              accessibilityLabel={`Digit ${idx + 1}`}
            />
          ))}
        </XStack>

        <Button
          label="Verify code"
          onPress={() => handleVerify()}
          loading={loading}
          variant="primary"
          size="lg"
          fullWidth
        />

        <XStack justifyContent="center" alignItems="center" gap="$1">
          <Text variant="bodySmall" color="secondary">Didn't receive a code?</Text>
          <Text variant="bodySmall" color="brand" fontWeight="600" onPress={() => toast.info('Code resent')}>
            Resend
          </Text>
        </XStack>
      </YStack>
    </Screen>
  );
}
