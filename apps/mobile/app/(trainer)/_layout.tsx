import { Tabs } from 'expo-router';
import { Calendar, Users, DollarSign, User, Home } from '@tamagui/lucide-icons-2';
import { StatusBar } from '@queenix/ui';

/** Routes in this group that are pushed to, not tabs — hidden from the tab bar. */
const HIDDEN = ['clients/[id]', 'documents', 'sessions/new', 'time-off'];

export default function TrainerLayout() {
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
          name="today"
          options={{
            title: 'Today',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Schedule',
            tabBarIcon: ({ color, size }) => <Calendar size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clients',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color as any} />,
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, size }) => <DollarSign size={size} color={color as any} />,
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
