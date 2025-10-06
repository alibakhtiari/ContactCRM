import { supabase } from './supabaseClient';
import { UserProfile } from '../constants/types';

export class UserService {
  static async createTeamMember(
    email: string,
    password: string,
    name: string,
    role: 'Owner' | 'User' = 'User'
  ): Promise<{ success: boolean; error?: string; data?: UserProfile }> {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      // Create user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          name,
          email,
          role
        })
        .select()
        .single();

      if (profileError) {
        return { success: false, error: profileError.message };
      }

      return { success: true, data: profileData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async updateUserRole(
    userId: string,
    role: 'Owner' | 'User'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async deleteTeamMember(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // This will cascade delete the user profile due to FK constraints
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}