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
      const { data, error } = await supabase.rpc('create_team_member', {
        member_email: email,
        member_password: password,
        member_name: name,
        member_role: role
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.success) {
        // Fetch the created user profile
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user_id)
          .single();

        if (profileError) {
          return { success: false, error: profileError.message };
        }

        return { success: true, data: profileData };
      } else {
        return { success: false, error: data.error };
      }
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