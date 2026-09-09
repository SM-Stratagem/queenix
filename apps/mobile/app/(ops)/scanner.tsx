import React, { useState, useEffect, useRef } from 'react';
import { YStack, XStack, ScrollView, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Header,
  Divider,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import {
  ScanLine,
  Camera,
  CheckCircle2,
  XCircle,
  Users,
  DoorOpen,
  Search,
  ChevronRight,
} from '@tamagui/lucide-icons';

type CheckInStatus = 'granted' | 'denied';

interface CheckIn {
  id: string;
  name: string;
  initials: string;
  memberId: string;
  time: string;
  status: CheckInStatus;
  reason?: string;
}

const MOCK_CHECKINS: CheckIn[] = [
  {
    id: '1',
    name: 'Aisha Al-Mansoori',
    initials: 'AM',
    memberId: 'QNX-08421',
    time: 'Just now',
    status: 'granted',
  },
  {
    id: '2',
    name: 'Daniel Pereira',
    initials: 'DP',
    memberId: 'QNX-07209',
    time: '2 min ago',
    status: 'granted',
  },
  {
    id: '3',
    name: 'Yusuf Khan',
    initials: 'YK',
    memberId: 'QNX-09112',
    time: '5 min ago',
    status: 'denied',
    reason: 'Membership expired',
  },
  {
    id: '4',
    name: 'Sara Al-Maktoum',
    initials: 'SM',
    memberId: 'QNX-06550',
    time: '7 min ago',
    status: 'granted',
  },
  {
    id: '5',
    name: 'Mohammed Ali',
    initials: 'MA',
    memberId: 'QNX-10298',
    time: '12 min ago',
    status: 'granted',
  },
  {
    id: '6',
    name: 'Priya Sharma',
    initials: 'PS',
    memberId: 'QNX-05833',
    time: '15 min ago',
    status: 'denied',
    reason: 'Outside access window',
  },
  {
    id: '7',
    name: 'Khalifa Al-Suwaidi',
    initials: 'KS',
    memberId: 'QNX-12044',
    time: '18 min ago',
    status: 'granted',
  },
];

export default function ScannerScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const theme = useTheme();
  const [occupancy, setOccupancy] = useState(127);
  const [maxOccupancy] = useState(180);
  const [scanning, setScanning] = useState(true);
  const scanLineAnim = useRef(new (require('react-native').Animated.Value)(0)).current;

  // Simulate live occupancy fluctuation
  useEffect(() => {
    const id = setInterval(() => {
      setOccupancy((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return Math.max(80, Math.min(maxOccupancy - 5, next));
      });
    }, 8000);
    return () => clearInterval(id);
  }, [maxOccupancy]);

  // Scanning line animation
  useEffect(() => {
    const Animated = require('react-native').Animated;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scanLineAnim]);

  const translateY = scanLineAnim.interpolate
    ? scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 240] })
    : 0;

  const capacityRatio = occupancy / maxOccupancy;
  const isBusy = capacityRatio > 0.8;

  return (
    <Screen padded={false}>
      <Header
        title="Check-in scanner"
        subtitle={session?.fullName?.split(' ')[0] ?? 'Front desk'}
        rightSlot={
          <XStack
            backgroundColor="$brand50"
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$full"
            alignItems="center"
            gap="$2"
            accessibilityLabel={`${occupancy} of ${maxOccupancy} members inside`}
          >
            <Users size={16} color="$brand" />
            <Text variant="label" color="brand">
              {occupancy}/{maxOccupancy}
            </Text>
          </XStack>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Live capacity bar */}
        <YStack paddingHorizontal="$4" marginTop="$2">
          <Card variant="outlined" padding="sm">
            <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
              <YStack>
                <Text variant="label">Live occupancy</Text>
                <Text variant="caption" color="muted">
                  {isBusy ? 'Near capacity' : 'Comfortable flow'}
                </Text>
              </YStack>
              <Badge
                label={isBusy ? 'Busy' : 'Normal'}
                variant={isBusy ? 'warning' : 'success'}
              />
            </XStack>
            <YStack
              height={8}
              backgroundColor="$surfaceMuted"
              borderRadius="$full"
              overflow="hidden"
            >
              <YStack
                height="100%"
                width={`${capacityRatio * 100}%`}
                backgroundColor={isBusy ? '$warning' : '$brand'}
                borderRadius="$full"
              />
            </YStack>
          </Card>
        </YStack>

        {/* QR scanner viewport */}
        <YStack paddingHorizontal="$4" marginTop="$4" alignItems="center">
          <Card
            variant="elevated"
            padding="md"
            onPress={() => setScanning((s) => !s)}
            accessibilityLabel={scanning ? 'Stop scanning' : 'Start scanning'}
          >
            <YStack
              width={280}
              height={280}
              alignItems="center"
              justifyContent="center"
              position="relative"
            >
              {/* Outer frame */}
              <YStack
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                borderWidth={3}
                borderColor={scanning ? '$brand' : '$borderColor'}
                borderRadius="$lg"
                backgroundColor="$surfaceMuted"
              />
              {/* Corner brackets */}
              <CornerBracket position="tl" />
              <CornerBracket position="tr" />
              <CornerBracket position="bl" />
              <CornerBracket position="br" />
              {/* Scanning line */}
              {scanning && (
                <YStack
                  position="absolute"
                  top={20}
                  left={20}
                  right={20}
                  height={2}
                  backgroundColor="$brand"
                  opacity={0.7}
                  style={{ transform: [{ translateY }] }}
                />
              )}
              {/* Center overlay */}
              <YStack alignItems="center" gap="$2">
                <YStack
                  backgroundColor="$surface"
                  padding="$3"
                  borderRadius="$full"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  {scanning ? (
                    <ScanLine size={32} color="$brand" />
                  ) : (
                    <Camera size={32} color="$textMuted" />
                  )}
                </YStack>
                <Text variant="label" color={scanning ? 'brand' : 'muted'}>
                  {scanning ? 'Scanning…' : 'Tap to scan'}
                </Text>
                <Text variant="caption" color="muted" textAlign="center">
                  Hold member QR{'\n'}within the frame
                </Text>
              </YStack>
            </YStack>
          </Card>

          {/* Manual entry */}
          <YStack marginTop="$4" width={280} gap="$2">
            <Button
              label="Manual entry"
              variant="outline"
              size="md"
              fullWidth
              icon={<Search size={18} color="$brand" />}
              onPress={() => router.push('/(ops)/support')}
              accessibilityLabel="Manual member lookup"
            />
            <Button
              label="Open main door"
              variant="primary"
              size="lg"
              fullWidth
              icon={<DoorOpen size={20} color="$textOnBrand" />}
              onPress={() => {}}
              accessibilityLabel="Manually open the main door"
            />
          </YStack>
        </YStack>

        {/* Recent check-ins */}
        <YStack paddingHorizontal="$4" marginTop="$5">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Recent check-ins</Text>
            <Text variant="bodySmall" color="brand">
              View all
            </Text>
          </XStack>
          <YStack gap="$2">
            {MOCK_CHECKINS.map((entry) => (
              <CheckInRow key={entry.id} entry={entry} />
            ))}
          </YStack>
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size = 24;
  const offset = 8;
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';
  return (
    <YStack
      position="absolute"
      top={isTop ? offset : undefined}
      bottom={!isTop ? offset : undefined}
      left={isLeft ? offset : undefined}
      right={!isLeft ? offset : undefined}
      width={size}
      height={size}
      borderColor="$brand"
      borderTopWidth={isTop ? 4 : 0}
      borderBottomWidth={!isTop ? 4 : 0}
      borderLeftWidth={isLeft ? 4 : 0}
      borderRightWidth={!isLeft ? 4 : 0}
      borderTopLeftRadius={isTop && isLeft ? '$sm' : 0}
      borderTopRightRadius={isTop && !isLeft ? '$sm' : 0}
      borderBottomLeftRadius={!isTop && isLeft ? '$sm' : 0}
      borderBottomRightRadius={!isTop && !isLeft ? '$sm' : 0}
    />
  );
}

function CheckInRow({ entry }: { entry: CheckIn }) {
  const isGranted = entry.status === 'granted';
  return (
    <Card
      variant="outlined"
      padding="sm"
      accessibilityLabel={`${entry.name}, ${isGranted ? 'granted' : 'denied'} ${entry.time}`}
    >
      <XStack alignItems="center" gap="$3">
        <Avatar
          name={entry.name}
          size="md"
          backgroundColor={isGranted ? '$brand100' : '$danger100'}
          color={isGranted ? '$brand' : '$danger'}
        />
        <YStack flex={1} gap="$0.5">
          <Text variant="label" numberOfLines={1}>
            {entry.name}
          </Text>
          <XStack alignItems="center" gap="$2">
            <Text variant="caption" color="muted">
              {entry.memberId}
            </Text>
            <Text variant="caption" color="muted">
              • {entry.time}
            </Text>
          </XStack>
          {entry.reason && (
            <Text variant="caption" color="danger">
              {entry.reason}
            </Text>
          )}
        </YStack>
        <XStack alignItems="center" gap="$1.5">
          {isGranted ? (
            <CheckCircle2 size={18} color="$success500" />
          ) : (
            <XCircle size={18} color="$danger500" />
          )}
          <Text
            variant="caption"
            weight="600"
            color={isGranted ? 'success' : 'danger'}
          >
            {isGranted ? 'Granted' : 'Denied'}
          </Text>
        </XStack>
      </XStack>
    </Card>
  );
}
