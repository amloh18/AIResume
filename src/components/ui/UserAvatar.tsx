'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  Settings, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  Check,
  Sun,
  Moon,
  User
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserAvatarProps {
  user: {
    name: string;
    email: string;
    profilePhoto?: string;
    isEmailVerified?: boolean;
    subscription?: {
      planName: string;
      status: string;
    };
  };
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Get user initials from name
  const getUserInitials = (name: string) => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
      setIsClosing(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  };

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSettingsClick = () => {
    router.push('/dashboard/settings');
    handleClose();
  };

  const handleBillingClick = () => {
    router.push('/dashboard/settings?tab=billing');
    handleClose();
  };

  const handleHelpClick = () => {
    router.push('/dashboard/settings?tab=help');
    handleClose();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Avatar Button */}
      <motion.button
        ref={triggerRef}
        onClick={handleToggle}
        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group"
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="w-8 h-8 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md group-hover:shadow-lg transition-shadow duration-200">
          {user.profilePhoto ? (
            <img 
              src={user.profilePhoto} 
              alt={user.name || 'User'}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            getUserInitials(user.name)
          )}
        </div>
        <ChevronDown 
          size={14} 
          className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      {/* Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-[9999999]"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            <div className="p-6">
              {/* User Info Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                  {user.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={user.name || 'User'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getUserInitials(user.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {user.name || 'User'}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {user.email}
                    </span>
                    {user.isEmailVerified && (
                      <div className="flex-shrink-0 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Toggle */}
              <div className="mb-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? (
                      <Moon size={18} className="text-gray-600 dark:text-gray-300" />
                    ) : (
                      <Sun size={18} className="text-gray-600 dark:text-gray-300" />
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="relative w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full transition-colors duration-200"
                  >
                    <motion.div
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                      animate={{ x: theme === 'dark' ? 26 : 2 }}
                      transition={{ duration: 0.2 }}
                    />
                  </button>
                </div>
              </div>

              {/* Action Icons Row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <motion.button
                  onClick={handleSettingsClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Settings size={20} className="text-gray-600 dark:text-gray-300" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Settings</span>
                </motion.button>

                <motion.button
                  onClick={handleBillingClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <CreditCard size={20} className="text-gray-600 dark:text-gray-300" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Billing</span>
                </motion.button>

                <motion.button
                  onClick={handleHelpClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <HelpCircle size={20} className="text-gray-600 dark:text-gray-300" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">Help</span>
                </motion.button>
              </div>

              {/* Sign Out Button */}
              <motion.button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 p-2 text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut size={14} />
                <span className="text-sm font-medium">Sign Out</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserAvatar;
