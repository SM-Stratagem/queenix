import React, { useEffect, useMemo, useState } from "react"
import { TamaguiProvider, Theme } from "tamagui"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Stack } from "expo-router"
import { StatusBar } from "@queenix/ui"
import { config } from "@queenix/theme"
import { ConvexProvider, ConvexReactClient } from "convex/react"
import { authClient } from "@queenix/auth"
import { AuthProvider, useAuth } from "@/lib/auth"
import { ToastProvider } from "@queenix/ui"
import { initI18n } from "@queenix/i18n"
import { View, ActivityIndicator } from "react-native"
import * as SplashScreen from "expo-splash-screen"
import * as Font from "expo-font"

SplashScreen.preventAutoHideAsync().catch(() => {})

initI18n()

/**
 * Memoized Convex client. The instance must be stable across renders so
 * that in-flight queries don't get cancelled every commit. Constructed once
 * at module load.
 */
const convexUrl =
  process.env.EXPO_PUBLIC_CONVEX_URL || "https://placeholder.convex.cloud"
const convex = new ConvexReactClient(convexUrl, { unsavedChangesWarning: false })

/**
 * Pin to LIGHT mode. The theme package intentionally ships only `light` —
 * the OS preference is intentionally ignored so the app's brand and
 * contrast stay consistent. If you ever add `dark: darkTheme`, also wire
 * it here.
 */
const FIXED_THEME = "light" as const

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function prepare() {
      try {
        await Font.loadAsync({
          Inter: require("@tamagui/font-inter/otf/Inter-Medium.otf"),
          "Inter-Bold": require("@tamagui/font-inter/otf/Inter-Bold.otf"),
        })
      } catch (e) {
        console.warn("Font load failed, using system font", e)
      } finally {
        if (!cancelled) {
          setAppReady(true)
          SplashScreen.hideAsync().catch(() => {})
        }
      }
    }
    prepare()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <TamaguiProvider config={config} defaultTheme={FIXED_THEME}>
          <Theme name={FIXED_THEME}>
            <ConvexProvider client={convex}>
              <AuthProvider>
                <ConvexAuthSync />
                <ToastProvider>
                  <StatusBar style="dark" />
                  {appReady ? <RootNavigator /> : <AppLoader />}
                </ToastProvider>
              </AuthProvider>
            </ConvexProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/**
 * Keeps the Convex client authorized with a fresh RS256 token minted by
 * /api/convex/token (BetterAuth session cookie is attached by the expo
 * client plugin). Re-armed on every session change so login/logout
 * immediately flips live queries and mutations between authorized and
 * unauthenticated without an app restart.
 */
function ConvexAuthSync() {
  const { session } = useAuth()

  useEffect(() => {
    convex.setAuth(async () => {
      try {
        const res = await authClient.$fetch("/api/convex/token")
        const token = (res.data as { token?: unknown } | null | undefined)?.token
        return typeof token === "string" ? token : null
      } catch {
        return null
      }
    })
  }, [session])

  return null
}

function AppLoader() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  )
}

function RootNavigator() {
  const { isLoading, session } = useAuth()

  // Single Stack instance per auth state — switching identity flips
  // the redirect prop, which Expo Router handles atomically.
  const stackProps = useMemo(
    () => ({
      screenOptions: {
        headerShown: false,
        animation: "fade" as const,
        gestureEnabled: true,
        contentStyle: { backgroundColor: "transparent" },
      },
    }),
    []
  )

  if (isLoading) return <AppLoader />

  return (
    <Stack {...stackProps}>
      <Stack.Screen name="(auth)" redirect={!!session} />
      <Stack.Screen name="(member)" redirect={!session} />
      <Stack.Screen name="(trainer)" redirect={!session} />
      <Stack.Screen name="(owner)" redirect={!session} />
      <Stack.Screen name="(ops)" redirect={!session} />
    </Stack>
  )
}
