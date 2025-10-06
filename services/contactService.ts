import { supabase } from './supabaseClient';
import { Contact, Call, UserProfile } from '../constants/types';

export class ContactService {
  static async fetchContacts(): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }

    return data || [];
  }

  static async createContact(
    name: string, 
    phoneNumber: string, 
    userId: string
  ): Promise<{ success: boolean; error?: string; data?: Contact }> {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        created_by_user_id: userId
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Phone number already exists' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  static async updateContact(
    contactId: string,
    name: string,
    phoneNumber: string
  ): Promise<{ success: boolean; error?: string; data?: Contact }> {
    const { data, error } = await supabase
      .from('contacts')
      .update({
        name: name.trim(),
        phone_number: phoneNumber.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Phone number already exists' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  static async deleteContact(contactId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  static async fetchCalls(): Promise<Call[]> {
    const { data, error } = await supabase
      .from('calls')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching calls:', error);
      return [];
    }

    return data || [];
  }

  static async logCall(
    phoneNumber: string,
    direction: 'incoming' | 'outgoing',
    startTime: Date,
    userId: string,
    duration: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    // Try to find existing contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_number', phoneNumber)
      .single();

    const { error } = await supabase
      .from('calls')
      .insert({
        user_id: userId,
        contact_id: contact?.id || null,
        phone_number: phoneNumber,
        direction,
        start_time: startTime.toISOString(),
        duration
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  static async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    console.log('ContactService.fetchUserProfile called with userId:', userId);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('fetchUserProfile result:', { data, error });
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    console.log('Returning user profile data:', data);
    return data;
  }

  static searchContacts(contacts: Contact[], query: string): Contact[] {
    if (!query.trim()) return contacts;
    
    const lowercaseQuery = query.toLowerCase();
    return contacts.filter(contact => 
      contact.name.toLowerCase().includes(lowercaseQuery) ||
      contact.phone_number.includes(query)
    );
  }
}