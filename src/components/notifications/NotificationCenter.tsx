// @ts-nocheck
'use client';

import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

type NotificationFilter = 'all' | 'unread';

export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isLoading,
  } = useNotifications();

  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [isOpen, setIsOpen] = useState(false);

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];
    
    let filtered = [...notifications];

    if (filter === 'unread') {
      filtered = filtered.filter((n) => !n.read);
    }

    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority] || 0;
      const bPriority = priorityOrder[b.priority] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [notifications, filter]);

  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'critical') {
      return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
    }
    
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-lime-600 dark:text-lime-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      application_tracker: 'Applications',
      ats_score: 'ATS Score',
      cv_document: 'Documents',
      analytics: 'Analytics',
      payment: 'Payment',
      system: 'System',
      account: 'Account',
    };
    return labels[category] || category;
  };

  const handleNotificationClick = async (notificationId: string, read: boolean, actionUrl?: string) => {
    if (!read) {
      await markAsRead(notificationId);
    }
    if (actionUrl) {
      window.location.href = actionUrl;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3a32]/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-lime-500 text-white dark:text-[#0a0f0c] text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 mt-2 w-[420px] max-h-[85vh] bg-white dark:bg-[#0a0f0c] rounded-2xl shadow-2xl z-[9999] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
                  Notifications
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1f2d25]/50 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-3 p-1 bg-gray-50 dark:bg-[#0a0f0c] rounded-xl border border-gray-100 dark:border-transparent">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    filter === 'all'
                      ? 'bg-white dark:bg-[#1f2d25] text-lime-600 dark:text-lime-400 shadow-sm dark:shadow-lg border border-gray-200 dark:border-transparent'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    filter === 'unread'
                      ? 'bg-white dark:bg-[#1f2d25] text-lime-600 dark:text-lime-400 shadow-sm dark:shadow-lg border border-gray-200 dark:border-transparent'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Unread {unreadCount > 0 && `(${unreadCount})`}
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1 px-3 pb-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-lime-500 border-t-transparent mb-4"></div>
                  <p className="text-sm">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-[#1f2d25]/50 flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-gray-400 dark:text-gray-600" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-gray-300 mb-1">No notifications</h3>
                  <p className="text-sm text-gray-500">
                    {filter === 'unread'
                      ? "You're all caught up!"
                      : "You'll see updates here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map((notification) => {
                    const notifId = typeof notification._id === 'string'
                      ? notification._id
                      : String(notification._id);

                    return (
                      <div
                        key={notifId}
                        onClick={() => handleNotificationClick(notifId, notification.read, notification.actionUrl)}
                        className={`group relative rounded-xl p-4 cursor-pointer transition-all ${
                          notification.read
                            ? 'bg-gray-50 dark:bg-[#1a2621]/40 hover:bg-gray-100 dark:hover:bg-[#1a2621]/70'
                            : 'bg-white dark:bg-[#1f2d25] hover:bg-gray-50 dark:hover:bg-[#243530] border border-gray-100 dark:border-transparent shadow-sm dark:shadow-none'
                        }`}
                      >
                        {/* Unread indicator dot */}
                        {!notification.read && (
                          <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-lime-500 dark:bg-lime-400 rounded-full shadow-lg shadow-lime-500/30 dark:shadow-lime-500/50"></div>
                        )}

                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type, notification.priority)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className={`text-sm font-medium mb-1.5 ${
                              notification.read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {notification.title}
                            </h4>
                            
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-2">
                              {notification.message}
                            </p>
                            
                            {/* Meta info */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              
                              {notification.category && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">
                                    {getCategoryLabel(notification.category)}
                                  </span>
                                </>
                              )}
                              
                              {notification.priority === 'critical' && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                                    URGENT
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Action button */}
                            {notification.interactive && notification.actionType && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (notification.actionUrl) {
                                    window.location.href = notification.actionUrl;
                                  }
                                }}
                                className="mt-3 px-4 py-2 text-xs font-medium text-lime-700 dark:text-lime-400 bg-lime-50 dark:bg-lime-500/10 hover:bg-lime-100 dark:hover:bg-lime-500/20 rounded-lg transition-all border border-lime-200 dark:border-lime-500/20 hover:border-lime-300 dark:hover:border-lime-500/30 capitalize"
                              >
                                {notification.actionType.replace(/_/g, ' ')}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Delete button (appears on hover) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notifId);
                          }}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#0f1612]/80 transition-all"
                          aria-label="Delete notification"
                        >
                          <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer - Mark all as read */}
            {unreadCount > 0 && filteredNotifications.length > 0 && (
              <div className="px-5 py-3 flex-shrink-0 bg-white dark:bg-[#0a0f0c] border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={markAllAsRead}
                  className="w-full px-4 py-2.5 text-sm font-medium text-lime-700 dark:text-lime-400 bg-lime-50 dark:bg-lime-500/10 hover:bg-lime-100 dark:hover:bg-lime-500/20 rounded-xl transition-all border border-lime-200 dark:border-lime-500/20 hover:border-lime-300 dark:hover:border-lime-500/30"
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
