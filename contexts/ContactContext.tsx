import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { ContactService } from '../services/contactService';
import { supabase } from '../services/supabaseClient';
import { Contact, Call, ContactContextType } from '../constants/types';
import { useAuth } from '../hooks/useAuth';

export const ContactContext = createContext<ContactContextType | undefined>(undefined);

export function ContactProvider({ children }: { children: ReactNode }) {
  const { user, userProfile, organization } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const [contactsData, callsData] = await Promise.all([
        ContactService.fetchContacts(organization.id),
        ContactService.fetchCalls(organization.id)
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
    if (!organization?.id) return;

    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const addContact = async (name: string, phoneNumber: string) => {
    if (!organization?.id || !user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    const result = await ContactService.createContact(
      name,
      phoneNumber,
      organization.id,
      user.id
    );

    if (result.success && result.data) {
      setContacts(prev => [...prev, result.data!]);
    }

    return result;
  };

  const updateContact = async (contactId: string, name: string, phoneNumber: string) => {
    const result = await ContactService.updateContact(contactId, name, phoneNumber);

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
    const result = await ContactService.deleteContact(contactId);

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
    if (!organization?.id || !user?.id) return;

    await ContactService.logCall(
      phoneNumber,
      direction,
      startTime,
      organization.id,
      user.id,
      duration
    );

    // Refresh calls data
    const callsData = await ContactService.fetchCalls(organization.id);
    setCalls(callsData);
  };

  const searchContacts = (query: string) => {
    return ContactService.searchContacts(contacts, query);
  };

  useEffect(() => {
    if (organization?.id) {
      loadData();

      // Set up real-time subscriptions
      const contactsSubscription = supabase
        .channel('contacts_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'contacts',
            filter: `org_id=eq.${organization.id}`
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
            table: 'calls',
            filter: `org_id=eq.${organization.id}`
          },
          () => {
            ContactService.fetchCalls(organization.id).then(setCalls);
          }
        )
        .subscribe();

      return () => {
        contactsSubscription.unsubscribe();
        callsSubscription.unsubscribe();
      };
    }
  }, [organization?.id]);

  const value = {
    contacts,
    calls,
    loading,
    refreshing,
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