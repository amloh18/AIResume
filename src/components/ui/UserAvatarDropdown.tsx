'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { 
  User, 
  Settings, 
  LogOut, 
  Crown,
  Mail,
  Sun,
  Moon
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { comprehensiveSignOut } from '@/lib/utils/signout';

interface UserAvatarDropdownProps {
  user: {
    name: string;
    email: string;
    profilePhoto?: string | null;
    isEmailVerified?: boolean;
    subscription?: {
      planName: string;
      status: string;
    };
  };
}

const UserAvatarDropdown: React.FC<UserAvatarDropdownProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    await comprehensiveSignOut();
  };

  const handleProfileClick = () => {
    setIsOpen(false);
    router.push('/dashboard/settings?tab=account');
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    router.push('/dashboard/settings');
  };

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const getPlanColor = (planName: string | undefined) => {
    if (!planName) return 'text-gray-600 dark:text-gray-400';
    const plan = planName.toLowerCase();
    if (plan.includes('pro') || plan.includes('premium')) return 'text-purple-600 dark:text-purple-400';
    if (plan.includes('basic')) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none focus:ring-2 focus:ring-lime-500 rounded-full"
      >
        <UserAvatar
          src={user.profilePhoto}
          name={user.name}
          size="md"
          className="cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all"
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          >
            {/* User Info Section */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-lime-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-start gap-3">
                <UserAvatar
                  src={user.profilePhoto}
                  name={user.name}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {user.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Mail className="h-3 w-3 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      {user.email}
                    </p>
                  </div>
                  
                </div>
              </div>

            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={handleProfileClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  View Profile
                </span>
              </button>

              <button
                onClick={handleSettingsClick}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Settings
                </span>
              </button>

              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Theme
                  </span>
                </div>
                <button
                  onClick={handleThemeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 ${
                    theme === 'dark' 
                      ? 'bg-lime-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Sign Out */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left rounded-lg"
              >
                <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Sign Out
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserAvatarDropdown;

