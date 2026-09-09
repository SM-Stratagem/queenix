import { Tabs } from 'expo-router';
import { ScanLine, Calendar, Users, AlertCircle, User } from '@tamagui/lucide-icons';
import { StatusBar } from '@queenix/ui';

export default function OpsLayout() {
  return (
    <>
      <StatusBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0081cc',
          tabBarInactiveTintColor: '#71717a',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopColor: '#e4e4e7',
            borderTopWidth: 1,
            paddingTop: 8,
            paddingBottom: 8,
            height: 64,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen
          name="scanner"
          options={{
            title: 'Scanner',
            tabBarIcon: ({ color, size }) => <ScanLine size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="classes"
          options={{
            title: 'Classes',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="support"
          options={{
            title: 'Members',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="incidents"
          options={{
            title: 'Issues',
            tabBarIcon: ({ color, size }) => <AlertCircle size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size} color={color as any} />,
          }}
        />
      </Tabs>
    </>
  );
}
