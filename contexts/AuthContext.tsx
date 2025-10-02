import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { ContactService } from '../services/contactService';
import { AuthContextType, UserProfile, Organization } from '../constants/types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId);
      const profile = await ContactService.fetchUserProfile(userId);
      console.log('Profile from ContactService:', profile);
      
      if (profile) {
        setUserProfile(profile);
        console.log('Set userProfile in state:', profile);
        
        // Fetch organization data
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.org_id)
          .single();
        
        console.log('Organization data:', org);
        if (org) {
          setOrganization(org);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      console.log('Refreshing profile for user:', user.id);
      await fetchUserData(user.id);
    }
  };



  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setOrganization(null);
  };

  useEffect(() => {
    console.log('Auth useEffect - getting initial session');
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setUserProfile(null);
          setOrganization(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    userProfile,
    organization,
    loading,
    signIn,
    signOut,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}