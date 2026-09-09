import React, { useEffect, useState } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { Screen, Text, Card, Button, Badge, Spacer, Progress } from '@queenix/ui';
import { QrCode, RefreshCw, Eye, History, Car } from '@tamagui/lucide-icons';

// Note: in production use react-native-qrcode-svg + convex rotating token
// For now: visual placeholder
function QRPlaceholder({ token }: { token: string }) {
  // Simulated QR pattern grid
  return (
    <YStack
      backgroundColor="white"
      padding="$3"
      borderRadius="$lg"
      borderWidth={1}
      borderColor="$borderColor"
      alignSelf="center"
      width={240}
      height={240}
    >
      <YStack
        flex={1}
        backgroundColor="$brand"
        borderRadius="$md"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="white" fontSize="$xs" fontWeight="600">QUEENIX</Text>
        <Text color="white" fontSize="$2xs" marginTop="$1">{token}</Text>
      </YStack>
    </YStack>
  );
}

export default function GymScreen() {
  const router = useRouter();
  const [token, setToken] = useState(generateToken());
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [occupancy] = useState(38);
  const [maxOccupancy] = useState(60);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setToken(generateToken());
          return 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setToken(generateToken());
    setSecondsLeft(60);
  };

  return (
    <Screen scroll padded={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <YStack padding="$4" alignItems="center" gap="$2">
          <Text variant="h2">Gym access</Text>
          <Text variant="bodySmall" color="secondary">Show this code at the entrance</Text>
        </YStack>

        {/* QR Card */}
        <YStack paddingHorizontal="$4">
          <Card variant="elevated" padding="lg" alignItems="center">
            <XStack alignSelf="stretch" justifyContent="space-between" alignItems="center" marginBottom="$3">
              <Badge label="Active" variant="success" />
              <Text variant="caption" color="muted">
                Refreshes in {secondsLeft}s
              </Text>
            </XStack>
            <QRPlaceholder token={token} />
            <Spacer size="md" />
            <XStack gap="$2" alignSelf="stretch">
              <Button
                label="Refresh"
                onPress={handleRefresh}
                variant="outline"
                size="sm"
                fullWidth
                icon={<RefreshCw size={16} color="$brand" />}
              />
            </XStack>
            <Text variant="caption" color="muted" marginTop="$3" align="center">
              For your security, this code rotates every 60 seconds
            </Text>
          </Card>
        </YStack>

        {/* Live occupancy */}
        <YStack paddingHorizontal="$4" marginTop="$4">
          <Card variant="outlined">
            <XStack alignItems="center" gap="$3" marginBottom="$3">
              <YStack
                backgroundColor="$brand50"
                padding="$2.5"
                borderRadius="$md"
              >
                <Eye size={20} color="$brand" />
              </YStack>
              <YStack flex={1}>
                <Text variant="label">Live occupancy</Text>
                <Text variant="bodySmall" color="muted">Updated just now</Text>
              </YStack>
              <Text variant="h3" color="brand">
                {occupancy}/{maxOccupancy}
              </Text>
            </XStack>
            <Progress
              value={(occupancy / maxOccupancy) * 100}
              color={occupancy > maxOccupancy * 0.8 ? '$warning' : '$brand'}
            />
            <Text variant="caption" color="muted" marginTop="$2">
              {occupancy < maxOccupancy * 0.6
                ? 'Plenty of space — great time to come in'
                : 'Getting busy — quieter time recommended'}
            </Text>
          </Card>
        </YStack>

        {/* Quick links */}
        <YStack paddingHorizontal="$4" marginTop="$4" gap="$3">
          <Card
            variant="outlined"
            onPress={() => router.push('/(member)/profile')}
            accessibilityLabel="View visit history"
          >
            <XStack alignItems="center" gap="$3">
              <YStack backgroundColor="$surfaceMuted" padding="$2.5" borderRadius="$md">
                <History size={20} color="$textPrimary" />
              </YStack>
              <YStack flex={1}>
                <Text variant="label">Visit history</Text>
                <Text variant="bodySmall" color="muted">12 visits this month</Text>
              </YStack>
            </XStack>
          </Card>

          <Card variant="outlined">
            <XStack alignItems="center" gap="$3">
              <YStack backgroundColor="$surfaceMuted" padding="$2.5" borderRadius="$md">
                <Car size={20} color="$textPrimary" />
              </YStack>
              <YStack flex={1}>
                <Text variant="label">Parking</Text>
                <Text variant="bodySmall" color="muted">2 vehicles registered</Text>
              </YStack>
              <Badge label="Reserved" variant="info" />
            </XStack>
          </Card>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function generateToken() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
