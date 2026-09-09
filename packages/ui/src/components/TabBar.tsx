import React from 'react';
import { Pressable, View } from 'react-native';
import { XStack, YStack, Text, useTheme } from 'tamagui';

export interface TabItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  badge?: number;
}

export interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeKey, onChange }) => {
  return (
    <XStack
      backgroundColor="$surfaceElevated"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      paddingVertical="$2"
      paddingHorizontal="$2"
      justifyContent="space-around"
      alignItems="center"
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
          >
            <YStack alignItems="center" gap="$0.5" paddingVertical="$1">
              <View>
                {active ? (tab.activeIcon ?? tab.icon) : tab.icon}
                {tab.badge != null && tab.badge > 0 && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      backgroundColor: '#ef4444',
                      borderRadius: 10,
                      minWidth: 18,
                      height: 18,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text fontSize={10} fontWeight="700" color="white">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                fontSize={11}
                fontWeight={active ? '700' : '500'}
                color={active ? '$brand' : '$textMuted'}
              >
                {tab.label}
              </Text>
            </YStack>
          </Pressable>
        );
      })}
    </XStack>
  );
};
