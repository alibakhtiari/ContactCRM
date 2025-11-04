import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { healthCheckService, AppHealthReport } from '../services/healthCheckService';
import { BackgroundSyncService } from '../services/backgroundSync';
import { AndroidCallLogService } from '../services/androidCallLogService';

interface DiagnosticToolProps {
  onClose?: () => void;
}

export default function DiagnosticTool({ onClose }: DiagnosticToolProps) {
  const [healthReport, setHealthReport] = useState<AppHealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState<{[key: string]: boolean}>({});

  const runFullDiagnostics = async () => {
    setLoading(true);
    try {
      const report = await healthCheckService.performHealthCheck();
      setHealthReport(report);
    } catch (error) {
      Alert.alert('Diagnostic Error', `Failed to run diagnostics: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const hasPermissions = await AndroidCallLogService.hasAllPermissions();
        const hasCriticalPermissions = await AndroidCallLogService.hasCriticalPermissions();
        
        Alert.alert(
          'Permission Status',
          `All Permissions: ${hasPermissions ? 'Granted' : 'Missing'}\nCritical Permissions: ${hasCriticalPermissions ? 'Granted' : 'Missing'}`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Permission Check', 'Permissions check is only available on Android');
      }
    } catch (error) {
      Alert.alert('Permission Check Error', `Failed to check permissions: ${error}`);
    }
  };

  const checkBackgroundSync = async () => {
    try {
      const status = await BackgroundSyncService.checkBackgroundSyncStatus();
      Alert.alert(
        'Background Sync Status',
        `Server Task: ${status.serverTaskRegistered ? 'Registered' : 'Not Registered'}\nDevice Task: ${status.deviceTaskRegistered ? 'Registered' : 'Not Registered'}\nStatus: ${status.statusText}\nCurrently Syncing: ${status.isCurrentlySyncing ? 'Yes' : 'No'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Background Sync Error', `Failed to check background sync: ${error}`);
    }
  };

  const exportDiagnostics = () => {
    if (!healthReport) {
      Alert.alert('Export Error', 'No health report available to export');
      return;
    }

    const exportData = healthCheckService.exportHealthReport(healthReport);
    
    Alert.alert(
      'Export Diagnostics',
      `Diagnostics exported:\n\n${exportData.substring(0, 200)}...\n\nYou can copy this text for debugging purposes.`,
      [
        { text: 'Copy to Clipboard', onPress: () => console.log('Copy to clipboard: ' + exportData) },
        { text: 'OK' }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#34C759';
      case 'warning': return '#FF9500';
      case 'error': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return 'check-circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'help';
    }
  };

  const toggleExpansion = (component: string) => {
    setIsExpanded(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };

  useEffect(() => {
    runFullDiagnostics();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Diagnostic Tool</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={runFullDiagnostics}
          disabled={loading}
        >
          <MaterialIcons name="refresh" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {loading ? 'Running...' : 'Run Diagnostics'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={checkPermissions}>
          <MaterialIcons name="security" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Check Permissions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={checkBackgroundSync}>
          <MaterialIcons name="sync" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Check Sync</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={exportDiagnostics}>
          <MaterialIcons name="file-download" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Health Report */}
      {healthReport && (
        <ScrollView style={styles.reportContainer}>
          <View style={styles.overallStatus}>
            <View style={styles.statusHeader}>
              <MaterialIcons 
                name={getStatusIcon(healthReport.overall)} 
                size={32} 
                color={getStatusColor(healthReport.overall)} 
              />
              <Text style={styles.overallTitle}>
                Overall Status: {healthReport.overall.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.summary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Checks:</Text>
                <Text style={styles.summaryValue}>{healthReport.summary.total}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Healthy:</Text>
                <Text style={[styles.summaryValue, { color: '#34C759' }]}>
                  {healthReport.summary.healthy}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Warnings:</Text>
                <Text style={[styles.summaryValue, { color: '#FF9500' }]}>
                  {healthReport.summary.warning}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Errors:</Text>
                <Text style={[styles.summaryValue, { color: '#FF3B30' }]}>
                  {healthReport.summary.error}
                </Text>
              </View>
            </View>

            <View style={styles.uptime}>
              <Text style={styles.uptimeText}>
                App Uptime: {Math.round(healthReport.uptime / 1000 / 60)} minutes
              </Text>
              <Text style={styles.timestampText}>
                Last Check: {new Date(healthReport.timestamp).toLocaleTimeString()}
              </Text>
            </View>
          </View>

          {/* Individual Checks */}
          <View style={styles.checksContainer}>
            <Text style={styles.checksTitle}>Component Checks</Text>
            
            {healthReport.checks.map((check, index) => (
              <View key={index} style={styles.checkItem}>
                <TouchableOpacity 
                  style={styles.checkHeader} 
                  onPress={() => toggleExpansion(check.component)}
                >
                  <MaterialIcons 
                    name={getStatusIcon(check.status)} 
                    size={20} 
                    color={getStatusColor(check.status)} 
                  />
                  <Text style={styles.checkComponent}>{check.component}</Text>
                  <Text style={[styles.checkStatus, { color: getStatusColor(check.status) }]}>
                    {check.status}
                  </Text>
                  <MaterialIcons 
                    name={isExpanded[check.component] ? 'expand-less' : 'expand-more'} 
                    size={20} 
                    color="#8E8E93" 
                  />
                </TouchableOpacity>

                {isExpanded[check.component] && (
                  <View style={styles.checkDetails}>
                    <Text style={styles.checkMessage}>{check.message}</Text>
                    {check.details && (
                      <Text style={styles.checkDetailsText}>
                        {JSON.stringify(check.details, null, 2)}
                      </Text>
                    )}
                    <Text style={styles.checkTimestamp}>
                      {new Date(check.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
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
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reportContainer: {
    flex: 1,
    padding: 16,
  },
  overallStatus: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  uptime: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 12,
    gap: 4,
  },
  uptimeText: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  timestampText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  checksContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  checksTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  checkItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 12,
    paddingBottom: 12,
  },
  checkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkComponent: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  checkStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  checkDetails: {
    marginTop: 12,
    paddingLeft: 32,
    gap: 8,
  },
  checkMessage: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
  },
  checkDetailsText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'monospace',
    backgroundColor: '#F8F8F8',
    padding: 8,
    borderRadius: 4,
  },
  checkTimestamp: {
    fontSize: 10,
    color: '#C7C7CC',
  },
});
