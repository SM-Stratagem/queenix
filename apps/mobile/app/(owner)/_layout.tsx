import { Tabs } from 'expo-router';
import { BarChart3, Activity, Users, CheckCircle, User } from '@tamagui/lucide-icons';
import { StatusBar } from '@queenix/ui';

export default function OwnerLayout() {
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
      </Tabs>
    </>
  );
}
