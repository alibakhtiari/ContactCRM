import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';
import { UserProfile } from '../../constants/types';
import { AddUserForm } from '../../components/AddUserForm';
import { UserService } from '../../services/userService';

interface TeamMemberCardProps {
  member: UserProfile;
  isCurrentUser: boolean;
  isCurrentUserOwner: boolean;
  onEdit?: (member: UserProfile) => void;
  onDelete?: (member: UserProfile) => void;
}

function TeamMemberCard({ member, isCurrentUser, isCurrentUserOwner, onEdit, onDelete }: TeamMemberCardProps) {
  const getRoleColor = (role: string) => {
    return role === 'Owner' ? '#007AFF' : '#8E8E93';
  };

  const getRoleIcon = (role: string) => {
    return role === 'Owner' ? 'admin-panel-settings' : 'person';
  };

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <MaterialIcons 
          name={getRoleIcon(member.role)} 
          size={32} 
          color={getRoleColor(member.role)} 
        />
      </View>
      
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {member.name}
          {isCurrentUser && <Text style={styles.youLabel}> (You)</Text>}
        </Text>
        <Text style={styles.memberEmail}>{member.email}</Text>
        <Text style={[styles.memberRole, { color: getRoleColor(member.role) }]}>
          {member.role}
        </Text>
      </View>

      <View style={styles.memberActions}>
        <View style={styles.memberStats}>
          <MaterialIcons name="fiber-manual-record" size={8} color="#34C759" />
          <Text style={styles.statusText}>Active</Text>
        </View>
        
        {isCurrentUserOwner && !isCurrentUser && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => onDelete?.(member)}
            >
              <MaterialIcons name="delete" size={18} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function TeamScreen() {
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const insets = useSafeAreaInsets();
  const { userProfile, refreshProfile, signOut } = useAuth();

  // Cross-platform alert
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (
    title: string, 
    message: string, 
    buttons?: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
  ) => {
    if (Platform.OS === 'web') {
      setAlertConfig({ visible: true, title, message, buttons });
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('role', { ascending: false }) // Owners first
        .order('name');

      if (error) {
        console.error('Error loading team members:', error);
        return;
      }

      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMember = (member: UserProfile) => {
    const newRole = member.role === 'Owner' ? 'User' : 'Owner';
    showAlert(
      'Change Role',
      `Change ${member.name}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Change Role', 
          onPress: async () => {
            const result = await UserService.updateUserRole(member.id, newRole);
            if (result.success) {
              loadTeamMembers();
            } else {
              showAlert('Error', result.error || 'Failed to update role');
            }
          }
        }
      ]
    );
  };

  const handleDeleteMember = (member: UserProfile) => {
    showAlert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.name} from the team? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            const result = await UserService.deleteTeamMember(member.id);
            if (result.success) {
              loadTeamMembers();
            } else {
              showAlert('Error', result.error || 'Failed to remove team member');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    // Refresh user profile to get latest role
    refreshProfile();
    loadTeamMembers();
  }, []);

  const renderTeamMember = ({ item }: { item: UserProfile }) => (
    <TeamMemberCard
      member={item}
      isCurrentUser={item.id === userProfile?.id}
      isCurrentUserOwner={userProfile?.role?.toLowerCase() === 'owner'}
      onDelete={handleDeleteMember}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="group" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>Loading Team...</Text>
      <Text style={styles.emptyMessage}>
        Team members will appear here
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Team</Text>
          <Text style={styles.subtitle}>
            {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {(userProfile?.role?.toLowerCase() === 'owner') && (
            <TouchableOpacity 
              style={styles.addTeamButton} 
              onPress={() => setShowAddUserForm(true)}
            >
              <MaterialIcons name="person-add" size={20} color="#fff" />
              <Text style={styles.addTeamText}>Add Member</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.refreshButton} onPress={loadTeamMembers}>
            <MaterialIcons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={async () => {
              showAlert(
                'Logout',
                'Are you sure you want to logout?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Logout', 
                    style: 'destructive',
                    onPress: async () => {
                      await signOut();
                    }
                  }
                ]
              );
            }}
          >
            <MaterialIcons name="logout" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Team Members List */}
      <Text style={styles.sectionTitle}>Team Members</Text>
      
      <FlatList
        data={teamMembers}
        renderItem={renderTeamMember}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadTeamMembers}
            tintColor="#007AFF"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          teamMembers.length === 0 && styles.emptyListContent
        ]}
        style={styles.list}
      />

      {/* Add User Form */}
      <AddUserForm
        visible={showAddUserForm}
        onSuccess={() => {
          setShowAddUserForm(false);
          loadTeamMembers();
        }}
        onCancel={() => setShowAddUserForm(false)}
      />

      {/* Web Alert Modal */}
      {Platform.OS === 'web' && (
        <Modal visible={alertConfig.visible} transparent animationType="fade">
          <View style={styles.alertOverlay}>
            <View style={styles.alertContainer}>
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
              <View style={styles.alertButtons}>
                {alertConfig.buttons?.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.alertButton,
                      button.style === 'destructive' && styles.destructiveButton,
                      button.style === 'cancel' && styles.cancelButton
                    ]}
                    onPress={() => {
                      button.onPress?.();
                      setAlertConfig(prev => ({ ...prev, visible: false }));
                    }}
                  >
                    <Text style={[
                      styles.alertButtonText,
                      button.style === 'destructive' && styles.destructiveButtonText,
                      button.style === 'cancel' && styles.cancelButtonText
                    ]}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addTeamText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  logoutButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  youLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#007AFF',
  },
  memberEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  memberRole: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  memberActions: {
    alignItems: 'flex-end',
  },
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#34C759',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Web Alert Styles
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    minWidth: 280,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 20,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  alertButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  alertButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  destructiveButton: {
    backgroundColor: '#FF3B30',
  },
  destructiveButtonText: {
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  cancelButtonText: {
    color: 'white',
  },
});
