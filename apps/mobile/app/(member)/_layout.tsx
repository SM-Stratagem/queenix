import { Tabs } from 'expo-router';
import { Home, Calendar, QrCode, Gift, User } from '@tamagui/lucide-icons';
import { StatusBar } from '@queenix/ui';

export default function MemberLayout() {
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
      </Tabs>
    </>
  );
}
