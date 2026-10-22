import { Tabs } from 'expo-router';
import { Home, Calendar, QrCode, Gift, User } from '@tamagui/lucide-icons-2';
import { StatusBar } from '@queenix/ui';

/** Routes in this group that are pushed to, not tabs — hidden from the tab bar. */
const HIDDEN = ['classes/[id]', 'coffee', 'documents', 'health', 'notifications', 'payments', 'plans', 'salon', 'security', 'support', 'tiers', 'trainers', 'valet', 'vehicles'];

export default function MemberLayout() {
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
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="book"
          options={{
            title: 'Book',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="gym"
          options={{
            title: 'Gym',
            tabBarIcon: ({ color, size }) => <QrCode size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="rewards"
          options={{
            title: 'Rewards',
            tabBarIcon: ({ color, size }) => <Gift size={size} color={color as any} />,
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
