'use client';

import React, { useState, useCallback } from 'react';

export interface ConsoleLogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
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
      this.handleLog('error', args);
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
    const message = this.formatMessage(args);
    const entry: ConsoleLogEntry = {
      level,
      message,
      timestamp: new Date(),
      data: args.length > 1 ? args.slice(1) : undefined,
    };

    // Determine if we should show toast or inline message based on current page
    const currentPath = window.location.pathname;
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
    if (isDashboardOrStudio && this.notificationCallback && shouldShowAsNotification) {
      this.notificationCallback(entry);
    }
    
    // Show inline messages for auth pages (only user-relevant messages)
    if (isAuthPage && this.inlineMessageCallback && shouldShowAsNotification) {
      this.inlineMessageCallback(entry);
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
        if (typeof arg === 'string') return arg;
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
  }
}

// Global instance
export const consoleLogger = new ConsoleLogger();

/**
 * Hook to use console logger with notifications
 */
export function useConsoleLogger() {
  // Safety check for server-side rendering
  if (typeof window === 'undefined') {
    return {
      showToastNotification: () => {},
      logToConsole: () => {},
      logError: () => {},
      logWarning: () => {},
      logInfo: () => {},
      logSuccess: () => {},
      logDebug: () => {}
    };
  }

  const showToastNotification = useCallback((entry: ConsoleLogEntry) => {
    // Notification functionality removed
  }, []);

  const showInlineMessage = (entry: ConsoleLogEntry) => {
    // This will be handled by the auth page components
    // We'll create a custom hook for this
    return entry;
  };

  return {
    showToastNotification,
    showInlineMessage,
  };
}

/**
 * Hook for inline messages in auth pages
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
