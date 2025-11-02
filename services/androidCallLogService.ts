import { NativeModules, Platform } from 'react-native';

const { CallLogModule } = NativeModules;

interface CallLogInterface {
  requestPermissions(): Promise<boolean>;
  getCallLogs(): Promise<CallLogEntry[]>;
  getContacts(): Promise<DeviceContact[]>;
  isPermissionGranted(permission: string): Promise<boolean>;
}

interface CallLogEntry {
  phoneNumber: string;
  callType: string;
  direction: 'incoming' | 'outgoing';
  timestamp: number;
  duration: number;
  contactName: string;
}

interface DeviceContact {
  name: string;
  phoneNumber: string;
  phoneType: string;
}

export class AndroidCallLogService {
  private static isAndroid = Platform.OS === 'android';

  /**
   * Request required permissions for call log and contacts access
   */
  static async requestPermissions(): Promise<boolean> {
    if (!this.isAndroid) {
      console.log('Call log access is only available on Android');
      return false;
    }

    try {
      const granted = await CallLogModule.requestPermissions();
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Check if a specific permission is granted
   */
  static async isPermissionGranted(permission: string): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      return await CallLogModule.isPermissionGranted(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Get call logs from device
   */
  static async getCallLogs(): Promise<CallLogEntry[]> {
    if (!this.isAndroid) {
      console.log('Call log access is only available on Android');
      return [];
    }

    try {
      const hasPermission = await this.isPermissionGranted('android.permission.READ_CALL_LOG');
      if (!hasPermission) {
        throw new Error('READ_CALL_LOG permission not granted');
      }

      const callLogs = await CallLogModule.getCallLogs();
      return callLogs || [];
    } catch (error) {
      console.error('Error getting call logs:', error);
      throw error;
    }
  }

  /**
   * Get contacts from device
   */
  static async getContacts(): Promise<DeviceContact[]> {
    if (!this.isAndroid) {
      console.log('Contact access is only available on Android');
      return [];
    }

    try {
      const hasPermission = await this.isPermissionGranted('android.permission.READ_CONTACTS');
      if (!hasPermission) {
        throw new Error('READ_CONTACTS permission not granted');
      }

      const contacts = await CallLogModule.getContacts();
      return contacts || [];
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  /**
   * Sync call logs from device to Supabase
   */
  static async syncCallLogs(userId: string): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const deviceCallLogs = await this.getCallLogs();
      
      // Import ContactService dynamically to avoid circular dependencies
      const { ContactService } = await import('./contactService');
      
      for (const callLog of deviceCallLogs) {
        try {
          const startTime = new Date(callLog.timestamp);
          const result = await ContactService.logCall(
            callLog.phoneNumber,
            callLog.direction,
            startTime,
            userId,
            callLog.duration
          );
          
          if (result.success) {
            synced++;
          } else if (result.error) {
            errors.push(`Failed to sync call to ${callLog.phoneNumber}: ${result.error}`);
          }
        } catch (callError) {
          errors.push(`Error syncing call to ${callLog.phoneNumber}: ${callError}`);
        }
      }

      return { success: true, synced, errors };
    } catch (error) {
      return {
        success: false,
        synced: 0,
        errors: [`Sync failed: ${error}`]
      };
    }
  }

  /**
   * Sync contacts from device to Supabase
   */
  static async syncContacts(userId: string): Promise<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  }> {
    try {
      const deviceContacts = await this.getContacts();
      
      // Import ContactService dynamically to avoid circular dependencies
      const { ContactService } = await import('./contactService');
      
      return await ContactService.syncDeviceContacts(deviceContacts, userId);
    } catch (error) {
      return {
        success: false,
        added: 0,
        updated: 0,
        errors: [`Contact sync failed: ${error}`]
      };
    }
  }

  /**
   * Get recent call logs (last 24 hours)
   */
  static async getRecentCallLogs(): Promise<CallLogEntry[]> {
    try {
      const allCallLogs = await this.getCallLogs();
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      return allCallLogs.filter(callLog => callLog.timestamp > oneDayAgo);
    } catch (error) {
      console.error('Error getting recent call logs:', error);
      return [];
    }
  }

  /**
   * Check if all required permissions are granted
   */
  static async hasAllPermissions(): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      const [callLogPermission, contactsPermission, phoneStatePermission] = await Promise.all([
        this.isPermissionGranted('android.permission.READ_CALL_LOG'),
        this.isPermissionGranted('android.permission.READ_CONTACTS'),
        this.isPermissionGranted('android.permission.READ_PHONE_STATE')
      ]);

      return callLogPermission && contactsPermission && phoneStatePermission;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }
}
