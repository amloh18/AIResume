/**
 * Global error handler to catch and prevent Event object errors
 */

/**
 * Wraps a Promise executor to ensure rejections are always Error objects, not Event objects
 * Use this when creating promises that might be rejected with Event objects (e.g., resource loading)
 * 
 * @example
 * const loadResource = () => wrapPromiseExecutor((resolve, reject) => {
 *   const link = document.createElement('link');
 *   link.onload = resolve;
 *   link.onerror = (e) => reject(new Error('Failed to load')); // Good
 *   // link.onerror = reject; // Bad - would reject with Event object
 * });
 */
export function wrapPromiseExecutor<T>(
  executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Wrap the reject function to convert Event objects to Errors
    const safeReject = (reason?: any) => {
      if (reason && typeof reason === 'object') {
        // Check if it's an Event object
        if (reason instanceof Event || ('target' in reason && 'preventDefault' in reason)) {
          const target = (reason as Event).target;
          const targetInfo = target ?
            ((target as HTMLElement).tagName || (target as HTMLElement).nodeName || 'unknown') :
            'unknown';
          
          // Extract URL if it's a link element
          const linkElement = (reason as Event).target as HTMLLinkElement;
          const resourceUrl = linkElement?.href || 'unknown';
          
          const error = new Error(
            `Promise rejected with Event object from ${targetInfo} element (${resourceUrl}). ` +
            `This is a bug - promises should reject with Error objects, not Events. ` +
            `Fix: Use reject(new Error('Failed to load resource')) instead of reject(event). ` +
            `See src/lib/utils/resourceLoader.ts for safe resource loading utilities.`
          );
          
          // Add helpful debugging info
          (error as any).originalEvent = {
            type: (reason as Event).type || 'unknown',
            target: targetInfo,
            url: resourceUrl,
            timestamp: (reason as Event).timeStamp || Date.now()
          };
          
          reject(error);
          return;
        }
        
        // Check if it's an empty object
        try {
          const keys = Object.keys(reason);
          const ownProps = Object.getOwnPropertyNames(reason);
          if (keys.length === 0 && ownProps.length === 0 &&
              Object.getPrototypeOf(reason) === Object.prototype) {
            reject(new Error('Promise rejected with empty object. This is likely a bug.'));
            return;
          }
        } catch {
          // If we can't check, continue with original rejection
        }
      }
      
      // If it's already an Error or something else, reject normally
      reject(reason);
    };
    
    executor(resolve, safeReject);
  });
}

/**
 * Patches Promise constructor to intercept promises that might reject with Event objects
 * This is a development/debugging tool - in production, we rely on the unhandled rejection handler
 */
const patchPromiseConstructor = () => {
  if (typeof window === 'undefined' || typeof Promise === 'undefined') return;
  
  // Only in development to avoid performance impact
  if (process.env.NODE_ENV === 'development') {
    const OriginalPromise = Promise;
    
    // Note: We don't actually replace Promise globally as it could break things
    // Instead, we provide utilities and catch errors at the unhandled rejection level
  }
};

/**
 * Sets up global error handling for Event object errors
 */
export const setupEventErrorHandling = () => {
  // Patch Promise constructor (development only)
  patchPromiseConstructor();
  // Handle uncaught errors
  const handleError = (event: ErrorEvent) => {
    // Check if the error message or error object is related to Event objects
    const isEventObjectError = event.message && (
      event.message.includes('[object Event]') ||
      event.message.includes('Event object')
    );
    
    // Also check if the error itself is an Event object
    const errorIsEvent = event.error && typeof event.error === 'object' &&
      (event.error instanceof Event || ('target' in event.error && 'preventDefault' in event.error));
    
    if (isEventObjectError || errorIsEvent) {
      // Use original console to avoid recursion
      const originalConsole = (window as any).__originalConsole__ || {
        error: console.error.bind(console)
      };
      
      try {
        const errorInfo = {
          message: event.message || '[No message]',
          filename: event.filename || '[Unknown]',
          lineno: event.lineno || 0,
          colno: event.colno || 0,
          error: errorIsEvent 
            ? '[Event object]' 
            : (event.error instanceof Error ? event.error.message : '[Error object]')
        };
        originalConsole.error('Event object error caught:', JSON.stringify(errorInfo, null, 2));
      } catch (e) {
        originalConsole.error('Event object error caught (handled safely)');
      }
      
      // Prevent the error from crashing the app
      event.preventDefault();
      return true;
    }
    return false;
  };

  // Handle unhandled promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    try {
      const reason = event.reason;
      
      // Check if reason is null or undefined
      if (reason === null || reason === undefined) {
        return false;
      }
      
      // Check if reason is an Event object by checking for Event-like properties
      const isEventObject = typeof reason === 'object' && 
        (reason instanceof Event || 
         ('target' in reason && 'preventDefault' in reason) ||
         ('type' in reason && 'timeStamp' in reason));
      
      // Check if reason stringifies to Event object
      const reasonString = String(reason);
      const stringifiesToEvent = reasonString.includes('[object Event]') || 
                                  reasonString === '[object Object]' ||
                                  reasonString === '{}';
      
      // Check if reason is an empty plain object
      // More robust check - check for enumerable and non-enumerable keys
      let isEmptyPlainObject = false;
      if (typeof reason === 'object' && !isEventObject && reason !== null) {
        try {
          const keys = Object.keys(reason);
          const ownProps = Object.getOwnPropertyNames(reason);
          isEmptyPlainObject = keys.length === 0 && ownProps.length === 0 &&
            Object.getPrototypeOf(reason) === Object.prototype;
        } catch {
          // If we can't check, assume it's not an empty object
          isEmptyPlainObject = false;
        }
      }
      
      if (isEventObject || isEmptyPlainObject || stringifiesToEvent) {
        // Safely serialize the reason for logging
        let reasonInfo: any;
        try {
          if (isEventObject) {
            const target = (reason as Event).target;
            const targetInfo = target ? 
              ((target as any)?.tagName || (target as any)?.nodeName || 'unknown') :
              'no target';
            const linkElement = target as HTMLLinkElement;
            const resourceUrl = linkElement?.href || 'unknown';
            
            reasonInfo = {
              type: 'Event',
              eventType: (reason as Event).type || 'unknown',
              target: targetInfo,
              url: resourceUrl,
              timestamp: (reason as Event).timeStamp || Date.now(),
              fix: 'Use reject(new Error("...")) instead of reject(event). See src/lib/utils/resourceLoader.ts for safe utilities.'
            };
          } else if (isEmptyPlainObject || reasonString === '{}') {
            reasonInfo = {
              type: 'EmptyObject',
              reason: 'Promise rejected with empty object',
              stack: (reason as Error)?.stack
            };
          } else {
            reasonInfo = {
              type: 'EventObject',
              stringified: reasonString,
              constructor: reason?.constructor?.name || 'unknown'
            };
          }
        } catch (e) {
          reasonInfo = {
            type: 'UnknownEventObject',
            error: 'Could not serialize rejection reason',
            errorMessage: e instanceof Error ? e.message : String(e)
          };
        }
        
        // Use original console.error to bypass consoleLogger and prevent recursion
        // Get the original console.error before any wrappers
        const originalConsole = (window as any).__originalConsole__ || {
          error: console.error.bind(console)
        };
        
        try {
          // Check if it's a CSS loading error (common in Next.js, can be safely ignored)
          const isCSSError = reasonInfo.type === 'Event' && 
            (reasonInfo.url?.includes('.css') || reasonInfo.target === 'LINK');
          
          if (isCSSError) {
            // CSS loading errors are often harmless in Next.js - just suppress or log quietly
            if (process.env.NODE_ENV === 'development') {
              originalConsole.warn('CSS resource loading issue (usually harmless):', reasonInfo.url || 'stylesheet');
            }
          } else {
            // For other Event object rejections, log with safe stringification
            const message = typeof reasonInfo === 'object' 
              ? JSON.stringify(reasonInfo, null, 2)
              : String(reasonInfo);
            originalConsole.error('Event object error in promise rejection:', message);
          }
        } catch (e) {
          // Fallback - just log a safe message
          originalConsole.error('Event object error in promise rejection (handled safely)');
        }
        
        event.preventDefault();
        return true;
      }
    } catch (error) {
      // If the error handler itself fails, log it but don't crash
      // Use original console.error to avoid recursion
      try {
        const originalConsole = (window as any).__originalConsole__ || {
          error: console.error.bind(console)
        };
        const errorMessage = error instanceof Error ? error.message : String(error);
        originalConsole.error('Error in handleUnhandledRejection:', errorMessage);
      } catch (e) {
        // Last resort - silent failure to prevent infinite loops
      }
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
 * Initialize error handling
 */
export const initializeErrorHandling = () => {
  const cleanup = setupEventErrorHandling();
  setupDevelopmentErrorDetection();
  
  return cleanup;
};
