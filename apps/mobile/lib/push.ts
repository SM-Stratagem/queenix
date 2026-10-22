/**
 * Queenix Gym — phone push (Expo Push).
 * After sign-in: ask permission, get the Expo push token and register it
 * with Convex (`mutations/push:registerPushToken`). On sign-out the auth
 * provider calls `clearPushToken()` (while the session is still valid).
 * Tapping a notification opens the notifications screen.
 *
 * Never blocks or crashes login: anything missing (EAS projectId, physical
 * device, Android Expo Go, permission) is skipped with a console.info.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { router } from 'expo-router';
import { useMutation } from 'convex/react';
import { api } from '@queenix/convex';

const NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

// Foreground notifications still show a banner.
if (NATIVE) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function skip(why: string): null {
  console.info(`[push] not registering: ${why}`);
  return null;
}

/** Expo push token for this install, or null when push isn't available here. */
async function getPushToken(): Promise<string | null> {
  if (!NATIVE) return skip('not a native platform');
  if (!Device.isDevice) return skip('not a physical device');
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    return skip('Expo Go on Android has no remote push — use a development build');
  }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return skip('no EAS projectId (run `eas init` in apps/mobile)');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Queenix',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return skip('permission not granted');
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

let clearRegistered: (() => Promise<unknown>) | null = null;

/** Unregister this device's token. Call before signing out (needs the session). */
export async function clearPushToken(): Promise<void> {
  const clear = clearRegistered;
  clearRegistered = null;
  try {
    await clear?.();
  } catch (e) {
    console.info('[push] unregister failed', e);
  }
}

function useNativePushNotifications(signedIn: boolean) {
  const register = useMutation(api.mutations.push.registerPushToken);
  const unregister = useMutation(api.mutations.push.unregisterPushToken);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    getPushToken()
      .then(async (token) => {
        if (!token || cancelled) return;
        await register({ token, platform: Platform.OS as 'ios' | 'android' });
        clearRegistered = () => unregister({ token });
      })
      .catch((e) => console.info('[push] registration failed', e));
    return () => {
      cancelled = true;
    };
  }, [signedIn, register, unregister]);

  // Tap (also cold start) → notifications screen, once per notification.
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!signedIn || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    router.push('/notifications');
  }, [signedIn, response]);
}

/** Register for push while signed in; no-op on web. Call inside the Convex provider. */
export const usePushNotifications: (signedIn: boolean) => void = NATIVE
  ? useNativePushNotifications
  : () => {};
