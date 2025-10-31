// Debug script to check user role in the app
import React from 'react';
import { View, Text, Button } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function DebugUserRole() {
  const { userProfile, loading } = useAuth();

  return (
    <View style={{ padding: 20, backgroundColor: 'yellow' }}>
      <Text>DEBUG INFO:</Text>
      <Text>Loading: {loading.toString()}</Text>
      <Text>User Profile: {userProfile ? 'Loaded' : 'Null'}</Text>
      {userProfile && (
        <>
          <Text>Name: {userProfile.name}</Text>
          <Text>Email: {userProfile.email}</Text>
          <Text>Role: "{userProfile.role}"</Text>
          <Text>Role Length: {userProfile.role.length}</Text>
          <Text>Role Lowercase: "{userProfile.role.toLowerCase()}"</Text>
          <Text>Role Check (owner): {userProfile.role.toLowerCase() === 'owner'}</Text>
          <Text>Role Check (Owner): {userProfile.role.toLowerCase() === 'Owner'}</Text>
        </>
      )}
    </View>
  );
}
