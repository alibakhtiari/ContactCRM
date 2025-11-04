import { supabase } from './supabaseClient';
import { Contact, Call, UserProfile } from '../constants/types';
import { normalizeIranianPhoneNumber, arePhoneNumbersEqual } from './phoneNumberUtils';
import * as Contacts from 'expo-contacts';

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
    // Normalize the phone number
    const normalizedPhone = normalizeIranianPhoneNumber(phoneNumber.trim());
    
    if (!normalizedPhone.isValid) {
      return { success: false, error: 'Invalid Iranian phone number format' };
    }

    // Check for existing contact with same normalized number across all users
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', normalizedPhone.normalized);

    if (existingContacts && existingContacts.length > 0) {
      const existingContact = existingContacts[0];
      // If contact exists but was created by another user, return error
      if (existingContact.created_by_user_id !== userId) {
        return { 
          success: false, 
          error: `This phone number already belongs to contact: ${existingContact.name}` 
        };
      }
      // If same user created it, return success with existing data
      return { success: true, data: existingContact };
    }

    // 1. Create in Supabase
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        name: name.trim(),
        phone_number: normalizedPhone.normalized,
        created_by_user_id: userId
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 2. Create on Device
    try {
      const contact = {
        [Contacts.Fields.FirstName]: name.trim(),
        phoneNumbers: [{
          label: 'mobile' as any,
          number: normalizedPhone.normalized,
        }],
      };
      await Contacts.addContactAsync(contact);
    } catch (deviceError: any) {
      console.warn('Failed to add contact to device, but saved to server:', deviceError.message);
      // Don't return an error, as the server-side was successful
    }

    return { success: true, data };
  }

  static async updateContact(
    contactId: string,
    name: string,
    phoneNumber: string,
    userId: string
  ): Promise<{ success: boolean; error?: string; data?: Contact }> {
    // Check if user owns this contact
    const { data: contactToCheck } = await supabase
      .from('contacts')
      .select('created_by_user_id')
      .eq('id', contactId)
      .single();

    if (!contactToCheck || contactToCheck.created_by_user_id !== userId) {
      return { success: false, error: 'You can only edit your own contacts' };
    }

    // Normalize the phone number
    const normalizedPhone = normalizeIranianPhoneNumber(phoneNumber.trim());
    
    if (!normalizedPhone.isValid) {
      return { success: false, error: 'Invalid Iranian phone number format' };
    }

    // Check for existing contact with same normalized number (excluding current)
    const { data: existingContacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone_number', normalizedPhone.normalized)
      .neq('id', contactId);

    if (existingContacts && existingContacts.length > 0) {
      const existingContact = existingContacts[0];
      if (existingContact.created_by_user_id !== userId) {
        return { 
          success: false, 
          error: `This phone number already belongs to contact: ${existingContact.name}` 
        };
      }
    }

    // 1. Update in Supabase
    const { data, error } = await supabase
      .from('contacts')
      .update({
        name: name.trim(),
        phone_number: normalizedPhone.normalized,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // 2. Update on Device
    try {
      // Find the device contact to update (this is tricky, as we don't store the device contact ID)
      // We'll search by phone number. This is imperfect but the best we can do.
      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        phoneNumbers: [normalizedPhone.normalized],
      });

      if (deviceContacts.length > 0) {
        const deviceContact = deviceContacts[0];
        deviceContact.firstName = name.trim();
        // You may need more logic here to find and update the *correct* phone number
        // For this example, we assume it's the first one.
        if (deviceContact.phoneNumbers && deviceContact.phoneNumbers.length > 0) {
          deviceContact.phoneNumbers[0].number = normalizedPhone.normalized;
        }
        await Contacts.updateContactAsync(deviceContact);
      }
    } catch (deviceError: any) {
      console.warn('Failed to update contact on device, but saved to server:', deviceError.message);
    }

    return { success: true, data };
  }

  static async deleteContact(contactId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    // Get phone number before deleting
    const { data: contactToDelete } = await supabase
      .from('contacts')
      .select('id, phone_number')
      .eq('id', contactId)
      .single();

    if (!contactToDelete) {
      return { success: false, error: 'Contact not found' };
    }

    // Check ownership
    const { data: contactToCheck } = await supabase
      .from('contacts')
      .select('created_by_user_id')
      .eq('id', contactId)
      .single();

    if (!contactToCheck || contactToCheck.created_by_user_id !== userId) {
      return { success: false, error: 'You can only delete your own contacts' };
    }

    // 1. Delete from Supabase
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      return { success: false, error: error.message };
    }

    // 2. Delete from Device
    try {
      const { data: deviceContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        phoneNumbers: [contactToDelete.phone_number],
      });

      if (deviceContacts.length > 0) {
        await Contacts.removeContactAsync(deviceContacts[0].id);
      }
    } catch (deviceError: any) {
      console.warn('Failed to delete contact from device, but removed from server:', deviceError.message);
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
    // Normalize the phone number for consistent lookup
    const normalizedPhone = normalizeIranianPhoneNumber(phoneNumber);
    
    // Try to find existing contact using normalized number
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_number', normalizedPhone.normalized)
      .single();

    const { error } = await supabase
      .from('calls')
      .insert({
        user_id: userId,
        contact_id: contact?.id || null,
        phone_number: normalizedPhone.normalized || phoneNumber, // Use normalized if valid
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

  /**
   * Sync contacts from device to Supabase
   */
  static async syncDeviceContacts(deviceContacts: any[], userId: string): Promise<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
      console.log(`Starting device contact sync: ${deviceContacts.length} contacts from device`);
      
      for (const deviceContact of deviceContacts) {
        try {
          const phoneNumber = deviceContact.phoneNumber || 
                             (deviceContact.phoneNumbers?.[0]?.number || '');
          
          if (!phoneNumber) continue;

          const normalizedPhone = normalizeIranianPhoneNumber(phoneNumber);
          if (!normalizedPhone.isValid) continue;

          // Check if contact exists
          const { data: existingContact } = await supabase
            .from('contacts')
            .select('*')
            .eq('phone_number', normalizedPhone.normalized)
            .single();

          if (existingContact) {
            // Contact exists, check ownership
            if (existingContact.created_by_user_id === userId) {
              // Update if name changed
              if (existingContact.name !== deviceContact.name) {
                console.log(`Updating contact ${existingContact.name} -> ${deviceContact.name}`);
                await this.updateContact(existingContact.id, deviceContact.name, phoneNumber, userId);
                updated++;
              }
            }
            // If different owner, skip (don't overwrite others' contacts)
          } else {
            // Create new contact
            console.log(`Creating new contact: ${deviceContact.name} (${phoneNumber})`);
            const result = await this.createContact(
              deviceContact.name || 'Unknown',
              phoneNumber,
              userId
            );
            
            if (result.success) {
              added++;
            } else if (result.error) {
              errors.push(`Failed to add ${deviceContact.name}: ${result.error}`);
            }
          }
        } catch (contactError) {
          errors.push(`Error processing contact ${deviceContact.name}: ${contactError}`);
        }
      }

      console.log(`Device contact sync completed: ${added} added, ${updated} updated, ${errors.length} errors`);
      return { success: true, added, updated, errors };
    } catch (error) {
      console.error('Device contact sync failed:', error);
      return { 
        success: false, 
        added: 0, 
        updated: 0, 
        errors: [`Sync failed: ${error}`] 
      };
    }
  }

  /**
   * Sync server contacts to device (two-way sync)
   */
  static async syncServerContactsToDevice(userId: string): Promise<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let added = 0;
    let updated = 0;

    try {
      console.log('Starting server-to-device contact sync');
      
      // Get server contacts for this user
      const serverContacts = await this.fetchContacts();
      console.log(`Found ${serverContacts.length} server contacts for user ${userId}`);
      
      // Get existing device contacts
      const deviceContactsResponse = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.FirstName],
      });
      
      // Access the contacts array from the response
      const deviceContacts = deviceContactsResponse.data || [];
      console.log(`Found ${deviceContacts.length} device contacts`);
      
      for (const serverContact of serverContacts) {
        try {
          // Find if this contact exists on device
          const existingDeviceContact = deviceContacts.find((deviceContact: any) => 
            deviceContact.phoneNumbers?.some((devicePhone: any) => 
              arePhoneNumbersEqual(devicePhone.number || '', serverContact.phone_number)
            )
          );

          if (existingDeviceContact) {
            // Contact exists on device, check if name needs update
            if (existingDeviceContact.firstName !== serverContact.name) {
              console.log(`Updating device contact: ${existingDeviceContact.firstName} -> ${serverContact.name}`);
              // Create update object with required fields
              const updateData = {
                id: existingDeviceContact.id,
                firstName: serverContact.name,
                phoneNumbers: existingDeviceContact.phoneNumbers?.map((phone: any) => ({
                  ...phone,
                  number: phone.number === serverContact.phone_number ? serverContact.phone_number : phone.number
                })) || []
              };
              await Contacts.updateContactAsync(updateData);
              updated++;
            }
          } else {
            // Contact doesn't exist on device, create it
            console.log(`Creating device contact: ${serverContact.name} (${serverContact.phone_number})`);
            const newContact = {
              [Contacts.Fields.FirstName]: serverContact.name,
              phoneNumbers: [{
                label: 'mobile' as any,
                number: serverContact.phone_number,
              }],
            };
            await Contacts.addContactAsync(newContact);
            added++;
          }
        } catch (contactError) {
          console.error('Error syncing server contact to device:', contactError);
          errors.push(`Error syncing ${serverContact.name}: ${contactError}`);
        }
      }

      console.log(`Server-to-device contact sync completed: ${added} added, ${updated} updated, ${errors.length} errors`);
      return { success: true, added, updated, errors };
    } catch (error) {
      console.error('Server-to-device contact sync failed:', error);
      return {
        success: false,
        added: 0,
        updated: 0,
        errors: [`Server-to-device sync failed: ${error}`]
      };
    }
  }

  /**
   * Get contacts that can be edited by the current user
   */
  static getEditableContacts(contacts: Contact[], userId: string): Contact[] {
    return contacts.filter(contact => contact.created_by_user_id === userId);
  }

  /**
   * Check if a contact can be edited by the user
   */
  static canEditContact(contact: Contact, userId: string): boolean {
    return contact.created_by_user_id === userId;
  }
}
