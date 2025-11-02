import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { ContactService } from './contactService';
import { AndroidCallLogService } from './androidCallLogService';
import { Platform } from 'react-native';

const BACKGROUND_SYNC_TASK = 'background-contacts-sync';
const DEVICE_SYNC_TASK = 'device-data-sync';

// Define the background task for server sync
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('Background server sync task started');
    
    // Fetch latest contacts and calls from server
    const [contacts, calls] = await Promise.all([
      ContactService.fetchContacts(),
      ContactService.fetchCalls()
    ]);

    console.log(`Background server sync completed: ${contacts.length} contacts, ${calls.length} calls`);
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background server sync error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Define the background task for device sync
TaskManager.defineTask(DEVICE_SYNC_TASK, async () => {
  try {
    console.log('Background device sync task started');
    
    // This will be implemented when we have user context
    // For now, just return success to keep the task registered
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background device sync error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundSyncService {
  /**
   * Register background sync for server data
   */
  static async registerBackgroundSync() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: 15 * 60, // 15 minutes (minimum allowed)
          stopOnTerminate: false, // Continue after app is closed
          startOnBoot: true, // Start after device reboot
        });
        
        console.log('Background server sync registered successfully');
        return { success: true };
      } else {
        console.log('Background fetch not available:', status);
        return { 
          success: false, 
          error: 'Background sync not available on this device' 
        };
      }
    } catch (error) {
      console.error('Error registering background sync:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Register device data sync (call logs and contacts)
   */
  static async registerDeviceDataSync() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await BackgroundFetch.registerTaskAsync(DEVICE_SYNC_TASK, {
          minimumInterval: 30 * 60, // 30 minutes for device sync
          stopOnTerminate: false,
          startOnBoot: true,
        });
        
        console.log('Background device data sync registered successfully');
        return { success: true };
      } else {
        console.log('Background fetch not available for device sync:', status);
        return { 
          success: false, 
          error: 'Background sync not available on this device' 
        };
      }
    } catch (error) {
      console.error('Error registering device data sync:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Sync call logs from device to Supabase
   */
  static async syncCallLogsFromDevice(userId: string): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> {
    try {
      console.log('Starting call log sync from device');
      
      // Check if we have required permissions
      const hasPermissions = await AndroidCallLogService.hasAllPermissions();
      if (!hasPermissions) {
        throw new Error('Required permissions not granted for call log access');
      }

      // Sync call logs
      const syncResult = await AndroidCallLogService.syncCallLogs(userId);
      
      console.log(`Call log sync completed: ${syncResult.synced} calls synced`);
      
      return syncResult;
    } catch (error) {
      console.error('Error syncing call logs from device:', error);
      return {
        success: false,
        synced: 0,
        errors: [`Call log sync failed: ${error}`]
      };
    }
  }

  /**
   * Sync contacts from device to Supabase
   */
  static async syncContactsFromDevice(userId: string): Promise<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  }> {
    try {
      console.log('Starting contact sync from device');
      
      // Check if we have required permissions
      const hasPermissions = await AndroidCallLogService.hasAllPermissions();
      if (!hasPermissions) {
        throw new Error('Required permissions not granted for contacts access');
      }

      // Sync contacts
      const syncResult = await AndroidCallLogService.syncContacts(userId);
      
      console.log(`Contact sync completed: ${syncResult.added} added, ${syncResult.updated} updated`);
      
      return syncResult;
    } catch (error) {
      console.error('Error syncing contacts from device:', error);
      return {
        success: false,
        added: 0,
        updated: 0,
        errors: [`Contact sync failed: ${error}`]
      };
    }
  }

  /**
   * Perform complete device data sync (contacts + call logs)
   */
  static async syncAllDeviceData(userId: string): Promise<{
    success: boolean;
    contacts: { added: number; updated: number; errors: string[] };
    calls: { synced: number; errors: string[] };
    overallSuccess: boolean;
    errors: string[];
  }> {
    console.log('Starting complete device data sync');
    
    const results = {
      success: true,
      contacts: { added: 0, updated: 0, errors: [] as string[] },
      calls: { synced: 0, errors: [] as string[] },
      overallSuccess: true,
      errors: [] as string[]
    };

    try {
      // Sync contacts first
      const contactResult = await this.syncContactsFromDevice(userId);
      results.contacts = {
        added: contactResult.added,
        updated: contactResult.updated,
        errors: contactResult.errors
      };
      if (!contactResult.success) {
        results.overallSuccess = false;
        results.errors.push(...contactResult.errors);
      }

      // Sync call logs
      const callResult = await this.syncCallLogsFromDevice(userId);
      results.calls = {
        synced: callResult.synced,
        errors: callResult.errors
      };
      if (!callResult.success) {
        results.overallSuccess = false;
        results.errors.push(...callResult.errors);
      }

      results.success = results.overallSuccess;
      console.log('Complete device sync finished:', results);
      return results;
    } catch (error) {
      console.error('Error during complete device sync:', error);
      results.overallSuccess = false;
      results.success = false;
      results.errors.push(`Complete sync failed: ${error}`);
      return results;
    }
  }

  /**
   * Unregister background sync
   */
  static async unregisterBackgroundSync() {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      await BackgroundFetch.unregisterTaskAsync(DEVICE_SYNC_TASK);
      console.log('Background sync unregistered');
      return { success: true };
    } catch (error) {
      console.error('Error unregistering background sync:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Check background sync status
   */
  static async checkBackgroundSyncStatus() {
    try {
      const serverTaskRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      const deviceTaskRegistered = await TaskManager.isTaskRegisteredAsync(DEVICE_SYNC_TASK);
      const status = await BackgroundFetch.getStatusAsync();
      
      return {
        serverTaskRegistered,
        deviceTaskRegistered,
        status,
        statusText: this.getStatusText(status),
        hasAllTasks: serverTaskRegistered && deviceTaskRegistered
      };
    } catch (error) {
      console.error('Error checking background sync status:', error);
      return {
        serverTaskRegistered: false,
        deviceTaskRegistered: false,
        status: BackgroundFetch.BackgroundFetchStatus.Denied,
        statusText: 'Error checking status',
        hasAllTasks: false
      };
    }
  }

  /**
   * Get permission status for device features
   */
  static async getPermissionStatus() {
    const isAndroid = Platform.OS === 'android';
    if (!isAndroid) {
      return {
        callLogPermission: false,
        contactsPermission: false,
        phoneStatePermission: false,
        hasAllPermissions: false,
        isAndroid: false
      };
    }

    try {
      const [callLogPermission, contactsPermission, phoneStatePermission] = await Promise.all([
        AndroidCallLogService.isPermissionGranted('android.permission.READ_CALL_LOG'),
        AndroidCallLogService.isPermissionGranted('android.permission.READ_CONTACTS'),
        AndroidCallLogService.isPermissionGranted('android.permission.READ_PHONE_STATE')
      ]);

      const hasAllPermissions = callLogPermission && contactsPermission && phoneStatePermission;

      return {
        callLogPermission,
        contactsPermission,
        phoneStatePermission,
        hasAllPermissions,
        isAndroid: true
      };
    } catch (error) {
      console.error('Error checking permission status:', error);
      return {
        callLogPermission: false,
        contactsPermission: false,
        phoneStatePermission: false,
        hasAllPermissions: false,
        isAndroid: true,
        error: String(error)
      };
    }
  }

  private static getStatusText(status: BackgroundFetch.BackgroundFetchStatus): string {
    switch (status) {
      case BackgroundFetch.BackgroundFetchStatus.Available:
        return 'Available';
      case BackgroundFetch.BackgroundFetchStatus.Denied:
        return 'Denied - Check app permissions';
      case BackgroundFetch.BackgroundFetchStatus.Restricted:
        return 'Restricted by system';
      default:
        return 'Unknown';
    }
  }
}
