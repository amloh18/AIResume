'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    try {
      console.log('🔍 Starting logout process...');
      
      // Clear localStorage
      localStorage.removeItem('user');
      console.log('✅ Cleared localStorage');
      
      // Clear sessionStorage
      sessionStorage.clear();
      console.log('✅ Cleared sessionStorage');
      
      // Check if user is from Firebase (has user data in localStorage)
      const userData = localStorage.getItem('user');
      if (userData) {
        console.log('🔍 Firebase user detected, signing out from Firebase...');
        // Firebase user - sign out from Firebase
        try {
          const { signOut: signOutFirebase } = await import('firebase/auth');
          const { auth } = await import('@/lib/firebase');
          await signOutFirebase(auth);
          console.log('✅ Signed out from Firebase');
        } catch (error) {
          console.error('❌ Error signing out from Firebase:', error);
        }
      }
      
      // Sign out from NextAuth
      console.log('🔍 Signing out from NextAuth...');
      await signOut({ callbackUrl: '/' });
      console.log('✅ Signed out from NextAuth');
      
      // Force page reload to ensure all state is cleared
      window.location.href = '/';
      
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Fallback - clear storage and redirect
      localStorage.removeItem('user');
      sessionStorage.clear();
      window.location.href = '/';
    }
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


  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dialogRef}
      className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl min-w-[280px]"
      style={{ 
        zIndex: 99999, 
        ...getDialogPosition()
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
                  <Moon className="h-3 w-3 text-gray-600" />
                ) : (
                  <Sun className="h-3 w-3 text-yellow-500" />
                )}
              </motion.div>
            </motion.button>
          </div>
        </div>

        {/* Profile */}
        <button
          onClick={() => {
            router.push('/dashboard/profile');
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => {
            router.push('/dashboard/settings');
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default UserProfileDialog;
