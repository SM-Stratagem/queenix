import React, { useCallback, useEffect, useMemo, useState } from "react"
import { TamaguiProvider, Theme } from "tamagui"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Stack } from "expo-router"
import { StatusBar } from "@queenix/ui"
import { config } from "@queenix/theme"
import { ConvexProviderWithAuth, ConvexReactClient, useConvexAuth } from "convex/react"
import { AUTH_BASE_URL, authClient } from "@queenix/auth"
import { AuthProvider, useAuth } from "@/lib/auth"
import { usePushNotifications } from "@/lib/push"
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
 * Pin to DARK mode. The theme package ships dark (light is an alias of
 * dark) — the OS preference is intentionally ignored so the app's brand
 * and contrast stay consistent.
 */
const FIXED_THEME = "dark" as const

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
            <AuthProvider>
              <ConvexProviderWithAuth client={convex} useAuth={useConvexAuthFromSession}>
                <ToastProvider>
                  <StatusBar style="light" />
                  {appReady ? <RootNavigator /> : <AppLoader />}
                </ToastProvider>
              </ConvexProviderWithAuth>
            </AuthProvider>
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/**
 * Feeds ConvexProviderWithAuth from the BetterAuth session: tokens are
 * minted by /api/convex/token (session cookie attached by the expo client
 * plugin). The token fetcher's identity changes only when the signed-in
 * user does, so Convex re-arms on login/logout/switch — not on every
 * session refresh or role switch (that raced in-flight query updates →
 * "Base version N passed up doesn't match" fatal errors).
 */
function useConvexAuthFromSession() {
  const { session, isLoading } = useAuth()
  const userId = session?.userId ?? null
  const fetchAccessToken = useCallback(async () => {
    if (!userId) return null
    try {
      // Absolute URL: a relative path is resolved under the auth basePath
      // (/api/auth/api/convex/token → 404 → every query "Not signed in").
      // $fetch still attaches the expo session cookie.
      const res = await authClient.$fetch(`${AUTH_BASE_URL}/api/convex/token`)
      const token = (res.data as { token?: unknown } | null | undefined)?.token
      return typeof token === "string" ? token : null
    } catch {
      return null
    }
  }, [userId])
  return useMemo(
    () => ({ isLoading, isAuthenticated: userId !== null, fetchAccessToken }),
    [isLoading, userId, fetchAccessToken]
  )
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
  // Screens subscribe on mount: hold them until Convex has accepted the token.
  const convexAuth = useConvexAuth()
  usePushNotifications(!!session && convexAuth.isAuthenticated)

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

  if (isLoading || (session && convexAuth.isLoading)) return <AppLoader />

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
