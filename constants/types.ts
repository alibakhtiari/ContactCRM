export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'User';
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  phone_number: string;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  contact_id: string | null;
  user_id: string;
  phone_number: string;
  direction: 'incoming' | 'outgoing';
  start_time: string;
  duration: number;
  created_at: string;
}

export interface AuthContextType {
  user: any | null;
  session: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface ContactContextType {
  contacts: Contact[];
  calls: Call[];
  loading: boolean;
  refreshing: boolean;
  addContact: (name: string, phoneNumber: string) => Promise<{ success: boolean; error?: string }>;
  updateContact: (contactId: string, name: string, phoneNumber: string) => Promise<{ success: boolean; error?: string }>;
  deleteContact: (contactId: string) => Promise<{ success: boolean; error?: string }>;
  logCall: (phoneNumber: string, direction: 'incoming' | 'outgoing', startTime: Date, duration?: number) => Promise<void>;
  refreshContacts: () => Promise<void>;
  searchContacts: (query: string) => Contact[];
}