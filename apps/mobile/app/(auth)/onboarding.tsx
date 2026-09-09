import React, { useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Button, Input, Spacer, Progress, Card } from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { Calendar, Heart, Users, Activity } from '@tamagui/lucide-icons';

type Step = 'dob' | 'health' | 'goals' | 'done';

export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [step, setStep] = useState<Step>('dob');
  const [dob, setDob] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);

  const stepIdx: Record<Step, number> = { dob: 0, health: 1, goals: 2, done: 3 };
  const totalSteps = 3;

  const next = () => {
    if (step === 'dob') setStep('health');
    else if (step === 'health') setStep('goals');
    else if (step === 'goals') {
      setStep('done');
      setTimeout(() => router.replace('/(member)/home'), 1200);
    }
  };

  const back = () => {
    if (step === 'health') setStep('dob');
    else if (step === 'goals') setStep('health');
    else if (step === 'done') setStep('goals');
  };

  return (
    <Screen padded={false}>
      <YStack flex={1} padding="$4">
        <XStack alignItems="center" justifyContent="space-between" marginBottom="$4">
          <Text variant="caption" color="secondary">
            Step {stepIdx[step] + 1} of {totalSteps}
          </Text>
          {step !== 'done' && step !== 'dob' && (
            <Text variant="bodySmall" color="muted" onPress={back}>
              Back
            </Text>
          )}
        </XStack>
        <Progress value={(stepIdx[step] + 1) * (100 / totalSteps)} marginBottom="$4" />

        {step === 'dob' && (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <Calendar size={32} color="$brand" />
              <Text variant="h2">A bit about you</Text>
              <Text variant="body" color="secondary">
                We need your date of birth and emergency contact for safety reasons.
              </Text>
            </YStack>
            <Input
              label="Date of birth"
              placeholder="YYYY-MM-DD"
              value={dob}
              onChangeText={setDob}
              hint="Used to tailor programs to your age range"
              required
            />
            <Input
              label="Emergency contact name"
              placeholder="Full name"
              value={emergencyName}
              onChangeText={setEmergencyName}
              required
            />
            <Input
              label="Emergency contact phone"
              placeholder="+971 50 123 4567"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
              required
            />
            <Spacer />
            <Button label="Continue" onPress={next} size="lg" fullWidth />
          </YStack>
        )}

        {step === 'health' && (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <Heart size={32} color="$brand" />
              <Text variant="h2">Health declaration</Text>
              <Text variant="body" color="secondary">
                Select any conditions your trainer should be aware of. All information is confidential.
              </Text>
            </YStack>
            <YStack gap="$2">
              {[
                'Heart condition',
                'Joint or back issues',
                'Pregnancy or postnatal',
                'High/low blood pressure',
                'Diabetes',
                'Asthma',
                'Recent surgery',
                'None of the above',
              ].map((c) => {
                const selected = healthConditions.includes(c);
                return (
                  <Card
                    key={c}
                    padding="sm"
                    variant={selected ? 'filled' : 'outlined'}
                    onPress={() =>
                      setHealthConditions((prev) =>
                        prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                      )
                    }
                  >
                    <Text variant="body" weight={selected ? '600' : '400'} color={selected ? 'brand' : 'primary'}>
                      {c}
                    </Text>
                  </Card>
                );
              })}
            </YStack>
            <Spacer />
            <Button label="Continue" onPress={next} size="lg" fullWidth />
          </YStack>
        )}

        {step === 'goals' && (
          <YStack gap="$4" flex={1}>
            <YStack gap="$2">
              <Activity size={32} color="$brand" />
              <Text variant="h2">Your goals</Text>
              <Text variant="body" color="secondary">
                What do you want to achieve? Pick one or more.
              </Text>
            </YStack>
            <YStack gap="$2">
              {[
                'Lose weight',
                'Build strength',
                'Improve flexibility',
                'Train for an event',
                'Recover from injury',
                'Reduce stress',
                'Build healthy habits',
                'Have fun',
              ].map((g) => {
                const selected = goals.includes(g);
                return (
                  <Card
                    key={g}
                    padding="sm"
                    variant={selected ? 'filled' : 'outlined'}
                    onPress={() =>
                      setGoals((prev) =>
                        prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
                      )
                    }
                  >
                    <Text variant="body" weight={selected ? '600' : '400'} color={selected ? 'brand' : 'primary'}>
                      {g}
                    </Text>
                  </Card>
                );
              })}
            </YStack>
            <Spacer />
            <Button label="Finish setup" onPress={next} size="lg" fullWidth />
          </YStack>
        )}

        {step === 'done' && (
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$3">
            <Users size={64} color="$brand" />
            <Text variant="h2" align="center">You're all set!</Text>
            <Text variant="body" color="secondary" align="center">
              Welcome to Queenix. Loading your dashboard…
            </Text>
          </YStack>
        )}
      </YStack>
    </Screen>
  );
}
