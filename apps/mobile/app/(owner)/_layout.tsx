import { Tabs } from 'expo-router';
import { BarChart3, Activity, Users, CheckCircle, User } from '@tamagui/lucide-icons-2';
import { StatusBar } from '@queenix/ui';

/** Routes in this group that are pushed to, not tabs — hidden from the tab bar. */
const HIDDEN = ['announce', 'branch', 'members/[id]', 'staff', 'support'];

export default function OwnerLayout() {
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
          name="overview"
          options={{
            title: 'Overview',
            tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="operations"
          options={{
            title: 'Ops',
            tabBarIcon: ({ color, size }) => <Activity size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="members"
          options={{
            title: 'Members',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Approvals',
            tabBarIcon: ({ color, size }) => <CheckCircle size={size} color={color as any} />,
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
