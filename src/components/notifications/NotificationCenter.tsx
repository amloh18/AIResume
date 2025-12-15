'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Bell, X, Check, CheckCheck, ExternalLink, Clock } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { INotification } from '@/models/Notification';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getRelativeTimeLabel } from '@/components/notifications/utils';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAdminRoute = pathname ? pathname.startsWith('/admin') : false;
  const isAuthenticated = status === 'authenticated' && !!session?.user;
  const { notifications, unreadCount, markAsRead, markAllAsRead, handleNotificationAction } = useNotifications();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔔 NotificationCenter - Rendered', {
        isAuthenticated,
        isAdminRoute,
        unreadCount,
        totalNotifications: notifications.length
      });
    }
  }, [isAuthenticated, isAdminRoute, unreadCount, notifications.length]);

  // Helper function to safely convert _id to string
  const getIdAsString = (id: any): string => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (typeof id === 'number') return String(id);
    // Safely check for toString method - ensure id is an object first
    if (typeof id === 'object' && id !== null && 'toString' in id && typeof id.toString === 'function') {
      try {
        return id.toString();
      } catch (error) {
        console.warn('Error calling toString on id:', error);
        return String(id);
      }
    }
    return String(id);
  };

  // Don't render notification center if user is not authenticated or on admin routes
  if (!isAuthenticated || isAdminRoute) {
    return null;
  }
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'read'>('unread');

  // Filter notifications based on tab
  // Note: We don't filter out notifications without _id here because they might still be valid
  // The getIdAsString helper will handle missing _id safely
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    return n.read;
  });

  // Separate persistent and time-sensitive
  // Handle cases where persistent might be undefined/null
  const persistentNotifications = filteredNotifications.filter((n) => n.persistent === true);
  const timeSensitiveNotifications = filteredNotifications.filter((n) => n.persistent !== true);

  // Debug: Log filtered notifications to help diagnose issues
  if (process.env.NODE_ENV === 'development' && filteredNotifications.length === 0 && unreadCount > 0) {
    console.log('Debug: No filtered notifications but unreadCount > 0', {
      totalNotifications: notifications.length,
      unreadCount,
      activeTab,
      notifications: notifications.map(n => ({
        _id: n._id,
        read: n.read,
        title: n.title
      }))
    });
  }

  const handleNotificationClick = async (notification: INotification) => {
    const notificationId = getIdAsString(notification._id);
    if (!notificationId) {
      console.error('Notification missing _id:', notification);
      return;
    }

    if (notification.interactive && notification.actionType) {
      await handleNotificationAction(notificationId, notification.actionType);
    } else {
      await markAsRead(notificationId);
    }
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_status_check':
        return '💼';
      case 'follow_up':
        return '📧';
      case 'deadline_approaching':
      case 'deadline_due_today':
      case 'deadline_missed':
        return '⏰';
      case 'membership_expiring':
      case 'membership_expired':
        return '⭐';
      case 'discount_offer':
        return '🎁';
      case 'achievement':
        return '🏆';
      case 'job_draft_created':
        return '📝';
      case 'job_stage_moved':
        return '🚀';
      case 'job_stale_alert':
        return '⚠️';
      case 'interview_prep_ready':
        return '🎯';
      case 'document_saved':
        return '💾';
      case 'feature_discovery':
        return '✨';
      case 'extension_download':
        return '🧩';
      case 'job_applied':
        return '✅';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222B22] transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-96 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#222B22] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4 rounded-t-2xl">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="tablet"
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    Mark all read
                  </Button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#141810] dark:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('unread')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === 'unread'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                Unread ({notifications.filter((n) => !n.read).length})
              </button>
              <button
                onClick={() => setActiveTab('read')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === 'read'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                Read ({notifications.filter((n) => n.read).length})
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto bg-white dark:bg-[#141810]">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No {activeTab} notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {/* Persistent notifications first */}
                  {persistentNotifications.map((notification, index) => {
                    const notificationId = getIdAsString(notification._id) || `persistent-${index}`;
                    return (
                      <NotificationItem
                        key={notificationId}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkRead={() => {
                          const id = getIdAsString(notification._id);
                          if (id) markAsRead(id);
                        }}
                        getIcon={getNotificationIcon}
                        getPriorityColor={getPriorityColor}
                      />
                    );
                  })}

                  {/* Time-sensitive notifications */}
                  {timeSensitiveNotifications.map((notification, index) => {
                    const notificationId = getIdAsString(notification._id) || `time-sensitive-${index}`;
                    return (
                      <NotificationItem
                        key={notificationId}
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkRead={() => {
                          const id = getIdAsString(notification._id);
                          if (id) markAsRead(id);
                        }}
                        getIcon={getNotificationIcon}
                        getPriorityColor={getPriorityColor}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: INotification;
  onClick: () => void;
  onMarkRead: () => void;
  getIcon: (type: string) => string;
  getPriorityColor: (priority: string) => string;
}

function NotificationItem({
  notification,
  onClick,
  onMarkRead,
  getIcon,
  getPriorityColor,
}: NotificationItemProps) {
  return (
    <div
      className={cn(
        'p-4 hover:bg-gray-50 dark:hover:bg-[#222B22] transition-colors cursor-pointer',
        !notification.read && 'bg-blue-50 dark:bg-blue-900/20'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-2xl">{getIcon(notification.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{notification.title}</h4>
                {notification.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                )}
                {notification.persistent && (
                  <Badge variant="outline" className="text-xs">Persistent</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getRelativeTimeLabel(notification.createdAt)}
                </span>
                {notification.expiresAt && !notification.persistent && (() => {
                  try {
                    const expiresAt = new Date(notification.expiresAt);
                    if (isNaN(expiresAt.getTime())) {
                      console.warn('Invalid expiresAt date:', notification.expiresAt);
                      return null;
                    }
                    return (
                      <span className="text-orange-600 dark:text-orange-400">
                        Expires {formatDistanceToNow(expiresAt, { addSuffix: true })}
                      </span>
                    );
                  } catch (error) {
                    console.error('Error formatting expiresAt:', error, notification);
                    return null;
                  }
                })()}
              </div>
              {notification.interactive && notification.actionType && (
                <div className="mt-2">
                  <Button
                    size="tablet"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                    className="text-xs"
                  >
                    {notification.actionType === 'move_to_next_stage' ? 'Move to Next Stage' :
                      notification.actionType === 'review_job' ? 'Review Job' :
                        'View Details'}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
            {!notification.read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead();
                }}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-[#222B22]"
                aria-label="Mark as read"
              >
                <Check className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

