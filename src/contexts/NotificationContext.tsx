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
  const pathname = usePathname();
  
  // Check if we're on admin route - skip session logic if so
  const isAdminRoute = pathname ? pathname.startsWith('/admin') : false;
  
  // Use useSession - this component must be rendered inside SessionProvider
  const { data: session, status } = useSession();
  const isAuthenticated = !isAdminRoute && status === 'authenticated' && !!session?.user;

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
      return;
    }

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
        throw new Error(`Failed to fetch notifications: ${errorMessage}`);
      }
      const data = await response.json();
      const filtered = filterExpiredNotifications(data.notifications || []);
      setNotifications(filtered);
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
      
      setNotifications((prev) =>
        (prev.map((notif) =>
          (notif._id as any).toString() === notificationId
            ? { ...notif, read: true, readAt: new Date() as any }
            : notif
        ) as unknown as INotification[])
      );
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
      
      setNotifications((prev) =>
        (prev.map((notif) => ({ ...notif, read: true, readAt: new Date() as any })) as unknown as INotification[])
      );
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
              // Check if notification already exists (avoid duplicates)
              const exists = prev.some((n) => (n._id as any).toString() === (notification._id as any).toString());
              if (exists) return prev;

              // Add new notification at the beginning
              return filterExpiredNotifications([notification, ...prev]);
            });

            // Show toast for in-app notifications (only if authenticated)
            if (notification.channels && notification.channels.includes('in-app') && !notification.read && isAuthenticated) {
              const notifId = (notification._id as any).toString?.() || String(notification._id);
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
                    onClick={() => handleNotificationAction((notification._id as any).toString(), notification.actionType!)}
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
          console.error('Error parsing SSE message:', error);
        }
      };

      es.onerror = (error) => {
        // EventSource onerror can fire with empty object or no details
        // Check connection state to determine error type
        if (es.readyState === EventSource.CLOSED) {
          console.warn('SSE connection closed. Will attempt to reconnect...');
        } else if (es.readyState === EventSource.CONNECTING) {
          console.warn('SSE connection lost. Reconnecting...');
        } else {
          // Log Event object details instead of the object itself
          if (error && typeof error === 'object' && error instanceof Event) {
            console.error('SSE error event:', {
              type: error.type,
              target: error.target,
              readyState: es.readyState,
              url: es.url
            });
          } else if (error && typeof error === 'object' && Object.keys(error).length > 0) {
            console.error('SSE error:', error);
          } else {
            // Empty error object is common with EventSource - just log a warning
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
    
    fetchNotifications();
  }, [fetchNotifications, status]);


  // Calculate unread count (only non-expired notifications)
  const unreadCount = notifications.filter((n) => !n.read).length;

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
  // Always render NotificationProviderWithSession
  // It will handle session availability internally
  return <NotificationProviderWithSession>{children}</NotificationProviderWithSession>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
