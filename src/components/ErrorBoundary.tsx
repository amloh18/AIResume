'use client';

import React, { useEffect, useState } from 'react';
import { setupEventErrorHandling, validateNotEventObject } from '@/lib/utils/errorHandler';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Error boundary component to catch and handle Event object errors
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Check if the error is related to Event objects
    const isEventError = 
      error.message.includes('[object Event]') ||
      error.message.includes('Event') ||
      String(error).includes('[object Event]');
    
    if (isEventError) {
      console.error('Event object error caught by ErrorBoundary:', error);
      return { hasError: true, error };
    }
    
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback) {
        return <Fallback error={this.state.error!} resetError={this.resetError} />;
      }
      
      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ 
  error, 
  resetError 
}) => {
  const isEventError = 
    error.message.includes('[object Event]') ||
    error.message.includes('Event') ||
    String(error).includes('[object Event]');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              {isEventError ? 'Event Handling Error' : 'Application Error'}
            </h3>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {isEventError ? (
              <>
                An error occurred with event handling. This usually happens when an Event object 
                is passed where a string value is expected. This is a common issue in React forms.
              </>
            ) : (
              <>
                An unexpected error occurred. Please try refreshing the page or contact support 
                if the problem persists.
              </>
            )}
          </p>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-4">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              Error Details (Development)
            </summary>
            <pre className="mt-2 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-auto">
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </pre>
          </details>
        )}
        
        <div className="flex space-x-3">
          <button
            onClick={resetError}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to set up global error handling
 */
export const useGlobalErrorHandling = () => {
  useEffect(() => {
    const cleanup = setupEventErrorHandling();
    return cleanup;
  }, []);
};

/**
 * Higher-order component to wrap components with error handling
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Event object error detector hook
 */
export const useEventObjectDetector = () => {
  const [eventObjectErrors, setEventObjectErrors] = useState<Error[]>([]);
  
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message && event.message.includes('[object Event]')) {
        const error = new Error(event.message);
        setEventObjectErrors(prev => [...prev, error]);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  const clearErrors = () => setEventObjectErrors([]);
  
  return { eventObjectErrors, clearErrors };
};

export default ErrorBoundary;
