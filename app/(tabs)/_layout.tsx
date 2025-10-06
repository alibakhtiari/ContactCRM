import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const LogoutButton = () => (
    <TouchableOpacity 
      onPress={signOut}
      style={{ 
        marginRight: 15, 
        backgroundColor: '#FF3B30', 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 6 
      }}
    >
      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Logout</Text>
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <LogoutButton />,
        headerStyle: {
          backgroundColor: '#F2F2F7',
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '600',
          color: '#000',
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: Platform.select({
            ios: insets.bottom + 60,
            android: insets.bottom + 60,
            default: 70,
          }),
          paddingTop: 8,
          paddingBottom: Platform.select({
            ios: insets.bottom + 8,
            android: insets.bottom + 8,
            default: 8,
          }),
          paddingHorizontal: 16,
          backgroundColor: '#F2F2F7',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="contacts" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Call Log',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="call" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: 'Team',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="group" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}