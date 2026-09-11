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

type CheckInStatus = 'granted' | 'denied';

interface LastScan {
  token: string;
  granted: boolean;
  reason?: string;
  user?: {
    _id: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
  scannedAt: number;
  direction: 'in' | 'out';
}

function getInitials(name?: string | null): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
}

function formatRelative(ms: number): string {
  const d = Date.now() - ms;
  if (d < 5000) return 'Just now';
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} min ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

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
        <YStack paddingHorizontal="$4" marginTop="$3">
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
                overflow="hidden"
              />
              {/* Live camera preview (when available) */}
              {CameraComponent && codeScanner && hasPermission && scanning ? (
                <YStack
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  borderRadius="$lg"
                  overflow="hidden"
                >
                  <CameraComponent
                    style={{ flex: 1 }}
                    device={undefined}
                    isActive={scanning}
                    codeScanner={codeScanner.codeScanner({
                      codeTypes: ['qr', 'ean-13'],
                      onCodeScanned: (codes: any[]) => {
                        const value = codes?.[0]?.value;
                        if (value) handleToken(String(value));
                      },
                    })}
                  />
                </YStack>
              ) : null}
              {/* Corner brackets */}
              <CornerBracket position="tl" />
              <CornerBracket position="tr" />
              <CornerBracket position="bl" />
              <CornerBracket position="br" />
              {/* Center overlay (only if camera not active) */}
              {!(CameraComponent && hasPermission && scanning) && (
                <YStack alignItems="center" gap="$2" zIndex={2}>
                  <YStack
                    backgroundColor="$surface"
                    padding="$3"
                    borderRadius="$full"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    {scanning ? (
                      <Camera size={32} color="$brand" />
                    ) : (
                      <ScanLine size={32} color="$textMuted" />
                    )}
                  </YStack>
                  <Text variant="label" color={scanning ? 'brand' : 'muted'}>
                    {hasPermission === false
                      ? 'Camera unavailable'
                      : scanning
                      ? 'Scanning…'
                      : 'Tap to scan'}
                  </Text>
                  <Text variant="caption" color="muted" textAlign="center">
                    {hasPermission === false
                      ? 'Grant camera permission\nto enable scanning'
                      : scanning
                      ? 'Hold member QR\nwithin the frame'
                      : 'Camera is off'}
                  </Text>
                </YStack>
              )}
            </YStack>
          </Card>

          {/* Direction toggle + manual entry */}
          <YStack marginTop="$4" width={280} gap="$2">
            <XStack gap="$2">
              <YStack
                flex={1}
                paddingVertical="$2.5"
                alignItems="center"
                borderRadius="$md"
                backgroundColor={direction === 'in' ? '$brand' : '$surfaceMuted'}
                onPress={() => setDirection('in')}
                accessibilityRole="button"
                accessibilityState={{ selected: direction === 'in' }}
                accessibilityLabel="Set direction to in"
              >
                <Text
                  variant="caption"
                  weight="600"
                  color={direction === 'in' ? 'inverse' : 'muted'}
                  textTransform="uppercase"
                >
                  In
                </Text>
              </YStack>
              <YStack
                flex={1}
                paddingVertical="$2.5"
                alignItems="center"
                borderRadius="$md"
                backgroundColor={direction === 'out' ? '$brand' : '$surfaceMuted'}
                onPress={() => setDirection('out')}
                accessibilityRole="button"
                accessibilityState={{ selected: direction === 'out' }}
                accessibilityLabel="Set direction to out"
              >
                <Text
                  variant="caption"
                  weight="600"
                  color={direction === 'out' ? 'inverse' : 'muted'}
                  textTransform="uppercase"
                >
                  Out
                </Text>
              </YStack>
            </XStack>
            <XStack gap="$2" alignItems="center">
              <YStack
                flex={1}
                borderWidth={1}
                borderColor="$borderColor"
                borderRadius="$md"
                paddingHorizontal="$3"
                paddingVertical="$2"
                backgroundColor="$surface"
              >
                <XStack alignItems="center" gap="$2">
                  <Search size={16} color="$textMuted" />
                  <YStack flex={1}>
                    <Text
                      variant="bodySmall"
                      color={manualToken ? 'primary' : 'muted'}
                      onPress={() => {
                        // Focus is handled by the native input below in a real app;
                        // for compact UX we use a simple text field via the system
                      }}
                    >
                      {manualToken || 'Manual token entry'}
                    </Text>
                  </YStack>
                </XStack>
                {/* Hidden but functional input */}
                <YStack
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  opacity={0.01}
                >
                  <input
                    value={manualToken}
                    onChange={(e: any) => setManualToken(e.target.value)}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') handleManualEntry();
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      background: 'transparent',
                      color: 'transparent',
                      outline: 'none',
                    }}
                  />
                </YStack>
              </YStack>
              <Button
                label="Submit"
                variant="primary"
                size="md"
                onPress={handleManualEntry}
                accessibilityLabel="Submit manual token"
              />
            </XStack>
            <Button
              label="Open main door"
              variant="outline"
              size="md"
              fullWidth
              icon={<DoorOpen size={18} color="$brand" />}
              onPress={() => toast.info('Door relay triggered')}
              accessibilityLabel="Manually open the main door"
            />
          </YStack>
        </YStack>

        {/* Last result */}
        {lastScan && (
          <YStack paddingHorizontal="$4" marginTop="$4">
            <Text variant="h4" marginBottom="$2">Last result</Text>
            <Card
              variant="elevated"
              padding="md"
              backgroundColor={lastScan.granted ? '$success50' : '$danger50'}
              borderColor={lastScan.granted ? '$success' : '$danger'}
              accessibilityLabel={`Last scan ${lastScan.granted ? 'granted' : 'denied'}`}
            >
              <XStack alignItems="center" gap="$3">
                <YStack
                  backgroundColor={lastScan.granted ? '$success' : '$danger'}
                  padding="$2.5"
                  borderRadius="$full"
                >
                  {lastScan.granted ? (
                    <CheckCircle2 size={20} color="$textOnBrand" />
                  ) : (
                    <XCircle size={20} color="$textOnBrand" />
                  )}
                </YStack>
                <YStack flex={1}>
                  <Text variant="label" weight="700">
                    {lastScan.granted
                      ? lastScan.user?.fullName ?? 'Access granted'
                      : lastScan.reason ?? 'Access denied'}
                  </Text>
                  <Text variant="caption" color="muted">
                    {formatRelative(lastScan.scannedAt)} • {lastScan.direction.toUpperCase()}
                  </Text>
                </YStack>
                {lastScan.granted && (
                  <Button
                    label="Reset"
                    variant="ghost"
                    size="sm"
                    icon={<RotateCw size={14} color="$textMuted" />}
                    onPress={() => setLastScan(null)}
                    accessibilityLabel="Clear last result"
                  />
                )}
              </XStack>
            </Card>
          </YStack>
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

