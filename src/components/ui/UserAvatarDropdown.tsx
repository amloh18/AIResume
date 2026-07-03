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
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Briefcase
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
    b2b?: {
      tenantId: string | any;
      role: string;
    };
  };
  openUpward?: boolean;
  iconOnly?: boolean;
}

const UserAvatarDropdown: React.FC<UserAvatarDropdownProps> = ({ user, openUpward = false, iconOnly = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ right?: string; left?: string; transform?: string }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  // Calculate menu position to keep it within viewport
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return;

    const calculatePosition = () => {
      // Use requestAnimationFrame to ensure menu is rendered
      requestAnimationFrame(() => {
        if (!dropdownRef.current) return;
        
        const dropdownRect = dropdownRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const menuWidth = 288; // w-72 = 18rem = 288px

        let position: { right?: string; left?: string; transform?: string } = {};

        if (iconOnly) {
          // For iconOnly mode, check if menu would overflow on the right
          const spaceOnRight = viewportWidth - dropdownRect.right;
          
          if (spaceOnRight < menuWidth + 8) {
            // Not enough space on right, position on left
            position.right = '0';
            position.left = 'auto';
          } else {
            // Enough space on right, use default
            position.left = '100%';
            position.right = 'auto';
          }
        } else if (openUpward) {
          // For openUpward mode, center it but adjust if near edges
          const centerX = dropdownRect.left + dropdownRect.width / 2;
          const menuHalfWidth = menuWidth / 2;
          
          if (centerX - menuHalfWidth < 8) {
            // Too close to left edge
            position.left = '0';
            position.transform = 'none';
          } else if (centerX + menuHalfWidth > viewportWidth - 8) {
            // Too close to right edge
            position.right = '0';
            position.transform = 'none';
          } else {
            // Center it
            position.left = '50%';
            position.transform = 'translateX(-50%)';
          }
        } else {
          // Default downward mode, check if menu would overflow on the right
          const spaceOnRight = viewportWidth - dropdownRect.left;
          
          if (spaceOnRight < menuWidth) {
            // Not enough space on right, align to right edge
            position.right = '0';
            position.left = 'auto';
          } else {
            // Enough space, use default left alignment
            position.left = '0';
            position.right = 'auto';
          }
        }

        setMenuPosition(position);
      });
    };

    // Calculate position when menu opens (with small delay to ensure render)
    const timeoutId = setTimeout(calculatePosition, 0);

    // Recalculate on window resize
    window.addEventListener('resize', calculatePosition);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isOpen, openUpward, iconOnly]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    let isClickInside = false;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      // Mark as inside if clicking on dropdown container or menu
      if (dropdownRef.current?.contains(target) || menuRef.current?.contains(target)) {
        isClickInside = true;
      } else {
        const element = target as Element;
        if (element?.closest?.('[data-dropdown-content]')) {
          isClickInside = true;
        }
      }
    };

    const handleClick = (event: MouseEvent) => {
      // If the mousedown was inside, don't close
      if (isClickInside) {
        isClickInside = false; // Reset for next interaction
        return;
      }

      const target = event.target as Node;
      // Double check - if click is inside, don't close
      if (dropdownRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      const element = target as Element;
      if (element?.closest?.('[data-dropdown-content]')) {
        return;
      }

      // Only close if truly outside
      setIsOpen(false);
      isClickInside = false; // Reset
    };

    // Track mousedown to know if click started inside
    document.addEventListener('mousedown', handleMouseDown);
    // Use click for the actual close logic
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('click', handleClick);
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
    <div className="relative overflow-visible" ref={dropdownRef}>
      {/* Avatar Button - Show full user info for sidebar, or just avatar for header */}
      {!iconOnly && openUpward ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="w-full focus:outline-none rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            <UserAvatar
              src={user.profilePhoto}
              name={user.name}
              size="md"
              className="cursor-pointer transition-all"
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-small font-medium text-gray-900 dark:text-white truncate">
                {user.name}
              </div>
              <div className="text-small text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </div>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
            >
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </motion.div>
          </div>
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="focus:outline-none focus:ring-2 focus:ring-lime-500 rounded-full"
        >
          <UserAvatar
            src={user.profilePhoto}
            name={user.name}
            size="md"
            className="cursor-pointer hover:ring-2 hover:ring-lime-500 transition-all"
          />
        </button>
      )}

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: (openUpward && !iconOnly) ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: (openUpward && !iconOnly) ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute ${
              iconOnly 
                ? '-top-52 ml-2' 
                : openUpward 
                  ? 'bottom-full mb-2' 
                  : 'top-full mt-2'
            } w-72 bg-white dark:bg-[#141810] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 z-[100] overflow-hidden pointer-events-auto`}
            style={{
              left: menuPosition.left,
              right: menuPosition.right,
              transform: menuPosition.transform,
            }}
            data-dropdown-content
            onClick={(e) => e.stopPropagation()}
          >
            {/* Menu Items */}
            <div className="py-2" data-dropdown-content>
              <button
                data-dropdown-content
                onClick={(e) => {
                  e.stopPropagation();
                  handleProfileClick();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
              >
                <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-small text-gray-700 dark:text-gray-300">
                  View Profile
                </span>
              </button>

              <button
                data-dropdown-content
                onClick={(e) => {
                  e.stopPropagation();
                  handleSettingsClick();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
              >
                <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-small text-gray-700 dark:text-gray-300">
                  Settings
                </span>
              </button>

              {user?.b2b?.tenantId && (
                <button
                  data-dropdown-content
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                    router.push('/b2b/dashboard');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left cursor-pointer"
                >
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="text-small text-gray-700 dark:text-gray-300">
                    HR Dashboard
                  </span>
                </button>
              )}

              <div className="flex items-center justify-between px-4 py-2.5" data-dropdown-content>
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                  <span className="text-small text-gray-700 dark:text-gray-300">
                    Theme
                  </span>
                </div>
                <button
                  data-dropdown-content
                  onClick={(e) => {
                    e.stopPropagation();
                    handleThemeToggle();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 cursor-pointer ${
                    theme === 'dark' 
                      ? 'bg-lime-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  type="button"
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
            <div className="border-t border-gray-200 dark:border-gray-700 p-2" data-dropdown-content>
              <button
                data-dropdown-content
                onClick={(e) => {
                  e.stopPropagation();
                  handleSignOut();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left rounded-lg cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-small text-red-600 dark:text-red-400 font-medium">
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

