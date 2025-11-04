import React, { createContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { AuthContextType, UserProfile } from '../constants/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
const USER_ID_KEY = 'auth-user-id';

// Timeout wrapper for async operations
const withTimeout = async (promise: Promise<any>, timeoutMs: number, errorMessage: string): Promise<any> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);

  const fetchUserData = async (userId: string) => {
    try {
      console.log('Fetching user data for:', userId);
      
      // Execute profile query directly with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );
      
      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const { data: profile, error: profileError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any;
      
      console.log('Profile query result:', { profile, profileError });
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        // Create a default user profile if database query fails
        const defaultProfile: UserProfile = {
          id: userId,
          email: user?.email || '',
          name: user?.user_metadata?.name || 'User',
          role: 'User' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        console.log('Using default profile due to error:', defaultProfile);
        setUserProfile(defaultProfile);
        return;
      }
      
      if (profile) {
        console.log('User profile loaded:', profile);
        console.log('User role:', profile.role);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Create fallback profile on error
      const fallbackProfile: UserProfile = {
        id: userId,
        email: user?.email || '',
        name: user?.user_metadata?.name || 'User',
        role: 'User' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log('Using fallback profile due to error:', fallbackProfile);
      setUserProfile(fallbackProfile);
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
    
    const initializeAuth = async () => {
      try {
        // Set overall timeout for authentication process
        const authTimeout = setTimeout(() => {
          console.warn('Authentication timeout reached after 10 seconds');
          setTimeoutReached(true);
          setLoading(false);
          setError('Authentication timeout. Please try again.');
        }, 10000);

        // Get initial session with timeout
        const sessionTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 8000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session } } = await Promise.race([
          sessionPromise,
          sessionTimeoutPromise
        ]) as any;

        clearTimeout(authTimeout);
        
        console.log('Initial session:', session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
          // Save user ID to storage
          await AsyncStorage.setItem(USER_ID_KEY, session.user.id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setError(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    };

    initializeAuth();

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
        
        // Don't block UI on auth state changes
        if (loading) {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    session,
    userProfile,
    loading,
    error,
    timeoutReached,
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
