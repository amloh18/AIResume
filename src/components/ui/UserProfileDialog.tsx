'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { 
  User, 
  Settings, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown,
  Mail,
  Briefcase
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface UserProfileDialogProps {
  user: {
    name: string;
    email: string;
    username?: string;
    profilePhoto?: string;
    designation?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const UserProfileDialog: React.FC<UserProfileDialogProps> = ({
  user,
  isOpen,
  onClose,
  triggerRef
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose, triggerRef]);

  const handleLogout = async () => {
    // Clear localStorage
    localStorage.removeItem('user');
    // Clear sessionStorage
    sessionStorage.clear();
    // Sign out from NextAuth
    await signOut({ 
      redirect: true,
      callbackUrl: '/'
    });
  };

  const handleSettings = () => {
    onClose();
    router.push('/dashboard/settings');
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate position based on trigger button
  const getDialogPosition = () => {
    if (!triggerRef.current) return { top: '60px', right: '20px' };
    
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      top: `${rect.bottom + 8}px`,
      right: `${window.innerWidth - rect.right}px`
    };
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          
          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl min-w-[280px]"
            style={getDialogPosition()}
            initial={{ 
              opacity: 0, 
              scale: 0.95, 
              y: -10 
            }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0 
            }}
            exit={{ 
              opacity: 0, 
              scale: 0.95, 
              y: -10 
            }}
            transition={{ 
              duration: 0.2, 
              ease: [0.4, 0, 0.2, 1] 
            }}
          >
            {/* Profile Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-lime-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg">
                  {user.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getUserInitials(user.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {user.name}
                  </h3>
                  {user.designation && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                      <Briefcase size={12} />
                      <span className="truncate">{user.designation}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Mail size={12} />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Theme Toggle */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Theme
                  </span>
                  <motion.button
                    onClick={toggleTheme}
                    className="relative w-12 h-6 bg-gray-200 dark:bg-gray-600 rounded-full p-1 transition-colors duration-200"
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className="w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center"
                      animate={{ 
                        x: theme === 'dark' ? 24 : 0 
                      }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 500, 
                        damping: 30 
                      }}
                    >
                      {theme === 'dark' ? (
                        <Moon size={10} className="text-gray-600" />
                      ) : (
                        <Sun size={10} className="text-yellow-500" />
                      )}
                    </motion.div>
                  </motion.button>
                </div>
              </div>

              {/* Settings */}
              <motion.button
                onClick={handleSettings}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings size={16} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium">Settings</span>
              </motion.button>

              {/* Logout */}
              <motion.button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-150"
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut size={16} />
                <span className="text-sm font-medium">Sign Out</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UserProfileDialog;
