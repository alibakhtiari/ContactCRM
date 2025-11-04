import React, { createContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { ContactService } from '../services/contactService';
import { supabase } from '../services/supabaseClient';
import { Contact, Call, ContactContextType } from '../constants/types';
import { useAuth } from '../hooks/useAuth';
import { BackgroundSyncService } from '../services/backgroundSync';
import { AndroidCallLogService } from '../services/androidCallLogService';

export const ContactContext = createContext<ContactContextType | undefined>(undefined);

export function ContactProvider({ children }: { children: ReactNode }) {
  const { user, userProfile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs to prevent multiple concurrent operations and memory leaks
  const loadDataTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingDataRef = useRef(false);
  const isSyncingRef = useRef(false);
  const subscriptionsRef = useRef<any[]>([]);
  const userIdRef = useRef<string | null>(null);

  // Clear any pending timeouts on unmount
  const clearAllTimeouts = useCallback(() => {
    if (loadDataTimeoutRef.current) {
      clearTimeout(loadDataTimeoutRef.current);
      loadDataTimeoutRef.current = null;
    }
  }, []);

  // Enhanced error handler
  const handleError = useCallback((error: any, context: string) => {
    const errorMessage = `${context}: ${error?.message || error}`;
    console.error(errorMessage);
    setError(errorMessage);
    
    // Clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  }, []);

  // Enhanced data loading with timeout and error handling
  const loadData = useCallback(async (timeoutMs: number = 10000) => {
    if (!userProfile?.id || isLoadingDataRef.current) {
      return;
    }

    try {
      isLoadingDataRef.current = true;
      setLoading(true);
      setError(null);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Data loading timeout')), timeoutMs);
      });

      // Create loading promise
      const loadingPromise = Promise.all([
        ContactService.fetchContacts(),
        ContactService.fetchCalls()
      ]);

      const [contactsData, callsData] = await Promise.race([loadingPromise, timeoutPromise]) as [Contact[], Call[]];
      
      setContacts(contactsData || []);
      setCalls(callsData || []);
      
      console.log(`Loaded ${contactsData?.length || 0} contacts and ${callsData?.length || 0} calls from server`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Data loading timeout') {
        handleError(error, 'Data loading timeout');
      } else {
        handleError(error, 'Error loading data');
      }
    } finally {
      setLoading(false);
      isLoadingDataRef.current = false;
    }
  }, [userProfile?.id, handleError]);

  // Enhanced permission handling with better error management
  const performInitialSync = useCallback(async () => {
    if (!userProfile?.id || isSyncingRef.current) {
      return;
    }

    try {
      isSyncingRef.current = true;
      console.log('Starting initial device sync...');

      let granted = false;
      if (Platform.OS === 'android') {
        try {
          granted = await AndroidCallLogService.requestPermissions();
        } catch (permError) {
          console.warn('Permission request failed:', permError);
          granted = false;
        }
      } else {
        // For iOS/web, we can't sync from device, but we can proceed
        granted = true;
      }

      if (granted) {
        console.log('Permissions granted, running sync...');
        
        try {
          const syncResult = await BackgroundSyncService.syncAllDeviceData(userProfile.id);
          
          if (syncResult.success) {
            console.log(`Initial sync completed: ${syncResult.contacts.added} contacts, ${syncResult.calls.synced} calls`);
            // Refresh data after successful sync to show updated results
            loadData(5000); // Shorter timeout for refresh
          } else {
            console.warn('Initial sync had issues:', syncResult.errors);
            if (syncResult.errors.length > 0) {
              console.warn('Sync errors:', syncResult.errors);
            }
          }
        } catch (syncError) {
          console.warn('Sync operation failed:', syncError);
        }
      } else {
        console.warn('Permissions denied, skipping initial device sync.');
      }
    } catch (error) {
      console.error('Error during initial sync:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [userProfile?.id, loadData]);

  // Enhanced refresh with better error handling
  const refreshContacts = useCallback(async () => {
    if (!userProfile?.id || refreshing) {
      return;
    }

    try {
      setRefreshing(true);
      setError(null);

      // Add timeout to prevent hanging
      const refreshTimeout = setTimeout(() => {
        handleError(new Error('Refresh operation timed out'), 'Manual refresh');
        setRefreshing(false);
      }, 15000);

      const syncResult = await BackgroundSyncService.syncAllDeviceData(userProfile.id);
      clearTimeout(refreshTimeout);

      if (syncResult.success) {
        console.log(`Manual sync completed: ${syncResult.contacts.added} contacts, ${syncResult.calls.synced} calls`);
        if (syncResult.contacts.added > 0 || syncResult.calls.synced > 0) {
          console.log(`New data synced: ${syncResult.contacts.added} contacts, ${syncResult.calls.synced} calls`);
        }
      }
      
      // Load fresh data from server to show synced content
      await loadData(8000);
    } catch (error) {
      handleError(error, 'Error refreshing data');
    } finally {
      setRefreshing(false);
    }
  }, [userProfile?.id, refreshing, handleError, loadData]);

  // Enhanced contact operations with better error handling
  const addContact = useCallback(async (name: string, phoneNumber: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await ContactService.createContact(name, phoneNumber, user.id);

      if (result.success && result.data) {
        // Add to local state immediately for UI responsiveness
        setContacts(prev => [...prev, result.data!]);
        
        // Refresh from server with timeout to ensure consistency
        if (loadDataTimeoutRef.current) {
          clearTimeout(loadDataTimeoutRef.current);
        }
        loadDataTimeoutRef.current = setTimeout(() => {
          loadData(5000);
        }, 1000);
      }

      return result;
    } catch (error) {
      handleError(error, 'Error adding contact');
      return { success: false, error: 'Failed to add contact' };
    }
  }, [user?.id, handleError, loadData]);

  const updateContact = useCallback(async (contactId: string, name: string, phoneNumber: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await ContactService.updateContact(contactId, name, phoneNumber, user.id);

      if (result.success && result.data) {
        // Update local state immediately for UI responsiveness
        setContacts(prev => 
          prev.map(contact => 
            contact.id === contactId ? result.data! : contact
          )
        );
        
        // Refresh from server to ensure consistency
        if (loadDataTimeoutRef.current) {
          clearTimeout(loadDataTimeoutRef.current);
        }
        loadDataTimeoutRef.current = setTimeout(() => {
          loadData(5000);
        }, 1000);
      }

      return result;
    } catch (error) {
      handleError(error, 'Error updating contact');
      return { success: false, error: 'Failed to update contact' };
    }
  }, [user?.id, handleError, loadData]);

  const deleteContact = useCallback(async (contactId: string) => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await ContactService.deleteContact(contactId, user.id);

      if (result.success) {
        // Remove from local state immediately for UI responsiveness
        setContacts(prev => prev.filter(contact => contact.id !== contactId));
        
        // Refresh from server to ensure consistency
        if (loadDataTimeoutRef.current) {
          clearTimeout(loadDataTimeoutRef.current);
        }
        loadDataTimeoutRef.current = setTimeout(() => {
          loadData(5000);
        }, 1000);
      }

      return result;
    } catch (error) {
      handleError(error, 'Error deleting contact');
      return { success: false, error: 'Failed to delete contact' };
    }
  }, [user?.id, handleError, loadData]);

  const logCall = useCallback(async (
    phoneNumber: string,
    direction: 'incoming' | 'outgoing',
    startTime: Date,
    duration: number = 0
  ) => {
    if (!user?.id) return;

    try {
      await ContactService.logCall(phoneNumber, direction, startTime, user.id, duration);

      // Refresh calls data with timeout
      try {
        const callsData = await Promise.race([
          ContactService.fetchCalls(),
          new Promise<Call[]>((_, reject) => 
            setTimeout(() => reject(new Error('Call log fetch timeout')), 5000)
          )
        ]);
        setCalls(callsData || []);
      } catch (callError) {
        console.warn('Failed to refresh calls data:', callError);
      }
    } catch (error) {
      console.error('Error logging call:', error);
    }
  }, [user?.id]);

  const searchContacts = useCallback((query: string) => {
    try {
      return ContactService.searchContacts(contacts, query);
    } catch (error) {
      handleError(error, 'Error searching contacts');
      return contacts; // Return original list on error
    }
  }, [contacts, handleError]);

  // Enhanced setup with proper cleanup
  useEffect(() => {
    if (userProfile?.id && userProfile.id !== userIdRef.current) {
      userIdRef.current = userProfile.id;
      
      console.log('Setting up ContactContext for user:', userProfile.id);
      
      // Clean up previous subscriptions
      subscriptionsRef.current.forEach(subscription => {
        try {
          subscription.unsubscribe?.();
        } catch (error) {
          console.warn('Error unsubscribing:', error);
        }
      });
      subscriptionsRef.current = [];

      // Load data first
      loadData();
      
      // Perform initial sync with delay
      const syncTimeout = setTimeout(() => {
        performInitialSync();
      }, 2000);

      // Register background sync with error handling
      BackgroundSyncService.registerBackgroundSync().then(result => {
        if (result.success) {
          setBackgroundSyncEnabled(true);
          console.log('Background server sync enabled');
        } else {
          console.log('Background server sync not available:', result.error);
        }
      }).catch(error => {
        console.warn('Background sync registration failed:', error);
      });

      // Register device sync task
      BackgroundSyncService.registerDeviceDataSync().then(result => {
        if (result.success) {
          console.log('Background device sync enabled');
        } else {
          console.log('Background device sync not available:', result.error);
        }
      }).catch(error => {
        console.warn('Device sync registration failed:', error);
      });

      // Enhanced app state handling
      const handleAppStateChange = (nextAppState: AppStateStatus) => {
        console.log('App state changed to:', nextAppState);
        
        if (nextAppState === 'active') {
          // App came to foreground - refresh data with timeout
          loadData(8000);
          
          // Only sync if we haven't synced recently (prevent excessive sync)
          const lastSync = Date.now() - (userIdRef.current ? 60000 : 0); // 1 minute cooldown
          if (Date.now() - lastSync > 60000) {
            performInitialSync();
          }
        }
      };

      const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
      subscriptionsRef.current.push(appStateSubscription);

      // Set up real-time subscriptions with error handling
      try {
        const contactsSubscription = supabase
          .channel('contacts_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'contacts'
          }, () => {
            console.log('Contacts changed, reloading data...');
            loadData(5000);
          })
          .subscribe((status) => {
            console.log('Contacts subscription status:', status);
          });

        subscriptionsRef.current.push(contactsSubscription);

        const callsSubscription = supabase
          .channel('calls_changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'calls'
          }, () => {
            console.log('Calls changed, refreshing...');
            ContactService.fetchCalls()
              .then(setCalls)
              .catch(error => console.warn('Failed to refresh calls:', error));
          })
          .subscribe((status) => {
            console.log('Calls subscription status:', status);
          });

        subscriptionsRef.current.push(callsSubscription);
      } catch (subError) {
        console.warn('Failed to setup real-time subscriptions:', subError);
      }

      // Cleanup function
      return () => {
        clearTimeout(syncTimeout);
        clearAllTimeouts();
        
        // Unsubscribe from all subscriptions
        subscriptionsRef.current.forEach(subscription => {
          try {
            subscription.remove?.();
            subscription.unsubscribe?.();
          } catch (error) {
            console.warn('Error cleaning up subscription:', error);
          }
        });
        subscriptionsRef.current = [];
      };
    }
  }, [userProfile?.id, loadData, performInitialSync, clearAllTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      userIdRef.current = null;
    };
  }, [clearAllTimeouts]);

  const value = {
    contacts,
    calls,
    loading,
    refreshing,
    backgroundSyncEnabled,
    error,
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
