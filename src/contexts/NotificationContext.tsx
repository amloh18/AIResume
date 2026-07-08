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
  setDrawerOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Component that provides notifications with session - only for non-admin routes
function NotificationProviderWithSession({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [progressEvents, setProgressEvents] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastKnownNotificationIdRef = useRef<string | null>(null);
  const hasShownBatchToastRef = useRef<boolean>(false); // Ref to track polling interval

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
  const fetchNotifications = useCallback(async (sinceId?: string) => {
    // Don't fetch if user is not authenticated or on a public route
    if (!isAuthenticated || isPublicRoute) {
      console.log('🔒 NotificationContext - Skipping fetch:', {
        reason: !isAuthenticated ? 'Not authenticated' : 'Public route',
        isAuthenticated,
        isPublicRoute
      });
      setNotifications([]);
      setIsLoading(false);
      hasFetchedRef.current = false;
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
      const url = sinceId ? `/api/notifications?since=${encodeURIComponent(sinceId)}` : '/api/notifications';
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            if (errorData.error && typeof errorData.error === 'object') {
              errorMessage = errorData.error.message || errorData.error.code || errorMessage;
            } else {
              errorMessage = errorData.error || errorData.message || errorMessage;
            }
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
      
      const unreadCount = filtered.filter((n: INotification) => !n.read).length;
      console.log(`📊 NotificationContext - Unread notifications: ${unreadCount}`);
      
      // When catching up via sinceId, append new notifications instead of replacing
      if (sinceId) {
        setNotifications(prev => {
          const existing = new Map(prev.map(n => {
            const id = n._id ? (typeof n._id === 'string' ? n._id : String(n._id)) : '';
            return [id, n];
          }));
          const merged = [...prev];
          filtered.forEach(n => {
            const id = n._id ? (typeof n._id === 'string' ? n._id : String(n._id)) : '';
            if (!existing.has(id)) {
              merged.unshift(n);
            }
          });
          return merged.slice(0, 200);
        });
      } else {
        setNotifications(filtered);
      }

      // Track newest notification id for SSE catch-up
      if (filtered.length > 0) {
        const newest = filtered.reduce((a: INotification, b: INotification) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return aTime > bTime ? a : b;
        });
        const newestId = newest._id ? (typeof newest._id === 'string' ? newest._id : String(newest._id)) : null;
        if (newestId) {
          lastKnownNotificationIdRef.current = newestId;
        }
      }
      
      // Batch unread toasts: if more than 3 unread, show a single summary toast instead of many
      if (unreadCount > 3 && !hasShownBatchToastRef.current) {
        hasShownBatchToastRef.current = true;
        toast({
          title: `${unreadCount} unread notifications`,
          description: 'Open the notification panel to view them all.',
        });
      } else if (unreadCount > 0 && unreadCount <= 3) {
        // For small counts, still show individual toasts but avoid requestAnimationFrame thrashing
        setTimeout(() => {
          filtered.forEach((notification: INotification) => {
            const notifId = notification._id ? (typeof notification._id === 'string' ? notification._id : String(notification._id)) : '';
            if (!notification.read && notifId && !displayedToastIdsRef.current.has(notifId)) {
              const channels = notification.channels || ['in-app'];
              if (channels.includes('in-app')) {
                showToastForNotification(notification);
              }
            }
          });
        }, 0);
      }
      } else {
        console.error('Notifications response is not JSON. Content-Type:', contentType);
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set empty array on error to prevent UI issues
      setNotifications([]);
      // Reset fetch flag on error so we can retry
      hasFetchedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [filterExpiredNotifications, toast, isAuthenticated]);

  // Periodic trigger checks (Stale jobs, engagement) - Run once on mount/auth
  useEffect(() => {
    if (isAuthenticated && !isPublicRoute && !hasFetchedRef.current) {
      // Run checks in background
      fetch('/api/notifications/check-triggers', { method: 'POST' }).catch(err =>
        console.error('Failed to run notification checks:', err)
      );
    }
  }, [isAuthenticated, isPublicRoute]);

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

      // Skip if batch toast was already shown for this notification set
      if (hasShownBatchToastRef.current) {
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
    
    // Only set up SSE if we're in the browser, user is authenticated, and not on a public route
    if (typeof window === 'undefined' || !isAuthenticated || isPublicRoute) {
      if (eventSource) {
        console.log('🔌 NotificationContext - Closing SSE (not authenticated/public)', {
          reason: typeof window === 'undefined' ? 'SSR' : isPublicRoute ? 'public route' : 'not authenticated',
          isAuthenticated,
          status,
          isPublicRoute,
          pathname
        });
        eventSource.close();
        setEventSource(null);
      } else if (isMounted) {
        console.warn('🚫 NotificationContext - SSE setup blocked:', {
          isWindow: typeof window !== 'undefined',
          isAuthenticated,
          status,
          pathname,
          isPublicRoute
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
        // Catch up on missed notifications since last known id
        const sinceId = lastKnownNotificationIdRef.current;
        if (sinceId && isAuthenticated) {
          console.log('🔌 NotificationContext - SSE connected, catching up since:', sinceId);
          fetch(`/api/notifications?since=${encodeURIComponent(sinceId)}`, { 
            cache: 'no-store'
          }).catch(err => 
            console.error('Notification SSE catch-up failed:', err)
          );
        }
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
              const notificationId = newNotification._id ? (typeof newNotification._id === 'string' ? newNotification._id : String(newNotification._id)) : '';
              if (notificationId) {
                lastKnownNotificationIdRef.current = notificationId;
              }
              setNotifications((prev) => {
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

    // Add a small delay to ensure critical dashboard data is loaded first
    const setupTimer = setTimeout(() => {
      console.log('⏰ NotificationContext - Setting up SSE after delay...');
      setupSSE();
    }, 1500);

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
        const pollFrequency = isSSEConnected ? 45000 : 5000; // Poll every 45s if SSE is active, every 5s if inactive

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
      if (isAuthenticated && !isPublicRoute) {
        // Always start polling as a fallback
        console.log('🔄 NotificationContext - Starting polling fallback', {
          isAuthenticated,
          status,
          pathname,
          isPublicRoute,
          hasEventSource: !!eventSourceRef.current
        });
        startPolling();
      } else {
        console.warn('🚫 NotificationContext - Cannot start polling', {
          isAuthenticated,
          status,
          pathname,
          isPublicRoute,
          isMounted,
          reason: !isAuthenticated ? 'not authenticated' : 'public route'
        });
      }
    }, 15000); // Start polling 15s after mount; drawer opens will trigger initial fetch sooner

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
      // Reset fetch flags when on public route or logout
      if (isPublicRoute || status === 'unauthenticated') {
        hasFetchedRef.current = false;
        hasShownBatchToastRef.current = false;
        lastKnownNotificationIdRef.current = null;
      }
    }
  }, [status, eventSource, isPublicRoute]);

  // Lazy-load notifications when the drawer opens instead of eager fetch on mount
  useEffect(() => {
    if (!drawerOpen) return;
    if (!isAuthenticated) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    // Reset batch toast flag when drawer opens so user sees fresh batch toast if still >3 unread
    hasShownBatchToastRef.current = false;

    const sinceId = lastKnownNotificationIdRef.current;
    fetchNotifications(sinceId || undefined);
  }, [drawerOpen, isAuthenticated, fetchNotifications]);

  // Clear batch toast flag when notifications change significantly
  useEffect(() => {
    if (notifications.length === 0) {
      hasShownBatchToastRef.current = false;
    }
  }, [notifications.length]);


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
        setDrawerOpen,
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
