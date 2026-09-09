import { Stack } from 'expo-router';
import { StatusBar } from '@queenix/ui';

export default function AuthLayout() {
  return (
    <>
      <StatusBar />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}
