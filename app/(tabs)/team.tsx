import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabaseClient';
import { UserProfile } from '../../constants/types';

interface TeamMemberCardProps {
  member: UserProfile;
  isCurrentUser: boolean;
}

function TeamMemberCard({ member, isCurrentUser }: TeamMemberCardProps) {
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

      <View style={styles.memberStats}>
        <MaterialIcons name="fiber-manual-record" size={8} color="#34C759" />
        <Text style={styles.statusText}>Active</Text>
      </View>
    </View>
  );
}

export default function TeamScreen() {
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const { userProfile, organization } = useAuth();

  const loadTeamMembers = async () => {
    if (!organization?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('org_id', organization.id)
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

  useEffect(() => {
    loadTeamMembers();
  }, [organization?.id]);

  const renderTeamMember = ({ item }: { item: UserProfile }) => (
    <TeamMemberCard
      member={item}
      isCurrentUser={item.id === userProfile?.id}
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
            {organization?.name} • {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadTeamMembers}>
          <MaterialIcons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Organization Info */}
      {organization && (
        <View style={styles.orgCard}>
          <MaterialIcons name="business" size={24} color="#007AFF" />
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{organization.name}</Text>
            <Text style={styles.orgCreated}>
              Created {new Date(organization.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      )}

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
  refreshButton: {
    padding: 8,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 20,
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
  orgInfo: {
    marginLeft: 12,
    flex: 1,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  orgCreated: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
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
  memberStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#34C759',
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
});