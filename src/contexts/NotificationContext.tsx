'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  persistent?: boolean; // If true, notification stays until user action
  actionRequired?: boolean; // If true, requires user action to dismiss
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('cv-app-notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      } catch (error) {
        // Silently fail - localStorage might be unavailable
      }
    }
  }, []);

  // Auto-dismiss notifications based on type
  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    notifications.forEach((notification) => {
      // Skip auto-dismiss for persistent or action-required notifications
      if (notification.persistent || notification.actionRequired) {
        return;
      }

      // Determine timeout based on notification type
      let timeoutDuration: number;
      if (notification.type === 'error') {
        // Critical notifications (errors) - 4 seconds
        timeoutDuration = 4000;
      } else {
        // Normal notifications (success, info, warning) - 2 seconds
        timeoutDuration = 2000;
      }

      const timeout = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, timeoutDuration);

      timeouts.push(timeout);
    });

    // Cleanup timeouts on unmount or when notifications change
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [notifications]);

  // Cleanup old notifications periodically to prevent storage bloat
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setNotifications(prev => {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        // Remove notifications older than 1 day
        return prev.filter(notification => {
          const notificationDate = new Date(notification.timestamp);
          return notificationDate > oneDayAgo;
        });
      });
    }, 60 * 60 * 1000); // Run every hour

    return () => clearInterval(cleanupInterval);
  }, []);

  // Save notifications to localStorage with debouncing and error handling
  useEffect(() => {
    // Only save persistent notifications to localStorage to avoid quota issues
    const persistentNotifications = notifications.filter(n => n.persistent);
    
    try {
      if (persistentNotifications.length > 0) {
        localStorage.setItem('cv-app-notifications', JSON.stringify(persistentNotifications));
      } else {
        // Clear localStorage if no persistent notifications
        localStorage.removeItem('cv-app-notifications');
      }
    } catch (error) {
      // If localStorage is full, try to clear old notifications
      try {
        localStorage.removeItem('cv-app-notifications');
        if (persistentNotifications.length > 0) {
          localStorage.setItem('cv-app-notifications', JSON.stringify(persistentNotifications));
        }
      } catch (retryError) {
        // Silently fail - localStorage operations might be blocked
      }
    }
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false
    };

    setNotifications(prev => {
      // Keep only the most recent 50 notifications to prevent storage bloat
      const updated = [newNotification, ...prev].slice(0, 50);
      return updated;
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAllNotifications,
        unreadCount
      }}
    >
      {children}
      <NotificationDisplay />
    </NotificationContext.Provider>
  );
};

// Bottom-right notification display component
const NotificationDisplay: React.FC = () => {
  const { notifications, markAsRead, removeNotification } = useNotifications();
  const [notificationTimers, setNotificationTimers] = useState<Record<string, number>>({});

  // Update timers for each notification
  useEffect(() => {
    const interval = setInterval(() => {
      setNotificationTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (updated[id] > 0) {
            updated[id] = Math.max(0, updated[id] - 100);
          }
        });
        return updated;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Initialize timers for new notifications
  useEffect(() => {
    notifications.forEach(notification => {
      if (!notification.persistent && !notification.actionRequired) {
        const timeoutDuration = notification.type === 'error' ? 4000 : 2000;
        setNotificationTimers(prev => ({
          ...prev,
          [notification.id]: timeoutDuration
        }));
      }
    });
  }, [notifications]);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <AlertCircle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBorderColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-green-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <>

      {/* Toast Notifications - Bottom Right (for temporary messages) */}
      <div className="fixed bottom-4 right-4 z-40 space-y-2">
        <AnimatePresence>
          {notifications
            .filter(n => !n.persistent)
            .slice(0, 3) // Show max 3 toast notifications
            .map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: 300, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 300, scale: 0.8 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`min-w-80 max-w-md w-auto bg-white dark:bg-gray-800 border-l-4 shadow-lg rounded-lg p-4 ${getBorderColor(notification.type)}`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {notification.message}
                    </p>
                    
                    {/* Auto-dismiss progress bar */}
                    {!notification.persistent && !notification.actionRequired && (
                      <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div 
                          className={`h-1 rounded-full transition-all duration-100 ${
                            notification.type === 'error' 
                              ? 'bg-red-500' 
                              : notification.type === 'warning'
                              ? 'bg-yellow-500'
                              : notification.type === 'success'
                              ? 'bg-green-500'
                              : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${((notificationTimers[notification.id] || 0) / (notification.type === 'error' ? 4000 : 2000)) * 100}%`
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Action buttons for interactive notifications */}
                    {notification.actionRequired && notification.onAction && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => {
                            notification.onAction?.();
                            removeNotification(notification.id);
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          {notification.actionLabel || 'Yes'}
                        </button>
                        <button
                          onClick={() => removeNotification(notification.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0 flex">
                    <button
                      className="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </>
  );
};
