import { Tabs } from 'expo-router';
import { ScanLine, Calendar, Users, AlertCircle, User } from '@tamagui/lucide-icons-2';
import { StatusBar } from '@queenix/ui';

/** Routes in this group that are pushed to, not tabs — hidden from the tab bar. */
const HIDDEN = ['coffee-queue', 'punch', 'salon-queue', 'valet'];

export default function OpsLayout() {
  return (
    <>
      <StatusBar />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0081cc',
          tabBarInactiveTintColor: '#a1a1aa',
          tabBarStyle: {
            backgroundColor: '#18181b',
            borderTopColor: '#27272a',
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
        {HIDDEN.map((name) => (
          <Tabs.Screen key={name} name={name} options={{ href: null }} />
        ))}
      </Tabs>
    </>
  );
}
