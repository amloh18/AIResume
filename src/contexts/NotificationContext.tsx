'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import { INotification, NotificationType } from '@/models/Notification';
import {
  INITIAL_FETCH_TOAST_WINDOW_MS,
  TOAST_DEBOUNCE_MS,
  isInAppToastEligible,
  isRecentNotification,
  resolveToastGateState,
} from '@/contexts/utils/notificationToast';

interface NotificationContextType {
  notifications: INotification[];
  activities: any[];
  progressEvents: Map<string, any>;
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  handleNotificationAction: (notificationId: string, actionType: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  updateProgress: (id: string, progress: number, message?: string, type?: 'info' | 'progress') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Component that provides notifications with session - only for non-admin routes
function NotificationProviderWithSession({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [progressEvents, setProgressEvents] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  // ... rest remains same until SSE onmessage ...

  // Helper to update progress
  const updateProgress = useCallback((id: string, progress: number, message?: string, type: 'info' | 'progress' = 'progress') => {
    setProgressEvents(prev => {
      const next = new Map(prev);
      if (progress >= 100) {
        next.delete(id);
      } else {
        next.set(id, { id, progress, message, type, updatedAt: new Date() });
      }
      return next;
    });
  }, []);

  // ... (keep previous fetch and helper methods) ...

  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null); // Ref to track eventSource without causing re-renders
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // Track if we've already fetched to prevent duplicate calls
  const hasFetchedRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to track polling interval

  // Check if we're on admin route - skip session logic if so
  const isAdminRoute = pathname ? pathname.startsWith('/admin') : false;

  // Check if we're on a public route - notifications should not be shown on public routes
  const publicRoutes = [
    '/',
    '/sign-in',
    '/custom-signin',
    '/sign-up',
    '/sign-in',
    '/auth/verify-email',
    '/auth/error',
    '/auth/reset-password',
    '/ai-career-report',
    '/onboarding',
    '/onboarding-universal',
    '/privacy-policy',
    '/terms',
    '/cookie-policy',
    '/force-logout',
    '/features',
    '/templates',
  ];
  const isPublicRoute = pathname ? publicRoutes.some(route => pathname === route || pathname.startsWith(route)) : false;

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
  // Also check that we're not on a public route (like landing page)
  const isAuthenticated = isMounted &&
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

  // Fetch notifications from API - only for authenticated users
  const fetchNotifications = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!isAuthenticated) {
      console.log('🔒 NotificationContext - Skipping fetch: Not authenticated');
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
      console.log('📥 NotificationContext - Fetching notifications...');
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
      console.log(`✅ NotificationContext - Fetched ${data.notifications?.length || 0} notifications`);
      const filtered = filterExpiredNotifications(data.notifications || []);
      console.log(`🧹 NotificationContext - After expiration filter: ${filtered.length}`);
      
      // Log unread count for debugging
      const unreadCount = filtered.filter((n: INotification) => !n.read).length;
      console.log(`📊 NotificationContext - Unread notifications: ${unreadCount}`);
      
      // Set notifications - this will trigger the toast display effect
      setNotifications(filtered);
      
      // Manually trigger toast display for unread notifications IMMEDIATELY
      // This is a fallback when SSE isn't working - show toasts for all unread notifications
      if (unreadCount > 0) {
        console.log(`🔄 NotificationContext - Found ${unreadCount} unread notifications, showing toasts immediately`);
        // Use requestAnimationFrame to ensure DOM is ready, then show toasts
        requestAnimationFrame(() => {
          filtered.forEach((notification: INotification) => {
            const notifId = notification._id ? (typeof notification._id === 'string' ? notification._id : String(notification._id)) : '';
            if (!notification.read && notifId && !displayedToastIdsRef.current.has(notifId)) {
              // Check if notification has in-app channel (default to true if not set)
              const channels = notification.channels || ['in-app'];
              if (channels.includes('in-app')) {
                console.log('🍞 NotificationContext - Showing toast for unread notification from fetch:', {
                  id: notifId,
                  title: notification.title,
                  read: notification.read,
                  channels: notification.channels
                });
                // Show toast immediately
                showToastForNotification(notification);
              } else {
                console.log('⏭️ NotificationContext - Skipping toast (no in-app channel):', notification.title);
              }
            }
          });
        });
      }
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

  // Periodic trigger checks (Stale jobs, engagement) - Run once on mount/auth
  useEffect(() => {
    if (isAuthenticated && !hasFetchedRef.current) {
      // Run checks in background
      fetch('/api/notifications/check-triggers', { method: 'POST' }).catch(err =>
        console.error('Failed to run notification checks:', err)
      );
    }
  }, [isAuthenticated]);

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
  const displayedToastIdsRef = useRef<Map<string, number>>(new Map());
  const lastToastAtRef = useRef<number>(0);
  const initialToastHydrationRef = useRef<boolean>(false);

  const shouldShowToast = useCallback(
    (notification: INotification) => isInAppToastEligible(notification, isAuthenticated),
    [isAuthenticated]
  );

  const showToastForNotification = useCallback(
    (notification: INotification, allowReschedule: boolean = true) => {
      console.log('🔍 showToastForNotification called:', {
        id: notification._id,
        title: notification.title,
        read: notification.read,
        channels: notification.channels,
        isAuthenticated
      });
      
      if (!shouldShowToast(notification)) {
        console.warn('🚫 Toast suppressed: Not eligible', {
          id: notification._id,
          title: notification.title,
          read: notification.read,
          channels: notification.channels,
          isAuthenticated
        });
        return;
      }

      const notifId = notification._id
        ? typeof notification._id === 'string'
          ? notification._id
          : String(notification._id)
        : '';

      if (!notifId) {
        console.warn('🚫 Toast suppressed: No ID');
        return;
      }

      const now = Date.now();
      const lastShownAt = displayedToastIdsRef.current.get(notifId);
      const gateState = resolveToastGateState({
        now,
        lastToastAt: lastToastAtRef.current,
        lastShownAt,
      });

      console.log(`🚥 Toast gate state for ${notifId}:`, gateState);

      if (gateState === 'repeat-suppressed') {
        return;
      }

      if (gateState === 'debounce') {
        if (allowReschedule && typeof window !== 'undefined') {
          console.log(`⏱️ Rescheduling toast for ${notifId} due to debounce`);
          window.setTimeout(() => showToastForNotification(notification, false), TOAST_DEBOUNCE_MS);
        }
        return;
      }

      lastToastAtRef.current = now;
      displayedToastIdsRef.current.set(notifId, now);

      console.log(`🍞 Showing toast for: ${notification.title}`);

      toast({
        title: notification.title,
        description: notification.message,
        action:
          notification.interactive && (notification.actionType || notification.actionUrl) ? (
            <button
              onClick={() => {
                const safeId = notification._id
                  ? typeof notification._id === 'string'
                    ? notification._id
                    : String(notification._id)
                  : '';
                
                // If there's an actionType, handle it on backend
                if (safeId && notification.actionType) {
                  handleNotificationAction(safeId, notification.actionType);
                } else if (safeId) {
                  // If no actionType but we still have an actionUrl, just mark as read
                  markAsRead(safeId);
                }

                // Handle navigation if actionUrl exists
                if (notification.actionUrl) {
                  if (notification.actionUrl.startsWith('http://') || notification.actionUrl.startsWith('https://')) {
                    window.location.href = notification.actionUrl;
                  } else {
                    router.push(notification.actionUrl);
                  }
                }
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              {notification.actionType === 'move_to_next_stage'
                ? 'Move to Next Stage'
                : notification.actionType === 'review_job'
                  ? 'Review Job'
                  : notification.actionType === 'view_offer'
                    ? 'View Offer'
                    : notification.actionUrl
                      ? 'View Details'
                      : 'Take Action'}
            </button>
          ) : undefined,
      });
    },
    [toast, handleNotificationAction, shouldShowToast, markAsRead, router]
  );

  useEffect(() => {
    // Don't show toasts if not authenticated, on public routes, or if there are no notifications
    if (!isAuthenticated || isPublicRoute || !Array.isArray(notifications) || notifications.length === 0) {
      return;
    }

    const now = Date.now();
    const activeIds = new Set<string>();

    notifications.forEach((notification) => {
      const notifId = notification._id
        ? typeof notification._id === 'string'
          ? notification._id
          : String(notification._id)
        : '';

      if (notifId) {
        activeIds.add(notifId);
      }

      if (!shouldShowToast(notification) || !notifId) {
        return;
      }

      const alreadyShown = displayedToastIdsRef.current.has(notifId);
      if (alreadyShown) {
        return;
      }

      // Show toast for ALL unread notifications (not just recent ones)
      // This ensures users see notifications even if SSE isn't working or they refresh the page
      // Only skip if we've already shown this toast
      if (!notification.read) {
        console.log('🍞 NotificationContext - Showing toast for unread notification:', notification.title, {
          id: notifId,
          read: notification.read,
          createdAt: notification.createdAt
        });
        showToastForNotification(notification);
      } else {
        console.log('⏭️ NotificationContext - Skipping toast (already read):', notification.title);
      }
    });

    // Mark as hydrated after first run
    if (!initialToastHydrationRef.current) {
      initialToastHydrationRef.current = true;
    }

    // Clean up displayed toast IDs for notifications that no longer exist
    displayedToastIdsRef.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        displayedToastIdsRef.current.delete(id);
      }
    });
  }, [notifications, isAuthenticated, isPublicRoute, shouldShowToast, showToastForNotification]);

  // Set up Server-Sent Events for real-time notifications - only if authenticated
  useEffect(() => {
    // Debug authentication state
    console.log('🔍 NotificationContext - SSE setup check:', {
      isWindow: typeof window !== 'undefined',
      isAuthenticated,
      isMounted,
      status,
      hasSession: !!session?.user,
      pathname,
      isPublicRoute,
      isAdminRoute
    });
    
    // Only set up SSE if we're in the browser and user is authenticated
    if (typeof window === 'undefined' || !isAuthenticated) {
      // Close any existing connection if user is not authenticated
      if (eventSource) {
        console.log('🔌 NotificationContext - Closing SSE (not authenticated)', {
          reason: typeof window === 'undefined' ? 'SSR' : 'not authenticated',
          isAuthenticated,
          status
        });
        eventSource.close();
        setEventSource(null);
      } else {
        console.warn('🚫 NotificationContext - SSE setup blocked:', {
          isWindow: typeof window !== 'undefined',
          isAuthenticated,
          status,
          pathname
        });
      }
      return;
    }

    // Skip if already connected
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
      console.log('🔌 NotificationContext - SSE already connected, skipping setup');
      return;
    }

    const setupSSE = () => {
      // Close existing connection if any
      if (eventSource) {
        eventSource.close();
      }

      console.log('🔌 NotificationContext - Connecting to SSE stream...', {
        isAuthenticated,
        pathname,
        isPublicRoute,
        isAdminRoute
      });
      const es = new EventSource('/api/stream-notifications', { withCredentials: true });

      es.onopen = () => {
        console.log('🟢 NotificationContext - SSE Connection established successfully!');
      };

      es.onmessage = (event) => {
        try {
          console.log('📨 NotificationContext - SSE Message received raw:', event.data);
          const data = JSON.parse(event.data);
          
          // Handle different message types
          if (data.type === 'heartbeat') {
            if (process.env.NODE_ENV === 'development') {
              console.debug('💓 SSE heartbeat received');
            }
            return;
          }

          if (data.type === 'connected') {
            console.log('✅ SSE connection confirmed');
            return;
          }

          // Handle Notification
          if (data.type === 'notification') {
            console.log('🔔 NotificationContext - Received notification message type');
            const notification = data.notification;
            
            if (!notification || !notification._id) {
              console.warn('⚠️ NotificationContext - Invalid notification data');
              return;
            }

            const filtered = filterExpiredNotifications([notification]);
            if (filtered.length > 0) {
              const newNotification = filtered[0];
              setNotifications((prev) => {
                const notificationId = newNotification._id ? (typeof newNotification._id === 'string' ? newNotification._id : String(newNotification._id)) : '';
                const exists = prev.some((n) => {
                  const nId = n._id ? (typeof n._id === 'string' ? n._id : String(n._id)) : '';
                  return nId === notificationId;
                });
                if (exists) return prev;
                
                setTimeout(() => showToastForNotification(newNotification), 100);
                return [newNotification, ...prev];
              });
            }
            return;
          }

          // Handle Activity
          if (data.type === 'activity') {
            console.log('🏃 NotificationContext - Received activity message type');
            const activity = data.activity;
            if (activity) {
              setActivities(prev => {
                // Keep only unique activities, max 50
                const exists = prev.some(a => a.id === activity.id);
                if (exists) return prev;
                return [activity, ...prev].slice(0, 50);
              });
              
              // Optional: Show a subtle toast for activities if desired
              // toast({ title: 'New Activity', description: activity.message });
            }
            return;
          }

          // Handle Progress/Info
          if (data.type === 'progress' || data.type === 'info') {
            console.log(`📊 NotificationContext - Received ${data.type} message type`);
            const payload = data[data.type];
            if (payload && payload.id) {
              updateProgress(payload.id, payload.progress ?? 50, payload.message, data.type as 'info' | 'progress');
            }
            return;
          }

          console.log('⚠️ NotificationContext - Unknown message type:', data.type, data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      es.onerror = (event: Event) => {
        // EventSource onerror receives an Event object, not an Error
        // Check connection state to determine error type
        const isLocal = process.env.NODE_ENV === 'development';
        const reconnectDelay = isLocal ? 2000 : 5000; // Faster reconnection for local

        const readyStateText = es.readyState === EventSource.CONNECTING ? 'CONNECTING' : 
                              es.readyState === EventSource.OPEN ? 'OPEN' : 
                              es.readyState === EventSource.CLOSED ? 'CLOSED' : 'UNKNOWN';

        console.error('❌ SSE connection error:', {
          readyState: es.readyState,
          readyStateText,
          url: es.url,
          isAuthenticated,
          status
        });

        if (es.readyState === EventSource.CLOSED) {
          console.warn('🔌 SSE connection closed. Will attempt to reconnect...');
        } else if (es.readyState === EventSource.CONNECTING) {
          console.warn('🔄 SSE connection lost. Reconnecting...');
        } else {
          console.warn(`⚠️ SSE connection error (readyState: ${readyStateText}). Reconnecting in ${reconnectDelay / 1000} seconds...`);
        }

        // Close current connection before reconnecting
        es.close();
        setEventSource(null);

        // Only reconnect if still authenticated
        if (isAuthenticated) {
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect SSE...');
            setupSSE();
          }, reconnectDelay);
        } else {
          console.warn('🚫 Not reconnecting SSE - user not authenticated');
        }
      };

      setEventSource(es);
      eventSourceRef.current = es; // Update ref as well
    };

    // Add a small delay to ensure session is fully loaded
    const setupTimer = setTimeout(() => {
      console.log('⏰ NotificationContext - Setting up SSE after delay...');
      setupSSE();
    }, 500);

    // Fallback: Poll for new notifications when SSE isn't working
    // This ensures notifications appear even if SSE connection fails
    let lastPollTime = Date.now();
    
    const startPolling = () => {
      if (pollIntervalRef.current) {
        console.log('🔄 NotificationContext - Polling already active, skipping');
        return; // Already polling
      }
      
      console.log('🔄 NotificationContext - Starting fallback polling (runs in background)');
      pollIntervalRef.current = setInterval(async () => {
        const now = Date.now();
        // Check if SSE is connected
        const currentEventSource = eventSourceRef.current;
        const isSSEConnected = currentEventSource && currentEventSource.readyState === EventSource.OPEN;
        const pollFrequency = isSSEConnected ? 20000 : 5000; // Poll every 20s if SSE is active, every 5s if inactive

        if (now - lastPollTime >= pollFrequency) {
          lastPollTime = now;
          console.log(`🔄 NotificationContext - Polling for updates (SSE connected: ${!!isSSEConnected})`);
          await fetchNotifications();
        }
      }, 5000);
    };

    // Start polling immediately (don't wait for SSE)
    // This ensures notifications are fetched even if SSE never connects
    const pollTimer = setTimeout(() => {
      if (isAuthenticated) {
        // Always start polling as a fallback
        console.log('🔄 NotificationContext - Starting polling fallback', {
          isAuthenticated,
          status,
          pathname,
          hasEventSource: !!eventSourceRef.current
        });
        startPolling();
      } else {
        console.warn('🚫 NotificationContext - Cannot start polling (not authenticated)', {
          isAuthenticated,
          status,
          pathname,
          isMounted
        });
      }
    }, 2000); // Start polling 2 seconds after mount (even faster start)

    // Cleanup on unmount or when authentication changes
    return () => {
      clearTimeout(setupTimer);
      clearTimeout(pollTimer);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      const currentEventSource = eventSourceRef.current;
      if (currentEventSource) {
        console.log('🔌 NotificationContext - Cleaning up SSE connection');
        currentEventSource.close();
        setEventSource(null);
        eventSourceRef.current = null;
      }
    };
  }, [filterExpiredNotifications, isAuthenticated, status, fetchNotifications]); // Removed eventSource from dependencies to prevent re-render loops

  // Clear notifications when user logs out or navigates to public route
  useEffect(() => {
    if (status === 'unauthenticated' || isPublicRoute) {
      setNotifications([]);
      setIsLoading(false);
      // Close SSE connection if open
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      // Reset fetch flag when on public route
      if (isPublicRoute) {
        hasFetchedRef.current = false;
      }
    }
  }, [status, eventSource, isPublicRoute]);

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
        activities,
        progressEvents,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        handleNotificationAction,
        refreshNotifications,
        updateProgress,
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
