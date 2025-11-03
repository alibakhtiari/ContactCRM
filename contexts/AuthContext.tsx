import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { AuthContextType, UserProfile } from '../constants/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_ID_KEY = 'auth-user-id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log('Profile query result:', { profile, profileError });
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return;
      }
      
      if (profile) {
        console.log('User profile loaded:', profile);
        console.log('User role:', profile.role);
        setUserProfile(profile);
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
    try {
      console.log('Signing out user');
      
      // Clear state first for immediate UI feedback
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      // Remove user ID from storage
      await AsyncStorage.removeItem(USER_ID_KEY);
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        // Even if signOut fails, we've already cleared local state
      }
      
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Error during sign out:', error);
      // Ensure state is cleared even on error
      setUser(null);
      setSession(null);
      setUserProfile(null);
    }
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
          // Save user ID to storage
          await AsyncStorage.setItem(USER_ID_KEY, session.user.id);
        } else {
          setUserProfile(null);
          // Remove user ID from storage
          await AsyncStorage.removeItem(USER_ID_KEY);
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
