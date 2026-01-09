'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell, X, Check, CheckCheck, ExternalLink, Clock,
  FileText, TrendingUp, AlertCircle, CheckCircle2,
  Briefcase, PartyPopper, Calendar, MessageSquare,
  Trophy, ShieldAlert, CreditCard, MessageCircle
} from 'lucide-react';
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
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // Filter notifications based on tab
  // Note: We don't filter out notifications without _id here because they might still be valid
  // The getIdAsString helper will handle missing _id safely
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    return true; // Show all
  });



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

    // Handle deep linking
    if (notification.actionData?.url || notification.metadata?.url) {
      const url = notification.actionData?.url || notification.metadata?.url;
      if (url) {
        // If it's an external URL, open in new tab
        if (url.startsWith('http')) {
          window.open(url, '_blank');
        } else {
          router.push(url);
        }
      }
    }

    if (notification.interactive && notification.actionType) {
      await handleNotificationAction(notificationId, notification.actionType);
    } else {
      await markAsRead(notificationId);
    }
    setIsOpen(false);
  };

  /* 
   * Updated to use Lucide icons instead of emojis for a more premium look.
   * Returns a ReactNode (Icon component) instead of string.
   */
  const getNotificationConfig = (type: string) => {
    // Default config
    let icon = Bell;
    let colorClass = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    let badgeIcon = undefined;

    // CV & Cover Letter
    if (type.startsWith('cv_') || type.includes('document')) {
      icon = FileText;
      colorClass = "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400";

      if (type === 'cv_ats_score_jump') {
        icon = TrendingUp;
        colorClass = "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400";
      } else if (type.includes('mismatch') || type.includes('gap') || type.includes('conflict')) {
        badgeIcon = AlertCircle;
        colorClass = "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400";
      } else if (type.includes('ready') || type.includes('saved')) {
        badgeIcon = CheckCircle2;
      }
    }

    // Job Tracker
    else if (type.startsWith('job_')) {
      icon = Briefcase;
      colorClass = "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400";

      if (type.includes('offer')) {
        icon = PartyPopper;
        colorClass = "bg-lime-100 text-lime-600 dark:bg-lime-900/40 dark:text-lime-400";
      } else if (type.includes('rejection')) {
        colorClass = "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400";
      } else if (type.includes('interview')) {
        icon = Calendar;
        colorClass = "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400";
      }
    }

    // Interviews (Specific)
    else if (type.startsWith('interview_')) {
      icon = Calendar;
      colorClass = "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400";

      if (type.includes('cancelled')) {
        colorClass = "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400";
      } else if (type.includes('feedback')) {
        icon = MessageSquare;
      }
    }

    // System / Account
    else if (type === 'account_milestone' || type === 'achievement') {
      icon = Trophy;
      colorClass = "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400";
    }
    else if (type.includes('security')) {
      icon = ShieldAlert;
      colorClass = "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400";
    }
    else if (type.includes('subscription') || type.includes('payment')) {
      icon = CreditCard;
      if (type.includes('success')) {
        colorClass = "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400";
      } else if (type.includes('failed')) {
        colorClass = "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400";
      }
    }
    else if (type.includes('message')) {
      icon = MessageCircle;
      colorClass = "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400";
    }

    return { Icon: icon, colorClass, Badge: badgeIcon };
  };



  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222B22] transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white dark:ring-[#141810]" />
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/5 backdrop-blur-[1px] transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-12 z-50 w-[420px] rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1A1F1A] shadow-2xl overflow-hidden ring-1 ring-black/5">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-white dark:bg-[#1A1F1A]">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Notifications</h3>

              <div className="flex bg-gray-100 dark:bg-white/5 rounded-full p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                    activeTab === 'all'
                      ? 'bg-white dark:bg-[#2C322C] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('unread')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                    activeTab === 'unread'
                      ? 'bg-white dark:bg-[#2C322C] text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  )}
                >
                  Unread
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[500px] overflow-y-auto bg-white dark:bg-[#1A1F1A]">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-full mb-4">
                    <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">No notifications</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">We'll let you know when something arrives.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredNotifications.map((notification, index) => {
                    const notificationId = getIdAsString(notification._id) || `note-${index}`;
                    const config = getNotificationConfig(notification.type);

                    return (
                      <NotificationItem
                        key={notificationId}
                        notification={notification}
                        config={config}
                        onClick={() => handleNotificationClick(notification)}
                        onMarkRead={() => {
                          const id = getIdAsString(notification._id);
                          if (id) markAsRead(id);
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer actions */}
            {unreadCount > 0 && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex justify-end">
                <Button
                  variant="ghost"
                  size="tablet"
                  onClick={markAllAsRead}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white text-xs h-8"
                >
                  Mark all as read
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: INotification;
  config: { Icon: any; colorClass: string; Badge?: any };
  onClick: () => void;
  onMarkRead: () => void;
}

function NotificationItem({
  notification,
  config,
  onClick,
  onMarkRead,
}: NotificationItemProps) {
  const { Icon, colorClass, Badge: BadgeIcon } = config;

  return (
    <div
      className={cn(
        'group relative flex gap-4 p-5 transition-all hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer',
        !notification.read ? 'bg-white dark:bg-[#1A1F1A]' : 'opacity-70 bg-gray-50/50 dark:bg-black/20'
      )}
      onClick={onClick}
    >
      {/* Visual Avatar */}
      <div className="flex-shrink-0 pt-1">
        <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-full", colorClass)}>
          <Icon className="h-5 w-5" />
          {BadgeIcon && (
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-[#2C322C] ring-2 ring-white dark:ring-[#1A1F1A]">
              <BadgeIcon className="h-3 w-3 text-current" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-0.5">
          <h4 className={cn("text-sm font-semibold text-gray-900 dark:text-white leading-tight", !notification.read && "font-bold")}>
            {notification.title}
          </h4>
          {/* Unread Indicator */}
          {!notification.read && (
            <div className="flex-shrink-0 h-2 w-2 rounded-full bg-green-500 mt-1.5 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          )}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-2">
          {notification.message}
        </p>

        {/* Action Buttons (Mockup style + functional) */}
        {notification.interactive && notification.actionType && (
          <div className="flex gap-2 mt-3">
            <Button
              size="tablet"
              variant="default"
              className="h-8 rounded-lg px-4 text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              {notification.actionType === 'move_to_next_stage' ? 'Accept' : 'View Details'}
            </Button>
            <Button
              size="tablet"
              variant="outline"
              className="h-8 rounded-lg px-4 text-xs font-medium border-gray-200 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-white/5"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Time - Bottom */}
        <div className="flex items-center gap-1 mt-1">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            {getRelativeTimeLabel(notification.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

