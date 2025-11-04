import { Platform } from 'react-native';

export class NetworkService {
  private static isConnected = true;
  private static connectionType: string = 'unknown';
  private static listeners: ((isConnected: boolean) => void)[] = [];

  static async initialize() {
    try {
      if (Platform.OS === 'web') {
        // For web, we'll assume connection based on navigator.onLine
        this.isConnected = navigator.onLine;
        this.connectionType = navigator.onLine ? 'wifi' : 'none';
      } else {
        // For mobile platforms - we'll implement basic connectivity check
        await this.performBasicConnectivityCheck();
      }
      
      console.log('NetworkService initialized:', { 
        isConnected: this.isConnected, 
        connectionType: this.connectionType 
      });
    } catch (error) {
      console.error('Failed to initialize NetworkService:', error);
      this.isConnected = false;
      this.connectionType = 'unknown';
    }
  }

  private static async performBasicConnectivityCheck() {
    try {
      // Simple connectivity check by trying to fetch a small resource
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });
      
      clearTimeout(timeoutId);
      this.isConnected = response.ok;
      this.connectionType = response.ok ? 'wifi' : 'none';
    } catch (error) {
      this.isConnected = false;
      this.connectionType = 'none';
      console.warn('Basic connectivity check failed:', error);
    }
  }

  private static handleConnectionChange = (isConnected: boolean) => {
    this.isConnected = isConnected;
    this.connectionType = isConnected ? 'wifi' : 'none';
    
    console.log('Network state changed:', {
      isConnected: this.isConnected,
      connectionType: this.connectionType
    });
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(this.isConnected);
      } catch (error) {
        console.error('Error in network listener:', error);
      }
    });
  };

  static getConnectionInfo() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType
    };
  }

  static isOnline(): boolean {
    return this.isConnected;
  }

  static addConnectionListener(callback: (isConnected: boolean) => void) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  static removeConnectionListener(callback: (isConnected: boolean) => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  static async checkConnectivity(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Simple connectivity check for web
        try {
          const response = await fetch('https://www.google.com/favicon.ico', {
            method: 'HEAD',
            cache: 'no-cache'
          });
          return response.ok;
        } catch {
          return navigator.onLine;
        }
      } else {
        // For mobile, perform basic connectivity check
        await this.performBasicConnectivityCheck();
        return this.isConnected;
      }
    } catch (error) {
      console.error('Connectivity check failed:', error);
      return this.isConnected; // Fallback to last known state
    }
  }

  static createTimeoutPromise(timeoutMs: number, operation: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation '${operation}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  static async withTimeout<T>(
    operation: Promise<T>,
    timeoutMs: number,
    operationName: string,
    fallbackValue?: T
  ): Promise<T> {
    const timeoutPromise = this.createTimeoutPromise(timeoutMs, operationName);
    
    try {
      return await Promise.race([operation, timeoutPromise]);
    } catch (error) {
      console.warn(`Operation '${operationName}' failed or timed out:`, error);
      
      if (fallbackValue !== undefined) {
        console.log(`Using fallback value for '${operationName}'`);
        return fallbackValue;
      }
      
      throw error;
    }
  }

  static getNetworkDiagnostics() {
    return {
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      listenersCount: this.listeners.length
    };
  }
}
