import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Call, Contact } from '../constants/types';

interface CallLogItemProps {
  call: Call;
  contacts: Contact[];
  onCall: (phoneNumber: string) => void;
}

export function CallLogItem({ call, contacts, onCall }: CallLogItemProps) {
  const contact = contacts.find(c => c.id === call.contact_id);
  const displayName = contact?.name || 'Unknown Contact';
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays <= 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes === 0) return `${remainingSeconds}s`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getDirectionIcon = () => {
    return call.direction === 'incoming' ? 'call-received' : 'call-made';
  };

  const getDirectionColor = () => {
    return call.direction === 'incoming' ? '#34C759' : '#007AFF';
  };

  return (
    <View style={styles.container}>
      <MaterialIcons 
        name={getDirectionIcon()} 
        size={24} 
        color={getDirectionColor()}
        style={styles.directionIcon}
      />
      
      <View style={styles.callInfo}>
        <Text style={styles.contactName}>{displayName}</Text>
        <Text style={styles.phoneNumber}>{call.phone_number}</Text>
        <View style={styles.callDetails}>
          <Text style={styles.callTime}>{formatDate(call.start_time)}</Text>
          {call.duration > 0 && (
            <Text style={styles.duration}> • {formatDuration(call.duration)}</Text>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.callButton}
        onPress={() => onCall(call.phone_number)}
      >
        <MaterialIcons name="call" size={20} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  directionIcon: {
    marginRight: 12,
  },
  callInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  duration: {
    fontSize: 12,
    color: '#8E8E93',
  },
  callButton: {
    padding: 8,
  },
});