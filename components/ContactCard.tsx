import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Contact } from '../constants/types';
import { useAuth } from '../hooks/useAuth';

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  onCall: (phoneNumber: string) => void;
}

export function ContactCard({ contact, onEdit, onDelete, onCall }: ContactCardProps) {
  const { userProfile } = useAuth();
  
  const canEdit = userProfile?.role === 'Owner' || contact.created_by_user_id === userProfile?.id;
  const isOwner = contact.created_by_user_id === userProfile?.id;

  return (
    <View style={styles.card}>
      <View style={styles.mainContent}>
        <View style={styles.contactInfo}>
          <Text style={styles.name}>{contact.name}</Text>
          <Text style={styles.phone}>{contact.phone_number}</Text>
          {isOwner && <Text style={styles.ownedLabel}>Your contact</Text>}
        </View>
        
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => onCall(contact.phone_number)}
          >
            <MaterialIcons name="call" size={24} color="#fff" />
          </TouchableOpacity>
          
          {canEdit && (
            <>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => onEdit(contact)}
              >
                <MaterialIcons name="edit" size={20} color="#007AFF" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => onDelete(contact.id)}
              >
                <MaterialIcons name="delete" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 4,
  },
  ownedLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callButton: {
    backgroundColor: '#34C759',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
});