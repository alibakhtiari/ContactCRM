import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Linking,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContacts } from '../../hooks/useContacts';
import { useAuth } from '../../hooks/useAuth';
import { CallLogItem } from '../../components/CallLogItem';
import { Call } from '../../constants/types';

export default function CallsScreen() {
  const insets = useSafeAreaInsets();
  const { userProfile, organization } = useAuth();
  const { calls, contacts, refreshing, refreshContacts, logCall } = useContacts();

  const handleCall = async (phoneNumber: string) => {
    // Log the outgoing call
    await logCall(phoneNumber, 'outgoing', new Date());
    
    // Attempt to make the call
    const url = `tel:${phoneNumber}`;
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      Linking.openURL(url);
    } else {
      console.log('Phone calling is not supported on this device');
    }
  };

  const simulateIncomingCall = async () => {
    // For demo purposes - simulate a call from first contact or random number
    const phoneNumber = contacts.length > 0 ? contacts[0].phone_number : '+1234567890';
    await logCall(phoneNumber, 'incoming', new Date(), Math.floor(Math.random() * 300));
  };

  const renderCall = ({ item }: { item: Call }) => (
    <CallLogItem
      call={item}
      contacts={contacts}
      onCall={handleCall}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="call" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No Call History</Text>
      <Text style={styles.emptyMessage}>
        Call history will appear here when you make or receive calls
      </Text>
      {__DEV__ && (
        <TouchableOpacity style={styles.demoButton} onPress={simulateIncomingCall}>
          <Text style={styles.demoButtonText}>Simulate Call (Dev Only)</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Call Log</Text>
          <Text style={styles.subtitle}>
            {calls.length} {calls.length === 1 ? 'call' : 'calls'} • {organization?.name}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshContacts}>
          <MaterialIcons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Call List */}
      <FlatList
        data={calls}
        renderItem={renderCall}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshContacts}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          calls.length === 0 && styles.emptyListContent
        ]}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  demoButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 20,
  },
  demoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});