'use client';

import React, { useState, useCallback } from 'react';

export interface ConsoleLogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'success';
  message: string;
  timestamp: Date;
  data?: any[];
}

export interface ConsoleLoggerConfig {
  showDebugLogs: boolean;
  showTechnicalErrors: boolean;
  strictFiltering: boolean;
}

class ConsoleLogger {
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };
  private isInitialized = false;
  private notificationCallback: ((entry: ConsoleLogEntry) => void) | null = null;
  private inlineMessageCallback: ((entry: ConsoleLogEntry) => void) | null = null;
  private config: ConsoleLoggerConfig = {
    showDebugLogs: false,
    showTechnicalErrors: false,
    strictFiltering: true
  };

  constructor() {
    this.originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
    
    // Store original console globally for error handlers to access
    if (typeof window !== 'undefined') {
      (window as any).__originalConsole__ = this.originalConsole;
    }
  }

  /**
   * Initialize the console logger with notification callbacks
   */
  initialize(
    notificationCallback?: (entry: ConsoleLogEntry) => void,
    inlineMessageCallback?: (entry: ConsoleLogEntry) => void,
    config?: Partial<ConsoleLoggerConfig>
  ) {
    if (this.isInitialized) return;

    this.notificationCallback = notificationCallback || null;
    this.inlineMessageCallback = inlineMessageCallback || null;
    
    // Update config if provided
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Override console methods
    console.log = (...args) => {
      if (this.originalConsole && this.originalConsole.log) {
        this.originalConsole.log(...args);
      }
      this.handleLog('log', args);
    };

    console.info = (...args) => {
      if (this.originalConsole && this.originalConsole.info) {
        this.originalConsole.info(...args);
      }
      this.handleLog('info', args);
    };

    console.warn = (...args) => {
      if (this.originalConsole && this.originalConsole.warn) {
        this.originalConsole.warn(...args);
      }
      this.handleLog('warn', args);
    };

    console.error = (...args) => {
      if (this.originalConsole && this.originalConsole.error) {
        this.originalConsole.error(...args);
      }
      
      // Skip custom logging if args contain Event objects or empty objects to prevent recursion
      const hasProblematicObject = args.some(arg => {
        if (!arg || typeof arg !== 'object') return false;
        // Check for Event objects
        if (arg instanceof Event || ('target' in arg && 'preventDefault' in arg)) return true;
        // Check for empty objects
        try {
          const keys = Object.keys(arg);
          return keys.length === 0 && Object.getPrototypeOf(arg) === Object.prototype;
        } catch {
          return false;
        }
      });
      
      if (!hasProblematicObject) {
        this.handleLog('error', args);
      }
    };

    console.debug = (...args) => {
      if (this.originalConsole && this.originalConsole.debug) {
        this.originalConsole.debug(...args);
      }
      this.handleLog('debug', args);
    };

    this.isInitialized = true;
  }

  /**
   * Restore original console methods
   */
  restore() {
    if (!this.isInitialized) return;

    console.log = this.originalConsole.log;
    console.info = this.originalConsole.info;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.debug = this.originalConsole.debug;

    this.isInitialized = false;
  }

  private handleLog(level: ConsoleLogEntry['level'], args: any[]) {
    try {
      if (!args || !Array.isArray(args)) return;

      // Skip logging if args contain Event objects or problematic empty objects
      const hasEventObject = args.some(arg => 
        arg && typeof arg === 'object' && 
        (arg instanceof Event || ('target' in arg && 'preventDefault' in arg))
      );
      
      const hasEmptyObject = args.some(arg => {
        if (!arg || typeof arg !== 'object') return false;
        try {
          const keys = Object.keys(arg);
          const ownProps = Object.getOwnPropertyNames(arg);
          return keys.length === 0 && ownProps.length === 0 &&
            Object.getPrototypeOf(arg) === Object.prototype;
        } catch {
          return false;
        }
      });
      
      // If we have problematic objects, skip our custom logging but still call original console
      if (hasEventObject || hasEmptyObject) {
        return; // Original console already called in the wrapper
      }
      
      const message = this.formatMessage(args);
      const entry: ConsoleLogEntry = {
        level,
        message,
        timestamp: new Date(),
        data: args.length > 1 ? args.slice(1) : undefined,
      };

      // Determine if we should show toast or inline message based on current page
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthPage = currentPath.includes('/sign-in') || 
                        currentPath.includes('/sign-up') || 
                        currentPath.includes('/reset-password') ||
                        currentPath.includes('/auth/');
      
      const isDashboardOrStudio = currentPath.includes('/dashboard') || 
                                 currentPath.includes('/studio') ||
                                 currentPath.includes('/canvas');

      // Only show user-relevant messages as notifications
      const shouldShowAsNotification = this.shouldShowAsNotification(entry);

      // Show toast notifications for dashboard and studio pages (only user-relevant messages)
      if (typeof window !== 'undefined' && isDashboardOrStudio && this.notificationCallback && shouldShowAsNotification) {
        this.notificationCallback(entry);
      }
      
      // Show inline messages for auth pages (only user-relevant messages)
      if (typeof window !== 'undefined' && isAuthPage && this.inlineMessageCallback && shouldShowAsNotification) {
        this.inlineMessageCallback(entry);
      }
    } catch (e) {
      // Fail silently to avoid recursion/crashing
      if (this.originalConsole && this.originalConsole.warn) {
        this.originalConsole.warn('ConsoleLogger failed to process log safely:', e);
      }
    }
  }

  /**
   * Determines if a console log should be shown as a user notification
   * Only shows success/failure/update messages that are user-relevant
   */
  private shouldShowAsNotification(entry: ConsoleLogEntry): boolean {
    const message = entry.message.toLowerCase();
    
    // User-relevant success messages
    const successPatterns = [
      'success',
      'saved',
      'created',
      'updated',
      'deleted',
      'uploaded',
      'downloaded',
      'sent',
      'completed',
      'finished',
      'done',
      'authenticated',
      'logged in',
      'signed up',
      'verified',
      'confirmed'
    ];

    // User-relevant error messages (but not debug errors)
    const errorPatterns = [
      'failed to',
      'unable to',
      'error occurred',
      'something went wrong',
      'please try again',
      'invalid',
      'not found',
      'access denied',
      'permission denied',
      'network error',
      'connection failed'
    ];

    // User-relevant info messages
    const infoPatterns = [
      'processing',
      'loading',
      'please wait',
      'updating',
      'saving',
      'sending',
      'connecting',
      'synchronizing',
      'refreshing'
    ];

    // Debug patterns that should NOT be shown to users
    const debugPatterns = [
      '🔍', '🐛', 'debug', 'console', 'log', 'trace', 'stack',
      'component rendered', 'useeffect', 'usestate', 'props',
      'state', 'render', 'mount', 'unmount', 'api call',
      'fetching', 'request', 'response', 'headers', 'status',
      'data:', 'object:', 'array:', 'function:', 'callback',
      'initial data loading completed', 'fast refresh', 'cover letter data loaded'
    ];

    // Don't show debug messages
    if (debugPatterns.some(pattern => message.includes(pattern))) {
      return false;
    }

    // Don't show technical error messages
    if (entry.level === 'error' && !errorPatterns.some(pattern => message.includes(pattern))) {
      return false;
    }

    // Show success messages
    if (entry.level === 'log' && successPatterns.some(pattern => message.includes(pattern))) {
      return true;
    }

    // Show user-relevant errors
    if (entry.level === 'error' && errorPatterns.some(pattern => message.includes(pattern))) {
      return true;
    }

    // Show user-relevant warnings
    if (entry.level === 'warn' && (errorPatterns.some(pattern => message.includes(pattern)) || 
                                   infoPatterns.some(pattern => message.includes(pattern)))) {
      return true;
    }

    // Show user-relevant info messages
    if (entry.level === 'info' && infoPatterns.some(pattern => message.includes(pattern))) {
      return true;
    }

    // Don't show debug logs unless explicitly enabled
    if (entry.level === 'debug' && !this.config.showDebugLogs) {
      return false;
    }

    // If strict filtering is enabled, be more conservative
    if (this.config.strictFiltering) {
      // Only show very clear user-relevant messages
      const strictSuccessPatterns = ['success', 'saved', 'created', 'completed'];
      const strictErrorPatterns = ['failed to', 'unable to', 'error occurred', 'please try again'];
      
      if (entry.level === 'log' && !strictSuccessPatterns.some(pattern => message.includes(pattern))) {
        return false;
      }
      
      if (entry.level === 'error' && !strictErrorPatterns.some(pattern => message.includes(pattern))) {
        return false;
      }
    }

    return false;
  }

  private formatMessage(args: any[]): string {
    return args
      .map(arg => {
        // Skip Event objects and empty objects to prevent [object Event] errors
        if (arg && typeof arg === 'object') {
          // Check if it's an Event object
          if (arg instanceof Event || ('target' in arg && 'preventDefault' in arg)) {
            return '[Event object - safely handled]';
          }
          
          // Check if it's an empty object
          const keys = Object.keys(arg);
          if (keys.length === 0 && Object.getPrototypeOf(arg) === Object.prototype) {
            return '[Empty object]';
          }
          
          // Try to serialize, but handle circular references and Event objects
          try {
            // Use a replacer to skip Event objects
            return JSON.stringify(arg, (key, value) => {
              if (value && typeof value === 'object') {
                if (value instanceof Event || ('target' in value && 'preventDefault' in value)) {
                  return '[Event object]';
                }
              }
              return value;
            }, 2);
          } catch {
            // If serialization fails, return a safe string representation
            try {
              return String(arg);
            } catch {
              return '[Object that could not be stringified]';
            }
          }
        }
        if (typeof arg === 'string') return arg;
        return String(arg);
      })
      .join(' ');
  }
}

// Global instance
export const consoleLogger = new ConsoleLogger();

/**
 * Hook to use console logger with notifications
 * 
 * FIXED: Hooks must be called unconditionally (Rules of Hooks)
 * Cannot return early before calling useCallback
 */
export function useConsoleLogger() {
  // CRITICAL FIX: Call useCallback unconditionally (Rules of Hooks)
  // Cannot return early before calling hooks - this was causing "Cannot read properties of null (reading 'useState')"
  const showToastNotification = useCallback((entry: ConsoleLogEntry) => {
    // Notification functionality removed
    // Only execute logic if in browser
    if (typeof window === 'undefined') {
      return;
    }
    // Notification logic here if needed
  }, []);

  const showInlineMessage = useCallback((entry: ConsoleLogEntry) => {
    // This will be handled by the auth page components
    // We'll create a custom hook for this
    if (typeof window === 'undefined') {
      return entry;
    }
    return entry;
  }, []);

  // Return appropriate values based on environment, but hooks are always called
  if (typeof window === 'undefined') {
    // Server-side: return no-op functions but hooks were still called
    return {
      showToastNotification: () => {},
      logToConsole: () => {},
      logError: () => {},
      logWarning: () => {},
      logInfo: () => {},
      logSuccess: () => {},
      logDebug: () => {},
      showInlineMessage: () => {}
    };
  }

  return {
    showToastNotification,
    showInlineMessage,
  };
}

/**
 * Hook for inline messages in auth pages
 * 
 * NOTE: This hook uses useState, so it must only be used in client components
 * The file already has 'use client' directive at the top
 */
export function useInlineMessages() {
  const [messages, setMessages] = useState<ConsoleLogEntry[]>([]);

  const addInlineMessage = (entry: ConsoleLogEntry) => {
    setMessages(prev => [entry, ...prev].slice(0, 5)); // Keep last 5 messages
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    addInlineMessage,
    clearMessages,
  };
}

export default consoleLogger;
