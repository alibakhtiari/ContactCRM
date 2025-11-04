import { NativeModules, Platform } from 'react-native';

const { CallLogModule } = NativeModules;

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

interface PermissionStatus {
  [key: string]: boolean;
}

export class AndroidCallLogService {
  private static isAndroid = Platform.OS === 'android';
  private static isRequestingPermissions = false;
  private static requestPromise: Promise<boolean> | null = null;

  /**
   * Enhanced permission request with timeout and queue management
   */
  static async requestPermissions(): Promise<boolean> {
    if (!this.isAndroid) {
      console.log('Call log access is only available on Android');
      return false;
    }

    // Prevent multiple concurrent requests
    if (this.isRequestingPermissions && this.requestPromise) {
      return this.requestPromise;
    }

    this.isRequestingPermissions = true;
    
    this.requestPromise = new Promise(async (resolve) => {
      try {
        console.log('Requesting Android permissions...');
        
        // Set a timeout for permission request (10 seconds)
        const timeoutPromise = new Promise<boolean>((timeoutResolve) => {
          setTimeout(() => {
            console.warn('Permission request timed out');
            timeoutResolve(false);
          }, 10000);
        });

        // Race between permission request and timeout
        const permissionPromise = new Promise<boolean>((permissionResolve) => {
          try {
            CallLogModule.requestPermissions()
              .then((granted: boolean) => {
                console.log('Permission request completed:', granted);
                permissionResolve(granted);
              })
              .catch((error: any) => {
                console.error('Permission request failed:', error);
                permissionResolve(false);
              });
          } catch (error) {
            console.error('Error initiating permission request:', error);
            permissionResolve(false);
          }
        });

        const result = await Promise.race([permissionPromise, timeoutPromise]);
        resolve(result);
      } catch (error) {
        console.error('Error in permission request flow:', error);
        resolve(false);
      } finally {
        this.isRequestingPermissions = false;
        this.requestPromise = null;
      }
    });

    return this.requestPromise;
  }

  /**
   * Enhanced permission checking with caching and fallbacks
   */
  static async isPermissionGranted(permission: string): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(false), 5000); // 5 second timeout
      });

      const checkPromise = new Promise<boolean>((resolve) => {
        try {
          CallLogModule.isPermissionGranted(permission)
            .then((granted: boolean) => {
              console.log(`Permission ${permission} granted:`, granted);
              resolve(granted);
            })
            .catch((error: any) => {
              console.error(`Error checking permission ${permission}:`, error);
              resolve(false);
            });
        } catch (error) {
          console.error(`Error initiating permission check for ${permission}:`, error);
          resolve(false);
        }
      });

      return await Promise.race([checkPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Get detailed permission status
   */
  static async getPermissionStatus(): Promise<PermissionStatus> {
    if (!this.isAndroid) {
      return {};
    }

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<PermissionStatus>((resolve) => {
        setTimeout(() => {
          console.warn('Permission status check timed out');
          resolve({});
        }, 5000);
      });

      const statusPromise = new Promise<PermissionStatus>((resolve) => {
        try {
          if (CallLogModule.getPermissionStatus) {
            CallLogModule.getPermissionStatus()
              .then((status: PermissionStatus) => {
                console.log('Permission status:', status);
                resolve(status || {});
              })
              .catch((error: any) => {
                console.error('Error getting permission status:', error);
                resolve({});
              });
          } else {
            // Fallback to individual checks
            this.checkIndividualPermissions()
              .then(resolve)
              .catch(() => resolve({}));
          }
        } catch (error) {
          console.error('Error initiating permission status check:', error);
          resolve({});
        }
      });

      return await Promise.race([statusPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error getting permission status:', error);
      return {};
    }
  }

  /**
   * Fallback method to check permissions individually
   */
  private static async checkIndividualPermissions(): Promise<PermissionStatus> {
    const permissions = [
      'android.permission.READ_PHONE_STATE',
      'android.permission.READ_CALL_LOG',
      'android.permission.READ_CONTACTS',
      'android.permission.WRITE_CONTACTS'
    ];

    const status: PermissionStatus = {};
    
    for (const permission of permissions) {
      try {
        status[permission] = await this.isPermissionGranted(permission);
      } catch (error) {
        console.error(`Error checking permission ${permission}:`, error);
        status[permission] = false;
      }
    }

    return status;
  }

  /**
   * Enhanced call logs retrieval with better error handling
   */
  static async getCallLogs(): Promise<CallLogEntry[]> {
    if (!this.isAndroid) {
      console.log('Call log access is only available on Android');
      return [];
    }

    try {
      // Check permissions first
      const hasPermission = await this.isPermissionGranted('android.permission.READ_CALL_LOG');
      if (!hasPermission) {
        console.warn('READ_CALL_LOG permission not granted');
        return [];
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<CallLogEntry[]>((resolve) => {
        setTimeout(() => {
          console.warn('Call logs retrieval timed out');
          resolve([]);
        }, 15000); // 15 second timeout for call logs
      });

      const fetchPromise = new Promise<CallLogEntry[]>((resolve) => {
        try {
          CallLogModule.getCallLogs()
            .then((callLogs: CallLogEntry[]) => {
              console.log(`Retrieved ${callLogs?.length || 0} call logs`);
              resolve(callLogs || []);
            })
            .catch((error: any) => {
              console.error('Error getting call logs:', error);
              resolve([]);
            });
        } catch (error) {
          console.error('Error initiating call logs retrieval:', error);
          resolve([]);
        }
      });

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error in getCallLogs:', error);
      return [];
    }
  }

  /**
   * Enhanced contacts retrieval with better error handling
   */
  static async getContacts(): Promise<DeviceContact[]> {
    if (!this.isAndroid) {
      console.log('Contact access is only available on Android');
      return [];
    }

    try {
      // Check permissions first
      const hasPermission = await this.isPermissionGranted('android.permission.READ_CONTACTS');
      if (!hasPermission) {
        console.warn('READ_CONTACTS permission not granted');
        return [];
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<DeviceContact[]>((resolve) => {
        setTimeout(() => {
          console.warn('Contacts retrieval timed out');
          resolve([]);
        }, 15000); // 15 second timeout for contacts
      });

      const fetchPromise = new Promise<DeviceContact[]>((resolve) => {
        try {
          CallLogModule.getContacts()
            .then((contacts: DeviceContact[]) => {
              console.log(`Retrieved ${contacts?.length || 0} contacts`);
              resolve(contacts || []);
            })
            .catch((error: any) => {
              console.error('Error getting contacts:', error);
              resolve([]);
            });
        } catch (error) {
          console.error('Error initiating contacts retrieval:', error);
          resolve([]);
        }
      });

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch (error) {
      console.error('Error in getContacts:', error);
      return [];
    }
  }

  /**
   * Enhanced sync operations with better error handling and queuing
   */
  static async syncCallLogs(userId: string): Promise<{
    success: boolean;
    synced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      console.log('Starting call log sync from device');
      
      const deviceCallLogs = await this.getCallLogs();
      
      if (!deviceCallLogs || deviceCallLogs.length === 0) {
        console.log('No call logs found or permission denied');
        return { success: true, synced: 0, errors: [] };
      }
      
      // Import ContactService dynamically to avoid circular dependencies
      const { ContactService } = await import('./contactService');
      
      // Process in smaller batches to prevent memory issues
      const batchSize = 10;
      for (let i = 0; i < deviceCallLogs.length; i += batchSize) {
        const batch = deviceCallLogs.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (callLog) => {
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
        });

        // Wait for batch to complete
        await Promise.allSettled(batchPromises);
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < deviceCallLogs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Call log sync completed: ${synced} calls synced`);
      return { success: true, synced, errors };
    } catch (error) {
      console.error('Error syncing call logs:', error);
      return {
        success: false,
        synced: 0,
        errors: [`Sync failed: ${error}`]
      };
    }
  }

  /**
   * Enhanced contacts sync with better error handling
   */
  static async syncContacts(userId: string): Promise<{
    success: boolean;
    added: number;
    updated: number;
    errors: string[];
  }> {
    try {
      console.log('Starting contact sync from device');
      
      const deviceContacts = await this.getContacts();
      
      if (!deviceContacts || deviceContacts.length === 0) {
        console.log('No contacts found or permission denied');
        return { success: true, added: 0, updated: 0, errors: [] };
      }
      
      // Import ContactService dynamically to avoid circular dependencies
      const { ContactService } = await import('./contactService');
      
      return await ContactService.syncDeviceContacts(deviceContacts, userId);
    } catch (error) {
      console.error('Error syncing contacts:', error);
      return {
        success: false,
        added: 0,
        updated: 0,
        errors: [`Contact sync failed: ${error}`]
      };
    }
  }

  /**
   * Get recent call logs with improved filtering
   */
  static async getRecentCallLogs(): Promise<CallLogEntry[]> {
    try {
      const allCallLogs = await this.getCallLogs();
      if (!allCallLogs || allCallLogs.length === 0) {
        return [];
      }

      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      
      return allCallLogs.filter(callLog => 
        callLog.timestamp && callLog.timestamp > oneDayAgo
      );
    } catch (error) {
      console.error('Error getting recent call logs:', error);
      return [];
    }
  }

  /**
   * Enhanced permission check with better validation
   */
  static async hasAllPermissions(): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      const status = await this.getPermissionStatus();
      return status.hasAllPermissions === true;
    } catch (error) {
      console.error('Error checking all permissions:', error);
      return false;
    }
  }

  /**
   * Check if specific critical permissions are granted
   */
  static async hasCriticalPermissions(): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      const [callLogPermission, contactsPermission] = await Promise.all([
        this.isPermissionGranted('android.permission.READ_CALL_LOG'),
        this.isPermissionGranted('android.permission.READ_CONTACTS')
      ]);

      return callLogPermission && contactsPermission;
    } catch (error) {
      console.error('Error checking critical permissions:', error);
      return false;
    }
  }
}
