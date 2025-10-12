'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Sun, Moon, CheckCircle, AlertCircle, AlertTriangle, X, Check, Menu } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import UserAvatar from '@/components/ui/UserAvatar';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface PageHeaderProps {
  title: string;
  description: string;
  user: {
    name: string;
    email: string;
    username?: string;
    profilePhoto?: string;
    designation?: string;
  };
  showSettings?: boolean;
  notifications?: Notification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onRemoveNotification?: (id: string) => void;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  user, 
  showSettings = true,
  notifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onRemoveNotification,
  onMobileMenuToggle,
  isMobileMenuOpen = false
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [showNotificationDropdown, setShowNotificationDropdown] = React.useState(false);

  return (
    <div className="mb-3">
      {/* Desktop Layout */}
      <div className="hidden xl:flex items-center justify-between py-6">
        {/* Title and Description */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-base text-gray-600 dark:text-white/60 mt-2">{description}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button 
              aria-label="Notifications" 
              className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
            >
              <Bell size={18} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>
            
            {/* Notification Dropdown */}
            <AnimatePresence>
              {showNotificationDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                >
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      {notifications.filter(n => !n.read).length > 0 && (
                        <button
                          onClick={() => onMarkAllAsRead?.()}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No notifications
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                            !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => onMarkAsRead?.(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {notification.type === 'success' && (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              )}
                              {notification.type === 'error' && (
                                <AlertCircle className="h-5 w-5 text-red-500" />
                              )}
                              {notification.type === 'warning' && (
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                              )}
                              {notification.type === 'info' && (
                                <Bell className="h-5 w-5 text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                  {notification.title}
                                </h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveNotification?.(notification.id);
                                  }}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* User Avatar */}
          <UserAvatar 
            user={{
              name: user?.name || 'User',
              email: user?.email || '',
              profilePhoto: user?.profilePhoto,
              isEmailVerified: user?.isEmailVerified || false,
              subscription: user?.subscription || {
                planName: 'Free Plan',
                status: 'active'
              }
            }}
          />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="xl:hidden py-6">
        <div className="flex items-center justify-between">
          {/* Hamburger Menu */}
          <button
            onClick={onMobileMenuToggle}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Title and Description - Offset towards hamburger */}
          <div className="flex-1 ml-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-base text-gray-600 dark:text-white/60 mt-2">{description}</p>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button 
                aria-label="Notifications" 
                className="relative p-2 text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors"
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              >
                <Bell size={18} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              <AnimatePresence>
                {showNotificationDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <button
                            onClick={() => onMarkAllAsRead?.()}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                              !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                            }`}
                            onClick={() => onMarkAsRead?.(notification.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                {notification.type === 'success' && (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                                {notification.type === 'error' && (
                                  <AlertCircle className="h-5 w-5 text-red-500" />
                                )}
                                {notification.type === 'warning' && (
                                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                )}
                                {notification.type === 'info' && (
                                  <Bell className="h-5 w-5 text-blue-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                    {notification.title}
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRemoveNotification?.(notification.id);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {notification.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* User Avatar */}
            <UserAvatar 
              user={{
                name: user?.name || 'User',
                email: user?.email || '',
                profilePhoto: user?.profilePhoto,
                isEmailVerified: user?.isEmailVerified || false,
                subscription: user?.subscription || {
                  planName: 'Free Plan',
                  status: 'active'
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
