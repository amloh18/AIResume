/**
 * Error tracking service integration
 * Supports Sentry, LogRocket, and other error tracking services
 */

import { log } from './structured-logger';

interface ErrorTrackingConfig {
  service: 'sentry' | 'logrocket' | 'custom' | 'none';
  dsn?: string;
  environment?: string;
  release?: string;
  userId?: string;
  tags?: Record<string, string>;
  beforeSend?: (error: any) => any;
}

class ErrorTrackingService {
  private config: ErrorTrackingConfig;
  private service: any = null;

  constructor(config: ErrorTrackingConfig) {
    this.config = config;
    this.initializeService();
  }

  private initializeService() {
    if (this.config.service === 'none') {
      return;
    }

    try {
      switch (this.config.service) {
        case 'sentry':
          this.initializeSentry();
          break;
        case 'logrocket':
          this.initializeLogRocket();
          break;
        case 'custom':
          this.initializeCustom();
          break;
      }
    } catch (error) {
      log.error('Failed to initialize error tracking service', error, {
        service: this.config.service
      });
    }
  }

  private initializeSentry() {
    // Never initialize Sentry in Edge Runtime
    if (typeof process === 'undefined' || process.env.NEXT_RUNTIME === 'edge' || process.env.NEXT_RUNTIME === 'experimental-edge') {
      return;
    }

    try {
      if (typeof window === 'undefined') {
        // Server-side Sentry - use dynamic require with variable to prevent Edge bundler analysis
        const sentryPkg = '@sentry/nextjs';
        const SentryModule = require(sentryPkg);
        const { init, captureException, setUser, setTag, setContext } = SentryModule;
        
        init({
          dsn: this.config.dsn,
          environment: this.config.environment || process.env.NODE_ENV,
          release: this.config.release || process.env.npm_package_version,
          beforeSend: this.config.beforeSend,
        });

        this.service = {
          captureException,
          setUser,
          setTag,
          setContext,
          addBreadcrumb: (breadcrumb: any) => {
            // Sentry breadcrumbs are handled automatically
          }
        };
      } else {
        // Client-side Sentry - use dynamic require with variable
        const sentryBrowserPkg = '@sentry/browser';
        const SentryBrowserModule = require(sentryBrowserPkg);
        const { init, captureException, setUser, setTag, setContext, addBreadcrumb } = SentryBrowserModule;
        
        init({
          dsn: this.config.dsn,
          environment: this.config.environment || process.env.NODE_ENV,
          release: this.config.release || process.env.npm_package_version,
          beforeSend: this.config.beforeSend,
        });

        this.service = {
          captureException,
          setUser,
          setTag,
          setContext,
          addBreadcrumb
        };
      }
    } catch (error) {
      log.warn('Sentry not available, using fallback error tracking', { error: error.message });
      this.initializeCustom();
    }
  }

  private initializeLogRocket() {
    if (typeof window === 'undefined') {
      log.warn('LogRocket is only available on the client side');
      return;
    }

    try {
      const LogRocket = require('logrocket');
      
      LogRocket.init(this.config.dsn, {
        release: this.config.release || process.env.npm_package_version,
        environment: this.config.environment || process.env.NODE_ENV,
      });

      this.service = {
        captureException: (error: any, context?: any) => {
          LogRocket.captureException(error, context);
        },
        setUser: (user: any) => {
          LogRocket.identify(user.id, user);
        },
        setTag: (key: string, value: string) => {
          LogRocket.setTag(key, value);
        },
        setContext: (key: string, context: any) => {
          LogRocket.setContext(key, context);
        },
        addBreadcrumb: (breadcrumb: any) => {
          LogRocket.addBreadcrumb(breadcrumb);
        }
      };
    } catch (error) {
      log.warn('LogRocket not available, using fallback error tracking', { error: error.message });
      this.initializeCustom();
    }
  }

  private initializeCustom() {
    // Custom error tracking implementation
    this.service = {
      captureException: (error: any, context?: any) => {
        // Send to custom endpoint
        fetch('/api/error-tracking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error, context, timestamp: new Date().toISOString() })
        }).catch(err => log.error('Failed to send error to custom tracking', err));
      },
      setUser: (user: any) => {
        // Store user context
        if (typeof window !== 'undefined') {
          localStorage.setItem('errorTrackingUser', JSON.stringify(user));
        }
      },
      setTag: (key: string, value: string) => {
        // Store tags
        if (typeof window !== 'undefined') {
          const tags = JSON.parse(localStorage.getItem('errorTrackingTags') || '{}');
          tags[key] = value;
          localStorage.setItem('errorTrackingTags', JSON.stringify(tags));
        }
      },
      setContext: (key: string, context: any) => {
        // Store context
        if (typeof window !== 'undefined') {
          const contexts = JSON.parse(localStorage.getItem('errorTrackingContexts') || '{}');
          contexts[key] = context;
          localStorage.setItem('errorTrackingContexts', JSON.stringify(contexts));
        }
      },
      addBreadcrumb: (breadcrumb: any) => {
        // Store breadcrumbs
        if (typeof window !== 'undefined') {
          const breadcrumbs = JSON.parse(localStorage.getItem('errorTrackingBreadcrumbs') || '[]');
          breadcrumbs.push({ ...breadcrumb, timestamp: new Date().toISOString() });
          // Keep only last 50 breadcrumbs
          if (breadcrumbs.length > 50) {
            breadcrumbs.splice(0, breadcrumbs.length - 50);
          }
          localStorage.setItem('errorTrackingBreadcrumbs', JSON.stringify(breadcrumbs));
        }
      }
    };
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.service) {
      log.error('Error tracking service not initialized', error, context);
      return;
    }

    try {
      // Add default context
      const enrichedContext = {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      };

      this.service.captureException(error, enrichedContext);
      
      // Also log to our structured logger
      log.error('Exception captured by error tracking', error, enrichedContext);
    } catch (trackingError) {
      log.error('Failed to capture exception in error tracking service', trackingError);
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'error', context?: Record<string, any>) {
    if (!this.service) {
      log.error('Error tracking service not initialized', new Error(message), context);
      return;
    }

    try {
      const enrichedContext = {
        ...context,
        timestamp: new Date().toISOString(),
        level,
        message,
      };

      // Most error tracking services don't have a direct captureMessage method
      // So we'll create an error object with the message
      const error = new Error(message);
      error.name = 'UserMessage';
      
      this.service.captureException(error, enrichedContext);
      
      // Also log to our structured logger
      log[level](message, enrichedContext);
    } catch (trackingError) {
      log.error('Failed to capture message in error tracking service', trackingError);
    }
  }

  setUser(user: { id: string; email?: string; name?: string; [key: string]: any }) {
    if (!this.service) {
      log.warn('Error tracking service not initialized - cannot set user');
      return;
    }

    try {
      this.service.setUser(user);
      log.info('User set in error tracking service', { userId: user.id });
    } catch (error) {
      log.error('Failed to set user in error tracking service', error);
    }
  }

  setTag(key: string, value: string) {
    if (!this.service) {
      log.warn('Error tracking service not initialized - cannot set tag');
      return;
    }

    try {
      this.service.setTag(key, value);
      log.debug('Tag set in error tracking service', { key, value });
    } catch (error) {
      log.error('Failed to set tag in error tracking service', error);
    }
  }

  setContext(key: string, context: Record<string, any>) {
    if (!this.service) {
      log.warn('Error tracking service not initialized - cannot set context');
      return;
    }

    try {
      this.service.setContext(key, context);
      log.debug('Context set in error tracking service', { key, context });
    } catch (error) {
      log.error('Failed to set context in error tracking service', error);
    }
  }

  addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, any>) {
    if (!this.service) {
      log.warn('Error tracking service not initialized - cannot add breadcrumb');
      return;
    }

    try {
      const breadcrumb = {
        message,
        category,
        level,
        data,
        timestamp: new Date().toISOString(),
      };

      this.service.addBreadcrumb(breadcrumb);
      log.debug('Breadcrumb added to error tracking service', breadcrumb);
    } catch (error) {
      log.error('Failed to add breadcrumb to error tracking service', error);
    }
  }

  // Performance monitoring
  startTransaction(name: string, op: string = 'navigation') {
    if (!this.service || !this.service.startTransaction) {
      return null;
    }

    try {
      return this.service.startTransaction({ name, op });
    } catch (error) {
      log.error('Failed to start transaction in error tracking service', error);
      return null;
    }
  }

  // Set release information
  setRelease(release: string) {
    if (!this.service || !this.service.setRelease) {
      return;
    }

    try {
      this.service.setRelease(release);
      log.info('Release set in error tracking service', { release });
    } catch (error) {
      log.error('Failed to set release in error tracking service', error);
    }
  }
}

// Create singleton instance based on environment variables
const config: ErrorTrackingConfig = {
  service: (process.env.ERROR_TRACKING_SERVICE as any) || 'none',
  dsn: process.env.SENTRY_DSN || process.env.LOGROCKET_APP_ID,
  environment: process.env.NODE_ENV,
  release: process.env.npm_package_version,
  beforeSend: (error: any) => {
    // Filter out certain errors in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send network errors
      if (error.message?.includes('Network Error')) {
        return null;
      }
      // Don't send 404 errors
      if (error.status === 404) {
        return null;
      }
    }
    return error;
  }
};

export const errorTracking = new ErrorTrackingService(config);

// Export convenience functions
export const captureException = (error: Error, context?: Record<string, any>) => 
  errorTracking.captureException(error, context);

export const captureMessage = (message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>) => 
  errorTracking.captureMessage(message, level, context);

export const setUser = (user: { id: string; email?: string; name?: string; [key: string]: any }) => 
  errorTracking.setUser(user);

export const setTag = (key: string, value: string) => 
  errorTracking.setTag(key, value);

export const setContext = (key: string, context: Record<string, any>) => 
  errorTracking.setContext(key, context);

export const addBreadcrumb = (message: string, category: string, level?: 'info' | 'warning' | 'error', data?: Record<string, any>) => 
  errorTracking.addBreadcrumb(message, category, level, data);

export default errorTracking;
