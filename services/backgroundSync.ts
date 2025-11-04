import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { ContactService } from './contactService';
import { AndroidCallLogService } from './androidCallLogService';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKGROUND_SYNC_TASK = 'background-contacts-sync';
const DEVICE_SYNC_TASK = 'device-data-sync';
const USER_ID_KEY = 'auth-user-id';

// Track sync status to prevent multiple concurrent syncs
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_COOLDOWN = 60000; // 1 minute cooldown between syncs

// Task registration status tracking
let isTaskRegistered = false;

// Enhanced error logging
const logError = (context: string, error: any) => {
  console.error(`[BackgroundSyncService] ${context}:`, error);
};

// Enhanced success logging
const logSuccess = (context: string, data: any) => {
  console.log(`[BackgroundSyncService] ${context}:`, data);
};

// Define the background task for server sync with enhanced error handling
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    logSuccess('Background server sync task started', {});
    
    // Add cooldown check
    const now = Date.now();
    if (now - lastSyncTime < SYNC_COOLDOWN) {
      logSuccess('Skipping sync due to cooldown', { 
        lastSync: lastSyncTime, 
        timeUntilNextSync: SYNC_COOLDOWN - (now - lastSyncTime)
      });
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check if already syncing
    if (isSyncing) {
      logSuccess('Skipping sync - already in progress', {});
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    isSyncing = true;
    lastSyncTime = now;

    try {
      // Fetch latest contacts and calls from server with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Server sync timeout')), 30000); // 30 second timeout
      });

      const syncPromise = Promise.all([
        ContactService.fetchContacts(),
        ContactService.fetchCalls()
      ]);

      const [contacts, calls] = await Promise.race([syncPromise, timeoutPromise]);
      
      logSuccess('Background server sync completed', { 
        contacts: contacts?.length || 0, 
        calls: calls?.length || 0 
      });
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } finally {
      isSyncing = false;
    }
  } catch (error) {
    logError('Background server sync error', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Define the background task for device sync with enhanced error handling
TaskManager.defineTask(DEVICE_SYNC_TASK, async () => {
  try {
    logSuccess('Background device sync task started', {});
    
    // Add cooldown check
    const now = Date.now();
    if (now - lastSyncTime < SYNC_COOLDOWN) {
      logSuccess('Skipping device sync due to cooldown', { 
        lastSync: lastSyncTime, 
        timeUntilNextSync: SYNC_COOLDOWN - (now - lastSyncTime)
      });
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check if already syncing
    if (isSyncing) {
      logSuccess('Skipping device sync - already in progress', {});
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    isSyncing = true;
    lastSyncTime = now;

    try {
      // 1. Get user ID from storage with timeout
      const userIdPromise = AsyncStorage.getItem(USER_ID_KEY);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('User ID fetch timeout')), 10000);
      });

      const userId = await Promise.race([userIdPromise, timeoutPromise]);
      
      if (!userId) {
        logSuccess('Background device sync: No user ID found, skipping', {});
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      logSuccess('Background device sync: Running for user', { userId });

      // 2. Run the sync function with timeout
      const syncPromise = BackgroundSyncService.syncAllDeviceData(userId);
      const syncTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Device sync timeout')), 45000); // 45 second timeout
      });

      const result = await Promise.race([syncPromise, syncTimeoutPromise]);

      if (result.success) {
        logSuccess('Background device sync completed successfully', result);
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } else {
        logError('Background device sync failed', result.errors);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }

    } finally {
      isSyncing = false;
    }

  } catch (error) {
    logError('Background device sync error', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundSyncService {
  /**
   * Register background sync for server data with enhanced error handling
   */
  static async registerBackgroundSync() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        // Check if task is already registered
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
        if (isRegistered) {
          logSuccess('Background server sync task already registered', {});
          return { success: true };
        }

        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: 15 * 60, // 15 minutes (minimum allowed)
          stopOnTerminate: false, // Continue after app is closed
          startOnBoot: true, // Start after device reboot
        });
        
        isTaskRegistered = true;
        logSuccess('Background server sync registered successfully', {});
        return { success: true };
      } else {
        const statusText = this.getStatusText(status);
        logError('Background fetch not available', { status, statusText });
        return { 
          success: false, 
          error: `Background sync not available: ${statusText}` 
        };
      }
    } catch (error) {
      logError('Error registering background sync', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Register device data sync with enhanced error handling
   */
  static async registerDeviceDataSync() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        // Check if task is already registered
        const isRegistered = await TaskManager.isTaskRegisteredAsync(DEVICE_SYNC_TASK);
        if (isRegistered) {
          logSuccess('Background device data sync task already registered', {});
          return { success: true };
        }

        await BackgroundFetch.registerTaskAsync(DEVICE_SYNC_TASK, {
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
        
        isTaskRegistered = true;
        logSuccess('Background device data sync registered successfully', {});
        return { success: true };
      } else {
        const statusText = this.getStatusText(status);
        logError('Background fetch not available for device sync', { status, statusText });
        return { 
          success: false, 
          error: `Background sync not available: ${statusText}` 
        };
      }
    } catch (error) {
      logError('Error registering device data sync', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Enhanced sync call logs from device with timeout and error handling
   */
  static async syncCallLogsFromDevice(userId: string): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> {
    try {
      logSuccess('Starting call log sync from device', { userId });
      
      // Check permissions first
      const hasPermissions = await AndroidCallLogService.hasCriticalPermissions();
      if (!hasPermissions) {
        const errorMsg = 'Required permissions not granted for call log access';
        logError('Call log sync permissions check failed', errorMsg);
        return {
          success: false,
          synced: 0,
          errors: [errorMsg]
        };
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Call log sync timeout')), 30000);
      });

      const syncPromise = AndroidCallLogService.syncCallLogs(userId);
      
      const syncResult = await Promise.race([syncPromise, timeoutPromise]);
      
      logSuccess('Call log sync completed', { 
        synced: syncResult.synced,
        success: syncResult.success 
      });
      
      return syncResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logError('Error syncing call logs from device', errorMsg);
      return {
        success: false,
        synced: 0,
        errors: [`Call log sync failed: ${errorMsg}`]
      };
    }
  }

  /**
   * Enhanced sync contacts from device with timeout and error handling
   */
  static async syncContactsFromDevice(userId: string): Promise<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  }> {
    try {
      logSuccess('Starting contact sync from device', { userId });
      
      // Check permissions first
      const hasPermissions = await AndroidCallLogService.hasCriticalPermissions();
      if (!hasPermissions) {
        const errorMsg = 'Required permissions not granted for contacts access';
        logError('Contact sync permissions check failed', errorMsg);
        return {
          success: false,
          added: 0,
          updated: 0,
          errors: [errorMsg]
        };
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Contact sync timeout')), 30000);
      });

      const syncPromise = AndroidCallLogService.syncContacts(userId);
      
      const syncResult = await Promise.race([syncPromise, timeoutPromise]);
      
      logSuccess('Contact sync completed', { 
        added: syncResult.added,
        updated: syncResult.updated,
        success: syncResult.success 
      });
      
      return syncResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logError('Error syncing contacts from device', errorMsg);
      return {
        success: false,
        added: 0,
        updated: 0,
        errors: [`Contact sync failed: ${errorMsg}`]
      };
    }
  }

  /**
   * Enhanced sync contacts from server to device with timeout and error handling
   */
  static async syncContactsToDevice(userId: string): Promise<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  }> {
    try {
      logSuccess('Starting server-to-device contact sync', { userId });
      
      // Import ContactService dynamically to avoid circular dependencies
      const { ContactService } = await import('./contactService');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Server-to-device sync timeout')), 20000);
      });

      const syncPromise = ContactService.syncServerContactsToDevice(userId);
      
      const syncResult = await Promise.race([syncPromise, timeoutPromise]);
      
      logSuccess('Server-to-device contact sync completed', { 
        added: syncResult.added,
        updated: syncResult.updated,
        success: syncResult.success 
      });
      
      return syncResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logError('Error syncing contacts to device', errorMsg);
      return {
        success: false,
        added: 0,
        updated: 0,
        errors: [`Server-to-device contact sync failed: ${errorMsg}`]
      };
    }
  }

  /**
   * Enhanced complete device data sync with better error handling and queuing
   */
  static async syncAllDeviceData(userId: string): Promise<{
    success: boolean;
    contacts: { added: number; updated: number; errors: string[] };
    calls: { synced: number; errors: string[] };
    overallSuccess: boolean;
    errors: string[];
  }> {
    logSuccess('Starting complete device data sync', { userId });
    
    // Prevent concurrent sync operations
    if (isSyncing) {
      logSuccess('Sync already in progress, skipping', { userId });
      return {
        success: true,
        contacts: { added: 0, updated: 0, errors: [] },
        calls: { synced: 0, errors: [] },
        overallSuccess: true,
        errors: ['Sync already in progress']
      };
    }

    const results = {
      success: true,
      contacts: { added: 0, updated: 0, errors: [] as string[] },
      calls: { synced: 0, errors: [] as string[] },
      overallSuccess: true,
      errors: [] as string[]
    };

    isSyncing = true;
    lastSyncTime = Date.now();

    try {
      // Step 1: Sync contacts FROM device TO server
      const deviceToServerResult = await this.syncContactsFromDevice(userId);
      results.contacts = {
        added: deviceToServerResult.added,
        updated: deviceToServerResult.updated,
        errors: deviceToServerResult.errors
      };
      if (!deviceToServerResult.success) {
        results.overallSuccess = false;
        results.errors.push(...deviceToServerResult.errors);
      }

      // Step 2: Sync contacts FROM server TO device (two-way sync)
      const serverToDeviceResult = await this.syncContactsToDevice(userId);
      results.contacts.added += serverToDeviceResult.added;
      results.contacts.updated += serverToDeviceResult.updated;
      results.contacts.errors.push(...serverToDeviceResult.errors);
      if (!serverToDeviceResult.success) {
        results.overallSuccess = false;
        results.errors.push(...serverToDeviceResult.errors);
      }

      // Step 3: Sync call logs from device to server
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
      logSuccess('Complete device sync finished', results);
      return results;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logError('Error during complete device sync', errorMsg);
      results.overallSuccess = false;
      results.success = false;
      results.errors.push(`Complete sync failed: ${errorMsg}`);
      return results;
    } finally {
      isSyncing = false;
    }
  }

  /**
   * Enhanced unregister with error handling
   */
  static async unregisterBackgroundSync() {
    try {
      const tasks = [BACKGROUND_SYNC_TASK, DEVICE_SYNC_TASK];
      
      for (const task of tasks) {
        try {
          await BackgroundFetch.unregisterTaskAsync(task);
          logSuccess('Unregistered background sync task', { task });
        } catch (error) {
          logError(`Error unregistering task ${task}`, error);
        }
      }
      
      isTaskRegistered = false;
      return { success: true };
    } catch (error) {
      logError('Error unregistering background sync', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Enhanced background sync status check
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
        hasAllTasks: serverTaskRegistered && deviceTaskRegistered,
        isCurrentlySyncing: isSyncing,
        lastSyncTime
      };
    } catch (error) {
      logError('Error checking background sync status', error);
      return {
        serverTaskRegistered: false,
        deviceTaskRegistered: false,
        status: BackgroundFetch.BackgroundFetchStatus.Denied,
        statusText: 'Error checking status',
        hasAllTasks: false,
        isCurrentlySyncing: false,
        lastSyncTime: 0
      };
    }
  }

  /**
   * Enhanced permission status checking with timeout
   */
  static async getPermissionStatus() {
    const isAndroid = Platform.OS === 'android';
    if (!isAndroid) {
      return {
        callLogPermission: false,
        contactsPermission: false,
        phoneStatePermission: false,
        hasAllPermissions: false,
        hasCriticalPermissions: false,
        isAndroid: false
      };
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          logError('Permission status check timed out', {});
          resolve({
            callLogPermission: false,
            contactsPermission: false,
            phoneStatePermission: false,
            hasAllPermissions: false,
            hasCriticalPermissions: false,
            isAndroid: true,
            timeout: true
          });
        }, 10000);
      });

      const permissionPromise = (async () => {
        const [callLogPermission, contactsPermission, phoneStatePermission] = await Promise.all([
          AndroidCallLogService.isPermissionGranted('android.permission.READ_CALL_LOG'),
          AndroidCallLogService.isPermissionGranted('android.permission.READ_CONTACTS'),
          AndroidCallLogService.isPermissionGranted('android.permission.READ_PHONE_STATE')
        ]);

        const hasAllPermissions = callLogPermission && contactsPermission && phoneStatePermission;
        const hasCriticalPermissions = callLogPermission && contactsPermission;

        return {
          callLogPermission,
          contactsPermission,
          phoneStatePermission,
          hasAllPermissions,
          hasCriticalPermissions,
          isAndroid: true
        };
      })();

      return await Promise.race([permissionPromise, timeoutPromise]);
    } catch (error) {
      logError('Error checking permission status', error);
      return {
        callLogPermission: false,
        contactsPermission: false,
        phoneStatePermission: false,
        hasAllPermissions: false,
        hasCriticalPermissions: false,
        isAndroid: true,
        error: String(error)
      };
    }
  }

  private static getStatusText(status: BackgroundFetch.BackgroundFetchStatus | null): string {
    if (status === null) {
      return 'Unknown';
    }
    
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
