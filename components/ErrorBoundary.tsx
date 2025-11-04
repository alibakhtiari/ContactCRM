import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
  errorInfo: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log the error
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Here you could also send the error to a logging service
    this.logError(error, errorInfo);
  }

  logError = (error: Error, errorInfo: any) => {
    const errorLog = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator?.userAgent || 'Unknown'
    };

    // Log to console in development
    if (__DEV__) {
      console.log('Error Log:', errorLog);
    }

    // In production, you would send this to your error reporting service
    // Example: Sentry, LogRocket, etc.
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
            errorInfo={this.state.errorInfo}
          />
        );
      }

      return <ErrorFallback
        error={this.state.error}
        resetError={this.resetError}
        errorInfo={this.state.errorInfo}
      />;
    }

    return this.props.children;
  }
}

function ErrorFallback({ error, resetError, errorInfo }: ErrorFallbackProps) {
  const navigation = useNavigation();

  const handleReset = () => {
    resetError();
  };

  const handleGoHome = () => {
    try {
      navigation.navigate('Home' as never);
    } catch (navError) {
      console.error('Navigation error:', navError);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.title}>Oops! Something went wrong</Text>
        <Text style={styles.message}>
          We're sorry, but something unexpected happened. Please try again or restart the app.
        </Text>
        
        {__DEV__ && error && (
          <View style={styles.errorDetails}>
            <Text style={styles.errorTitle}>Error Details (Dev Mode):</Text>
            <Text style={styles.errorMessage}>{error.message}</Text>
            {error.stack && (
              <Text style={styles.errorStack} numberOfLines={5}>
                {error.stack}
              </Text>
            )}
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
            <Text style={styles.secondaryButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>

        {errorInfo && __DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugTitle}>Component Stack:</Text>
            <Text style={styles.debugText} numberOfLines={10}>
              {errorInfo.componentStack}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 400,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorDetails: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 12,
    color: '#1C1C1E',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: '#8E8E93',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D1D6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  debugInfo: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: '100%',
    maxHeight: 200,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6D6D6D',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: '#4A4A4A',
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
