import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ContactService } from '../services/contactService';
import { supabase } from '../services/supabaseClient';
import { Contact, Call, ContactContextType } from '../constants/types';
import { useAuth } from '../hooks/useAuth';
import { BackgroundSyncService } from '../services/backgroundSync';

export const ContactContext = createContext<ContactContextType | undefined>(undefined);

export function ContactProvider({ children }: { children: ReactNode }) {
  const { user, userProfile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(false);

  const loadData = async () => {
    if (!userProfile?.id) return;

    try {
      setLoading(true);
      const [contactsData, callsData] = await Promise.all([
        ContactService.fetchContacts(),
        ContactService.fetchCalls()
      ]);
      
      setContacts(contactsData);
      setCalls(callsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshContacts = async () => {
    if (!userProfile?.id) return;

    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const addContact = async (name: string, phoneNumber: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await ContactService.createContact(
      name,
      phoneNumber,
      user.id
    );

    if (result.success && result.data) {
      setContacts(prev => [...prev, result.data!]);
    }

    return result;
  };

  const updateContact = async (contactId: string, name: string, phoneNumber: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await ContactService.updateContact(contactId, name, phoneNumber, user.id);

    if (result.success && result.data) {
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId ? result.data! : contact
        )
      );
    }

    return result;
  };

  const deleteContact = async (contactId: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await ContactService.deleteContact(contactId, user.id);

    if (result.success) {
      setContacts(prev => prev.filter(contact => contact.id !== contactId));
    }

    return result;
  };

  const logCall = async (
    phoneNumber: string,
    direction: 'incoming' | 'outgoing',
    startTime: Date,
    duration: number = 0
  ) => {
    if (!user?.id) return;

    await ContactService.logCall(
      phoneNumber,
      direction,
      startTime,
      user.id,
      duration
    );

    // Refresh calls data
    const callsData = await ContactService.fetchCalls();
    setCalls(callsData);
  };

  const searchContacts = (query: string) => {
    return ContactService.searchContacts(contacts, query);
  };

  useEffect(() => {
    if (userProfile?.id) {
      loadData();

      // Register background sync
      BackgroundSyncService.registerBackgroundSync().then(result => {
        if (result.success) {
          setBackgroundSyncEnabled(true);
          console.log('Background server sync enabled');
        } else {
          console.log('Background server sync not available:', result.error);
        }
      });

      // ADD THIS: Register the device sync task
      BackgroundSyncService.registerDeviceDataSync().then(result => {
        if (result.success) {
          console.log('Background device sync enabled');
        } else {
          console.log('Background device sync not available:', result.error);
        }
      });

      // Handle app state changes
      const appStateSubscription = AppState.addEventListener(
        'change',
        (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
            // App came to foreground - refresh data
            console.log('App active - refreshing data');
            loadData();
          }
        }
      );

      // Set up real-time subscriptions
      const contactsSubscription = supabase
        .channel('contacts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contacts'
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      const callsSubscription = supabase
        .channel('calls_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'calls'
          },
          () => {
            ContactService.fetchCalls().then(setCalls);
          }
        )
        .subscribe();

      return () => {
        appStateSubscription.remove();
        contactsSubscription.unsubscribe();
        callsSubscription.unsubscribe();
      };
    }
  }, [userProfile?.id]);

  const value = {
    contacts,
    calls,
    loading,
    refreshing,
    backgroundSyncEnabled,
    addContact,
    updateContact,
    deleteContact,
    logCall,
    refreshContacts,
    searchContacts
  };

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
}
