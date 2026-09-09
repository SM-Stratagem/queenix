import { TamaguiProvider, Theme } from 'tamagui';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from '@queenix/ui';
import { config } from '@queenix/theme';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@queenix/ui';
import { initI18n } from '@queenix/i18n';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

SplashScreen.preventAutoHideAsync().catch(() => {});

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL || 'https://placeholder.convex.cloud',
  { unsavedChangesWarning: false }
);

initI18n();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
          'Inter-Bold': require('@tamagui/font-inter/otf/Inter-Bold.otf'),
        });
      } catch (e) {
        console.warn('Font load failed, using system font', e);
      } finally {
        setAppReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={config} defaultTheme={colorScheme ?? 'light'}>
          <Theme name={colorScheme === 'dark' ? 'dark' : 'light'}>
            <ConvexProvider client={convex}>
              <AuthProvider>
                <ToastProvider>
                  <StatusBar />
                  <RootNavigator />
                </ToastProvider>
              </AuthProvider>
            </ConvexProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="(auth)" redirect={!!session} />
      <Stack.Screen name="(member)" redirect={!session} />
      <Stack.Screen name="(trainer)" redirect={!session} />
      <Stack.Screen name="(owner)" redirect={!session} />
      <Stack.Screen name="(ops)" redirect={!session} />
    </Stack>
  );
}
