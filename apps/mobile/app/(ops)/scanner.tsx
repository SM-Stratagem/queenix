import React, { useState, useEffect, useRef, useCallback } from 'react';
import { YStack, XStack, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Card,
  Avatar,
  Button,
  Badge,
  Header,
  Skeleton,
  ErrorState,
  EmptyState,
  useToast,
} from '@queenix/ui';
import { useAuth } from '@/lib/auth';
import { useConvexQuery, useConvexMutation, api } from '@/lib/convex';
import {
  ScanLine,
  Camera,
  CheckCircle2,
  XCircle,
  Users,
  DoorOpen,
  Search,
  Wifi,
  WifiOff,
  AlertTriangle,
  RotateCw,
} from '@tamagui/lucide-icons';
import { CornerBracket } from '@/components/scanner/CornerBracket';
import { CheckInRow } from '@/components/scanner/CheckInRow';
import { ScannerStatusBanner } from '@/components/scanner/ScannerStatusBanner';
import { formatRelative, getInitials } from '@/components/scanner/format';
import { LastResultCard, type LastScan } from '@/components/scanner/LastResultCard';
import { ScannerViewfinder, ScannerControls } from '@/components/scanner/scanControls';
import { LiveCapacityBar } from '@/components/scanner/LiveCapacityBar';

type CheckInStatus = 'granted' | 'denied';

// LastScan type imported from @/components/scanner/LastResultCard
// Helpers moved to @/components/scanner/format

export default function ScannerScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const toast = useToast();

  // Live occupancy snapshot (most recent)
  const occupancy = useConvexQuery(api.queries.access.getCurrentOccupancy, {
    accessPointId: 'front-door',
  });
  // Recent access events for the live feed
  const recent = useConvexQuery(api.queries.access.getRecentAccessEvents, { limit: 10 });
  // Hardware scanner health (polled every 30s by the route)
  const scannerHealth = useConvexQuery(api.queries.access.getScannerHealth, {});

  const processScan = useConvexMutation(api.mutations.access.processAccessScan);

  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [scanning, setScanning] = useState(true);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [manualToken, setManualToken] = useState('');
  const [scannerStatus, setScannerStatus] = useState<'online' | 'offline' | 'unknown'>(
    'unknown'
  );
  const lastScannedToken = useRef<string | null>(null);
  const lastScannedAt = useRef<number>(0);

  // Derive hardware status from server health (within 2 min = online)
  useEffect(() => {
    if (!scannerHealth) {
      setScannerStatus('unknown');
      return;
    }
    const lastSeen = scannerHealth.lastSeenAt;
    if (!lastSeen) {
      setScannerStatus('offline');
      return;
    }
    setScannerStatus(Date.now() - lastSeen < 2 * 60 * 1000 ? 'online' : 'offline');
  }, [scannerHealth]);

  const handleToken = useCallback(
    async (raw: string) => {
      const token = raw.trim();
      if (!token) return;
      // Debounce — don't re-process the same token within 4s
      const now = Date.now();
      if (token === lastScannedToken.current && now - lastScannedAt.current < 4000) return;
      lastScannedToken.current = token;
      lastScannedAt.current = now;

      try {
        const result = await processScan({
          token,
          accessPointId: 'front-door',
          direction,
        });
        setLastScan({
          token,
          granted: Boolean((result as any)?.granted),
          reason: (result as any)?.reason ?? undefined,
          user: (result as any)?.user ?? null,
          scannedAt: Date.now(),
          direction,
        });
        if ((result as any)?.granted) {
          toast.success(
            (result as any)?.user?.fullName
              ? `Welcome ${(result as any).user.fullName.split(' ')[0]}`
              : 'Access granted'
          );
        } else {
          toast.error((result as any)?.reason ?? 'Access denied');
        }
      } catch (err: any) {
        toast.error(err?.message ?? 'Scan failed');
        setLastScan({
          token,
          granted: false,
          reason: err?.message ?? 'Scan failed',
          user: null,
          scannedAt: Date.now(),
          direction,
        });
      }
    },
    [processScan, direction, toast]
  );

  const handleManualEntry = () => {
    if (manualToken.trim()) {
      handleToken(manualToken);
      setManualToken('');
    }
  };

  // Camera scanner fallback — react-native-vision-camera + code scanner
  // We use dynamic require so the screen still renders in environments
  // (web, Expo Go on older SDKs) where the native module is absent.
  const [CameraComponent, setCameraComponent] = useState<any>(null);
  const [codeScanner, setCodeScanner] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cam = await import('react-native-vision-camera');
        const cs = await import('vision-camera-code-scanner');
        if (!mounted) return;
        setCameraComponent(() => cam.Camera);
        setCodeScanner(() => cs);
        // Request permission
        const status = await cam.Camera.requestCameraPermission();
        setHasPermission(status === 'granted');
      } catch {
        // Native module missing — fall back to manual entry only
        setHasPermission(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const liveCount = occupancy?.count ?? 0;
  const maxCapacity = 180;
  const capacityRatio = Math.min(1, liveCount / maxCapacity);
  const isBusy = capacityRatio > 0.8;

  return (
    <Screen padded={false}>
      <Header
        title="Check-in scanner"
        subtitle={session?.fullName?.split(' ')[0] ?? 'Front desk'}
        right={
          <XStack
            backgroundColor="$brand50"
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$full"
            alignItems="center"
            gap="$2"
            accessibilityLabel={`${liveCount} of ${maxCapacity} members inside`}
          >
            <Users size={16} color="$brand" />
            <Text variant="label" color="brand">
              {liveCount}/{maxCapacity}
            </Text>
          </XStack>
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hardware scanner status banner */}
        <YStack paddingHorizontal="$4" marginTop="$2">
          <Card
            variant="outlined"
            padding="sm"
            backgroundColor={
              scannerStatus === 'online'
                ? '$success50'
                : scannerStatus === 'offline'
                ? '$danger50'
                : '$surfaceMuted'
            }
            accessibilityLabel={`Hardware scanner ${scannerStatus}`}
          >
            <XStack alignItems="center" gap="$2">
              {scannerStatus === 'online' ? (
                <Wifi size={16} color="$success" />
              ) : scannerStatus === 'offline' ? (
                <WifiOff size={16} color="$danger" />
              ) : (
                <AlertTriangle size={16} color="$warning" />
              )}
              <Text variant="label" weight="600">
                Hardware scanner: {scannerStatus === 'online' ? 'Online' : scannerStatus === 'offline' ? 'Offline' : 'Unknown'}
              </Text>
            </XStack>
            <Text variant="caption" color="muted" marginTop="$1">
              {scannerStatus === 'online'
                ? `Front door is being handled automatically. Camera mode is the backup.`
                : scannerStatus === 'offline'
                ? 'Use the camera scanner below. Hardware scanner needs a power-cycle.'
                : 'Waiting for first heartbeat from the hardware scanner.'}
            </Text>
          </Card>
        </YStack>

        {/* Live capacity bar */}
        <LiveCapacityBar liveCount={liveCount} maxCapacity={maxCapacity} />

        {/* QR scanner viewport */}
        <ScannerViewfinder
          scanning={scanning}
          hasPermission={hasPermission}
          CameraComponent={CameraComponent}
          codeScanner={codeScanner}
          handleToken={handleToken}
          setScanning={setScanning}
        />

        {/* Direction toggle + manual entry */}
        <ScannerControls
          direction={direction}
          setDirection={setDirection}
          manualToken={manualToken}
          setManualToken={setManualToken}
          handleManualEntry={handleManualEntry}
          toast={toast}
        />

        {/* Last result */}
        {lastScan && (
          <LastResultCard scan={lastScan} onReset={() => setLastScan(null)} />
        )}

        {/* Recent check-ins */}
        <YStack paddingHorizontal="$4" marginTop="$5">
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text variant="h4">Recent check-ins</Text>
            <Text variant="bodySmall" color="brand" onPress={() => {}}>
              View all
            </Text>
          </XStack>
          {recent === undefined ? (
            <YStack gap="$2">
              <Skeleton height={64} borderRadius={12} />
              <Skeleton height={64} borderRadius={12} />
              <Skeleton height={64} borderRadius={12} />
            </YStack>
          ) : recent === null ? (
            <ErrorState onRetry={() => {}} />
          ) : recent.length === 0 ? (
            <EmptyState
              title="No check-ins yet"
              message="When members scan in, you'll see them here in real time."
              icon={<Users size={32} color="$textMuted" />}
            />
          ) : (
            <YStack gap="$2">
              {recent.map((e: any) => (
                <CheckInRow key={e._id} entry={e} />
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </Screen>
  );
}

