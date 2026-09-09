import { Tabs } from 'expo-router';
import { Calendar, Users, DollarSign, User, Home } from '@tamagui/lucide-icons';
import { StatusBar } from '@queenix/ui';

export default function TrainerLayout() {
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
      </Tabs>
    </>
  );
}
