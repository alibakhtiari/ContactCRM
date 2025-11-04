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

  const performInitialSync = async () => {
    if (!userProfile?.id) return;
    
    console.log('Performing initial device sync...');
    try {
      const syncResult = await BackgroundSyncService.syncAllDeviceData(userProfile.id);
      
      if (syncResult.success) {
        console.log(`Initial sync completed: ${syncResult.contacts.added} contacts, ${syncResult.calls.synced} calls`);
        // Refresh data after successful sync to show updated results
        await loadData();
      } else {
        console.warn('Initial sync had issues:', syncResult.errors);
        if (syncResult.errors.length > 0) {
          console.warn('Sync errors:', syncResult.errors);
        }
      }
    } catch (error) {
      console.error('Error during initial sync:', error);
    }
  };

  const loadData = async () => {
    if (!userProfile?.id) return;

    try {
      setLoading(true);
      
      // Just load data from server (sync happens separately)
      const [contactsData, callsData] = await Promise.all([
        ContactService.fetchContacts(),
        ContactService.fetchCalls()
      ]);
      
      console.log(`Loaded ${contactsData.length} contacts and ${callsData.length} calls from server`);
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
      
      // Sync device data first, then refresh from server
      const syncResult = await BackgroundSyncService.syncAllDeviceData(userProfile.id);
      if (syncResult.success) {
        console.log(`Manual sync completed: ${syncResult.contacts.added} contacts, ${syncResult.calls.synced} calls`);
        // Show detailed sync results
        if (syncResult.contacts.added > 0 || syncResult.calls.synced > 0) {
          console.log(`New data synced: ${syncResult.contacts.added} contacts, ${syncResult.calls.synced} calls`);
        }
      }
      
      // Load fresh data from server to show synced content
      await loadData();
    } catch (error) {
      console.error('Error refreshing data:', error);
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
      // Add to local state immediately for UI responsiveness
      setContacts(prev => [...prev, result.data!]);
      
      // Also refresh from server to ensure consistency
      setTimeout(() => {
        loadData();
      }, 500);
    }

    return result;
  };

  const updateContact = async (contactId: string, name: string, phoneNumber: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await ContactService.updateContact(contactId, name, phoneNumber, user.id);

    if (result.success && result.data) {
      // Update local state immediately for UI responsiveness
      setContacts(prev => 
        prev.map(contact => 
          contact.id === contactId ? result.data! : contact
        )
      );
      
      // Also refresh from server to ensure consistency
      setTimeout(() => {
        loadData();
      }, 500);
    }

    return result;
  };

  const deleteContact = async (contactId: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await ContactService.deleteContact(contactId, user.id);

    if (result.success) {
      // Remove from local state immediately for UI responsiveness
      setContacts(prev => prev.filter(contact => contact.id !== contactId));
      
      // Also refresh from server to ensure consistency
      setTimeout(() => {
        loadData();
      }, 500);
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

    // Refresh calls data to show the new call
    const callsData = await ContactService.fetchCalls();
    setCalls(callsData);
  };

  const searchContacts = (query: string) => {
    return ContactService.searchContacts(contacts, query);
  };

  useEffect(() => {
    if (userProfile?.id) {
      // Load data first
      loadData();
      
      // Perform initial sync in background (don't wait for it)
      setTimeout(() => {
        performInitialSync();
      }, 1000); // Small delay to let permissions settle

      // Register background sync
      BackgroundSyncService.registerBackgroundSync().then(result => {
        if (result.success) {
          setBackgroundSyncEnabled(true);
          console.log('Background server sync enabled');
        } else {
          console.log('Background server sync not available:', result.error);
        }
      });

      // Register the device sync task
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
            // App came to foreground - refresh data and sync
            console.log('App active - refreshing data and syncing');
            loadData();
            performInitialSync();
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
