/**
 * Global error handler to catch and prevent Event object errors
 */

/**
 * Sets up global error handling for Event object errors
 */
export const setupEventErrorHandling = () => {
  // Handle uncaught errors
  const handleError = (event: ErrorEvent) => {
    if (event.message && event.message.includes('[object Event]')) {
      console.error('Event object error caught:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
      
      // Prevent the error from crashing the app
      event.preventDefault();
      return true;
    }
    return false;
  };

  // Handle unhandled promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (event.reason && String(event.reason).includes('[object Event]')) {
      console.error('Event object error in promise rejection:', event.reason);
      event.preventDefault();
      return true;
    }
    return false;
  };

  // Add event listeners
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Return cleanup function
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

/**
 * Validates that a value is not an Event object
 */
export const validateNotEventObject = (value: any, context: string = 'value'): boolean => {
  if (value && typeof value === 'object' && 'target' in value && 'preventDefault' in value) {
    console.error(`Event object detected in ${context}:`, value);
    return false;
  }
  return true;
};

/**
 * Safe wrapper for functions that might receive Event objects
 */
export const safeWrapper = <T extends any[], R>(
  fn: (...args: T) => R,
  context: string = 'function'
) => {
  return (...args: T): R | undefined => {
    try {
      // Check if any argument is an Event object
      const hasEventObject = args.some(arg => 
        arg && typeof arg === 'object' && 'target' in arg && 'preventDefault' in arg
      );
      
      if (hasEventObject) {
        console.error(`Event object passed to ${context}:`, args);
        return undefined;
      }
      
      return fn(...args);
    } catch (error) {
      console.error(`Error in ${context}:`, error);
      return undefined;
    }
  };
};

/**
 * Development-only error detection
 */
export const setupDevelopmentErrorDetection = () => {
  if (process.env.NODE_ENV === 'development') {
    // Override console.error to detect Event object errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const hasEventObject = args.some(arg => 
        String(arg).includes('[object Event]') || 
        (arg && typeof arg === 'object' && 'target' in arg)
      );
      
      if (hasEventObject) {
        console.warn('🚨 Event object error detected:', args);
        // Add breakpoint for debugging
        debugger;
      }
      
      originalConsoleError.apply(console, args);
    };
  }
};

/**
 * React error boundary for Event object errors
 */
export const createEventErrorBoundary = () => {
  return class EventErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      if (error.message.includes('[object Event]') || 
          error.message.includes('Event') ||
          String(error).includes('[object Event]')) {
        return { hasError: true, error };
      }
      return { hasError: false };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('EventErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h2 className="text-lg font-medium text-red-800">Event Handling Error</h2>
            <p className="text-red-600">
              An error occurred with event handling. This usually happens when an Event object 
              is passed where a string value is expected.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        );
      }

      return this.props.children;
    }
  };
};

/**
 * Initialize error handling
 */
export const initializeErrorHandling = () => {
  const cleanup = setupEventErrorHandling();
  setupDevelopmentErrorDetection();
  
  return cleanup;
};
