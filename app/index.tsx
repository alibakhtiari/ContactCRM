import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
  const { user, loading, error, timeoutReached } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!loading) {
      if (user) {
        console.log('User authenticated, navigating to tabs');
        router.replace('/(tabs)');
      } else if (!timeoutReached && !error) {
        console.log('No user found, navigating to login');
        router.replace('/login');
      }
    }
  }, [user, loading, timeoutReached, error]);

  const handleRetry = () => {
    console.log('Retrying authentication...');
    // Force app restart by navigating to root
    router.replace('/');
  };

  const handleOfflineMode = () => {
    console.log('Entering offline mode...');
    // Navigate to a basic offline mode or create a temporary user
    router.replace('/(tabs)');
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading ContactCRM...</Text>
      </View>
    );
  }

  if (timeoutReached || error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>Connection Issue</Text>
        <Text style={styles.errorMessage}>
          {timeoutReached 
            ? 'The app is taking too long to load. This might be due to network connectivity issues.'
            : error || 'An unexpected error occurred during authentication.'
          }
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={handleRetry}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleOfflineMode}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Continue Offline</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show loading while navigating
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading ContactCRM...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
});
