'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { usePathname } from 'next/navigation';
import { INotification, NotificationType } from '@/models/Notification';

interface NotificationContextType {
  notifications: INotification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  handleNotificationAction: (notificationId: string, actionType: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Component that provides notifications with session - only for non-admin routes
function NotificationProviderWithSession({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  // Track if we've already fetched to prevent duplicate calls
  const hasFetchedRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  
  // Check if we're on admin route - skip session logic if so
  const isAdminRoute = pathname ? pathname.startsWith('/admin') : false;
  
  // Ensure we're mounted before using session (prevents SSR/hydration issues)
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Use useSession - must be called unconditionally (React hook rule)
  // SessionProvider should always be available since NotificationProvider is inside it in ClientProviders
  // Safely handle potential null/undefined returns
  const sessionResult = useSession();
  const session = sessionResult?.data || null;
  const status = sessionResult?.status || 'loading';
  
  // Safely check authentication - handle null/undefined cases
  const isAuthenticated = isMounted && 
                          !isAdminRoute && 
                          status === 'authenticated' && 
                          !!session?.user;

  // Filter out expired time-sensitive notifications
  const filterExpiredNotifications = useCallback((notifs: INotification[]) => {
    const now = new Date();
    return notifs.filter((notif) => {
      // Persistent notifications never expire
      if (notif.persistent) return true;
      // Time-sensitive notifications expire based on expiresAt
      if (notif.expiresAt) {
        return new Date(notif.expiresAt) > now;
      }
      // If no expiresAt, keep it (shouldn't happen but safe fallback)
      return true;
    });
  }, []);

  // Fetch notifications from API - only if authenticated
  const fetchNotifications = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!isAuthenticated) {
      setNotifications([]);
      setIsLoading(false);
      hasFetchedRef.current = false; // Reset on logout
      return;
    }

    // Prevent duplicate calls within 2 seconds (debounce)
    const now = Date.now();
    if (hasFetchedRef.current && (now - lastFetchTimeRef.current) < 2000) {
      console.log('⏭️ NotificationContext - Skipping duplicate fetch (debounced)');
      return;
    }

    hasFetchedRef.current = true;
    lastFetchTimeRef.current = now;

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // JSON parse failed, use default error message
          }
        }
        throw new Error(`Failed to fetch notifications: ${errorMessage}`);
      }
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        const filtered = filterExpiredNotifications(data.notifications || []);
        setNotifications(filtered);
      } else {
        console.error('Notifications response is not JSON. Content-Type:', contentType);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set empty array on error to prevent UI issues
      setNotifications([]);
      // Only show toast for non-401 errors (401 means user is not authenticated, which is expected for logged-out users)
      if (error instanceof Error && !error.message.includes('401')) {
        toast({
          title: 'Error',
          description: 'Failed to load notifications. Please refresh the page.',
          variant: 'destructive',
        });
      }
      // Reset fetch flag on error so we can retry
      hasFetchedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [filterExpiredNotifications, toast, isAuthenticated]);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      
      setNotifications((prev) => {
        // Fix 1: Ensure prev is an array before calling map
        if (!prev || !Array.isArray(prev)) {
          return [];
        }
        return prev.map((notif) => {
          // Fix 2: Safely convert _id to string
          const notifId = notif._id ? (typeof notif._id === 'string' ? notif._id : String(notif._id)) : '';
          return notifId === notificationId
            ? { ...notif, read: true, readAt: new Date() as any }
            : notif;
        }) as INotification[];
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      
      setNotifications((prev) => {
        // Fix 3: Ensure prev is an array before calling map
        if (!prev || !Array.isArray(prev)) {
          return [];
        }
        return prev.map((notif) => ({ ...notif, read: true, readAt: new Date() as any })) as INotification[];
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Handle notification action
  const handleNotificationAction = useCallback(async (notificationId: string, actionType: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType }),
      });
      if (!response.ok) throw new Error('Failed to handle action');
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Notification action response is not JSON. Content-Type:', contentType);
        return;
      }
      
      const data = await response.json();
      
      // Mark as read after action
      await markAsRead(notificationId);
      
      // Show success message
      toast({
        title: 'Success',
        description: data.message || 'Action completed',
      });
      
      // Refresh notifications
      await refreshNotifications();
    } catch (error) {
      console.error('Error handling notification action:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete action',
        variant: 'destructive',
      });
    }
  }, [markAsRead, refreshNotifications, toast]);

  // Track displayed notification IDs to avoid duplicate toasts
  const displayedToastIdsRef = useRef<Set<string>>(new Set());
  const lastToastAtRef = useRef<number>(0);

  // Set up Server-Sent Events for real-time notifications - only if authenticated
  useEffect(() => {
    // Only set up SSE if we're in the browser and user is authenticated
    if (typeof window === 'undefined' || !isAuthenticated) {
      // Close any existing connection if user is not authenticated
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      return;
    }

    const setupSSE = () => {
      // Close existing connection if any
      if (eventSource) {
        eventSource.close();
      }

      const es = new EventSource('/api/notifications/stream');
      
      es.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as INotification;

          // Filter expired notifications
          const filtered = filterExpiredNotifications([notification]);
          if (filtered.length > 0) {
            setNotifications((prev) => {
              // Ensure prev is an array
              if (!prev || !Array.isArray(prev)) {
                return [notification];
              }
              
              // Check if notification already exists (avoid duplicates)
              // Fix 4: Safely convert _id to string for comparison
              const notificationId = notification._id ? (typeof notification._id === 'string' ? notification._id : String(notification._id)) : '';
              const exists = prev.some((n) => {
                const nId = n._id ? (typeof n._id === 'string' ? n._id : String(n._id)) : '';
                return nId === notificationId;
              });
              if (exists) return prev;

              // Add new notification at the beginning
              return filterExpiredNotifications([notification, ...prev]);
            });

            // Show toast for in-app notifications (only if authenticated)
            // Fix 5: Ensure channels is an array before calling includes
            const channels = Array.isArray(notification.channels) ? notification.channels : [];
            if (channels.includes('in-app') && !notification.read && isAuthenticated) {
              // Fix 6: Safely convert _id to string
              const notifId = notification._id ? (typeof notification._id === 'string' ? notification._id : String(notification._id)) : '';
              const now = Date.now();
              const tooSoon = now - lastToastAtRef.current < 1000;
              const alreadyShown = displayedToastIdsRef.current.has(notifId);
              if (!tooSoon && !alreadyShown) {
                lastToastAtRef.current = now;
                displayedToastIdsRef.current.add(notifId);
              toast({
                title: notification.title,
                description: notification.message,
                action: notification.interactive && notification.actionType ? (
                  <button
                    onClick={() => {
                      // Fix 7: Safely convert _id to string
                      const notifId = notification._id ? (typeof notification._id === 'string' ? notification._id : String(notification._id)) : '';
                      handleNotificationAction(notifId, notification.actionType || '');
                    }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {notification.actionType === 'move_to_next_stage' ? 'Move to Next Stage' :
                     notification.actionType === 'review_job' ? 'Review Job' :
                     'View Details'}
                  </button>
                ) : undefined,
              });
              }
            }
          }
        } catch (error) {
          // Safely handle errors without stringifying Event objects
          if (error instanceof Error) {
            console.error('Error parsing SSE message:', error.message, error.stack);
          } else if (error && typeof error === 'object' && 'type' in error) {
            // Likely an Event object
            console.error('Error parsing SSE message: Event object received');
          } else {
            console.error('Error parsing SSE message:', String(error));
          }
        }
      };

      es.onerror = (event: Event) => {
        // EventSource onerror receives an Event object, not an Error
        // Safely handle it without converting to string which causes "[object Event]"
        // Check connection state to determine error type
        if (es.readyState === EventSource.CLOSED) {
          console.warn('SSE connection closed. Will attempt to reconnect...');
        } else if (es.readyState === EventSource.CONNECTING) {
          console.warn('SSE connection lost. Reconnecting...');
        } else {
          // Log Event object details safely without stringifying the Event
          try {
            const errorInfo = {
              type: event?.type || 'error',
              readyState: es.readyState,
              url: es.url,
              timestamp: event?.timeStamp || Date.now()
            };
            console.warn('SSE connection error. Reconnecting in 5 seconds...', errorInfo);
          } catch (e) {
            // Fallback: just log a simple message if we can't extract event details
            console.warn('SSE connection error. Reconnecting in 5 seconds...');
          }
        }

        // Close current connection before reconnecting
        es.close();

        // Only reconnect if still authenticated
        if (isAuthenticated) {
          setTimeout(() => {
            setupSSE();
          }, 5000);
        }
      };

      setEventSource(es);
    };

    setupSSE();

    // Cleanup on unmount or when authentication changes
    return () => {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    };
  }, [handleNotificationAction, filterExpiredNotifications, toast, isAuthenticated]); // Include isAuthenticated

  // Clear notifications when user logs out
  useEffect(() => {
    if (status === 'unauthenticated') {
      setNotifications([]);
      setIsLoading(false);
      // Close SSE connection if open
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
    }
  }, [status, eventSource]);

  // Initial fetch - only if authenticated
  useEffect(() => {
    // Wait for session to load before deciding whether to fetch
    if (status === 'loading') {
      return; // Don't fetch while session is loading
    }
    
    // Only fetch if authenticated and we haven't fetched yet (or user just logged in)
    if (isAuthenticated && (!hasFetchedRef.current || status === 'authenticated')) {
    fetchNotifications();
    } else if (!isAuthenticated) {
      // Reset on logout
      hasFetchedRef.current = false;
      setNotifications([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, status, fetchNotifications]);


  // Calculate unread count (only non-expired notifications)
  // Fix 8: Ensure notifications is an array before calling filter
  const unreadCount = Array.isArray(notifications) ? notifications.filter((n) => !n.read).length : 0;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        handleNotificationAction,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// Outer provider - provides a default context for routes that don't use notifications
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  // CRITICAL FIX: Always render NotificationProviderWithSession to ensure hooks are called consistently
  // The component itself handles SSR/client differences internally
  // Cannot conditionally return here - violates Rules of Hooks
  return <NotificationProviderWithSession>{children}</NotificationProviderWithSession>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
