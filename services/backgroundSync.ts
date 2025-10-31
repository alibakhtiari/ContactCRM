import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { ContactService } from './contactService';

const BACKGROUND_SYNC_TASK = 'background-contacts-sync';

// Define the background task
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    console.log('Background sync task started');
    
    // Fetch latest contacts and calls
    const [contacts, calls] = await Promise.all([
      ContactService.fetchContacts(),
      ContactService.fetchCalls()
    ]);

    console.log(`Background sync completed: ${contacts.length} contacts, ${calls.length} calls`);
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background sync error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundSyncService {
  static async registerBackgroundSync() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: 15 * 60, // 15 minutes (minimum allowed)
          stopOnTerminate: false, // Continue after app is closed
          startOnBoot: true, // Start after device reboot
        });
        
        console.log('Background sync registered successfully');
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

  static async unregisterBackgroundSync() {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('Background sync unregistered');
      return { success: true };
    } catch (error) {
      console.error('Error unregistering background sync:', error);
      return { success: false, error: String(error) };
    }
  }

  static async checkBackgroundSyncStatus() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      const status = await BackgroundFetch.getStatusAsync();
      
      return {
        isRegistered,
        status,
        statusText: BackgroundSyncService.getStatusText(status)
      };
    } catch (error) {
      console.error('Error checking background sync status:', error);
      return {
        isRegistered: false,
        status: BackgroundFetch.BackgroundFetchStatus.Denied,
        statusText: 'Error checking status'
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
