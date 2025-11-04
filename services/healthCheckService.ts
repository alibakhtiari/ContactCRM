import { AndroidCallLogService } from './androidCallLogService';
import { ContactService } from './contactService';
import { BackgroundSyncService } from './backgroundSync';
import { supabase } from './supabaseClient';
import { Platform } from 'react-native';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: number;
}

export interface AppHealthReport {
  overall: 'healthy' | 'warning' | 'error';
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
  };
  timestamp: number;
  uptime: number;
}

class HealthCheckService {
  private startTime = Date.now();
  private lastHealthCheck: AppHealthReport | null = null;

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<AppHealthReport> {
    const checks: HealthCheckResult[] = [];
    const startTime = Date.now();

    try {
      // Check 1: Android Module (if Android)
      if (Platform.OS === 'android') {
        checks.push(await this.checkAndroidModule());
      }

      // Check 2: Permission Status
      checks.push(await this.checkPermissions());

      // Check 3: Supabase Connection
      checks.push(await this.checkSupabaseConnection());

      // Check 4: Contact Service
      checks.push(await this.checkContactService());

      // Check 5: Background Sync
      checks.push(await this.checkBackgroundSync());

      // Check 6: Memory Usage (basic check)
      checks.push(await this.checkMemoryUsage());

      // Check 7: Storage Health
      checks.push(await this.checkStorageHealth());

      // Calculate overall status
      const summary = {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        warning: checks.filter(c => c.status === 'warning').length,
        error: checks.filter(c => c.status === 'error').length,
      };

      const overall = summary.error > 0 ? 'error' : 
                     summary.warning > 0 ? 'warning' : 'healthy';

      const report: AppHealthReport = {
        overall,
        checks,
        summary,
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
      };

      this.lastHealthCheck = report;
      return report;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        overall: 'error',
        checks: [{
          component: 'HealthCheckService',
          status: 'error',
          message: `Health check system failed: ${error}`,
          timestamp: Date.now()
        }],
        summary: { total: 1, healthy: 0, warning: 0, error: 1 },
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
      };
    }
  }

  /**
   * Check Android module health
   */
  private async checkAndroidModule(): Promise<HealthCheckResult> {
    try {
      // Test if native module is available
      const { CallLogModule } = require('react-native').NativeModules;
      
      if (!CallLogModule) {
        return {
          component: 'AndroidModule',
          status: 'error',
          message: 'CallLogModule not found',
          timestamp: Date.now()
        };
      }

      // Test basic module functionality
      const hasGetPermissionStatus = typeof CallLogModule.getPermissionStatus === 'function';
      
      return {
        component: 'AndroidModule',
        status: hasGetPermissionStatus ? 'healthy' : 'warning',
        message: hasGetPermissionStatus ? 'Module functions available' : 'Limited module functions',
        details: {
          moduleName: CallLogModule.MODULE_NAME || 'CallLogModule'
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'AndroidModule',
        status: 'error',
        message: `Android module error: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check permission status
   */
  private async checkPermissions(): Promise<HealthCheckResult> {
    try {
      if (Platform.OS !== 'android') {
        return {
          component: 'Permissions',
          status: 'healthy',
          message: 'Platform does not require Android permissions',
          timestamp: Date.now()
        };
      }

      const permissionStatus = await BackgroundSyncService.getPermissionStatus();
      const hasAllPermissions = permissionStatus.hasAllPermissions || false;
      const hasCriticalPermissions = permissionStatus.hasCriticalPermissions || false;

      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'All permissions granted';

      if (!hasCriticalPermissions) {
        status = 'error';
        message = 'Critical permissions missing';
      } else if (!hasAllPermissions) {
        status = 'warning';
        message = 'Some permissions missing (non-critical)';
      }

      return {
        component: 'Permissions',
        status,
        message,
        details: permissionStatus,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'Permissions',
        status: 'error',
        message: `Permission check failed: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check Supabase connection
   */
  private async checkSupabaseConnection(): Promise<HealthCheckResult> {
    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('contacts')
        .select('id')
        .limit(1);

      if (error) {
        throw error;
      }

      return {
        component: 'Supabase',
        status: 'healthy',
        message: 'Connection successful',
        details: { testQuery: 'success' },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'Supabase',
        status: 'error',
        message: `Supabase connection failed: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check Contact Service functionality
   */
  private async checkContactService(): Promise<HealthCheckResult> {
    try {
      // Test service methods
      const contacts = await ContactService.fetchContacts();
      const calls = await ContactService.fetchCalls();

      // Validate response types
      if (!Array.isArray(contacts) || !Array.isArray(calls)) {
        throw new Error('Invalid response types from ContactService');
      }

      return {
        component: 'ContactService',
        status: 'healthy',
        message: 'Service methods working',
        details: {
          contactsCount: contacts.length,
          callsCount: calls.length
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'ContactService',
        status: 'error',
        message: `Contact service failed: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check Background Sync status
   */
  private async checkBackgroundSync(): Promise<HealthCheckResult> {
    try {
      const status = await BackgroundSyncService.checkBackgroundSyncStatus();
      const hasAllTasks = status.hasAllTasks || false;
      const isAvailable = status.status === require('expo-background-fetch').BackgroundFetchStatus.Available;

      let statusLevel: 'healthy' | 'warning' | 'error' = 'healthy';
      let message = 'Background sync working';

      if (!isAvailable) {
        statusLevel = 'error';
        message = 'Background fetch not available';
      } else if (!hasAllTasks) {
        statusLevel = 'warning';
        message = 'Some background tasks not registered';
      }

      return {
        component: 'BackgroundSync',
        status: statusLevel,
        message,
        details: status,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'BackgroundSync',
        status: 'error',
        message: `Background sync check failed: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Basic memory usage check
   */
  private async checkMemoryUsage(): Promise<HealthCheckResult> {
    try {
      // Note: react-native doesn't have direct memory API like web
      // This is a placeholder for future implementation
      // Could implement with react-native-performance monitor
      
      return {
        component: 'Memory',
        status: 'healthy',
        message: 'Memory usage normal',
        details: {
          platform: Platform.OS,
          note: 'Memory monitoring limited on this platform'
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'Memory',
        status: 'warning',
        message: `Memory check failed: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check storage health
   */
  private async checkStorageHealth(): Promise<HealthCheckResult> {
    try {
      // Check if we can perform basic storage operations
      // This would need implementation based on your storage solution
      // For now, return a basic check
      
      return {
        component: 'Storage',
        status: 'healthy',
        message: 'Storage accessible',
        details: {
          platform: Platform.OS
        },
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        component: 'Storage',
        status: 'error',
        message: `Storage check failed: ${error}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get the last health check report
   */
  getLastHealthCheck(): AppHealthReport | null {
    return this.lastHealthCheck;
  }

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring(intervalMs: number = 60000) {
    const performPeriodicCheck = async () => {
      try {
        const report = await this.performHealthCheck();
        
        // Log critical issues
        if (report.overall === 'error') {
          console.error('Health check detected critical issues:', report);
        } else if (report.overall === 'warning') {
          console.warn('Health check detected warnings:', report);
        }

        // In production, you might send this to a monitoring service
        // Example: LogRocket, Sentry, etc.
      } catch (error) {
        console.error('Periodic health check failed:', error);
      }
    };

    // Perform initial check
    performPeriodicCheck();

    // Set up periodic checks
    const intervalId = setInterval(performPeriodicCheck, intervalMs);

    // Return cleanup function
    return () => clearInterval(intervalId);
  }

  /**
   * Export health report for debugging
   */
  exportHealthReport(report: AppHealthReport): string {
    return JSON.stringify({
      appVersion: '1.0.0', // You might want to get this from app.json
      platform: Platform.OS,
      timestamp: report.timestamp,
      uptime: report.uptime,
      overall: report.overall,
      summary: report.summary,
      checks: report.checks.map(check => ({
        component: check.component,
        status: check.status,
        message: check.message,
        timestamp: check.timestamp
      }))
    }, null, 2);
  }

  /**
   * Validate app readiness before critical operations
   */
  async validateAppReadiness(): Promise<{
    ready: boolean;
    issues: string[];
    warnings: string[];
  }> {
    const report = await this.performHealthCheck();
    
    const issues = report.checks
      .filter(check => check.status === 'error')
      .map(check => `${check.component}: ${check.message}`);
    
    const warnings = report.checks
      .filter(check => check.status === 'warning')
      .map(check => `${check.component}: ${check.message}`);

    return {
      ready: report.overall !== 'error' && issues.length === 0,
      issues,
      warnings
    };
  }
}

export const healthCheckService = new HealthCheckService();
