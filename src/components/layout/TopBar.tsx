'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Settings, User, Menu, X } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getTopBarClasses } from '@/lib/utils/themeUtils';

interface TopBarProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  showMenuButton?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({
  onMenuToggle,
  isMenuOpen = false,
  showMenuButton = true
}) => {
  const { data: session } = useSession();
  const router = useRouter();
  const topBarClasses = getTopBarClasses();

  const handleProfileClick = () => {
    router.push('/dashboard/settings');
  };

  const handleNotificationsClick = () => {
    // TODO: Implement notifications
    console.log('Notifications clicked');
  };

  const handleSettingsClick = () => {
    router.push('/dashboard/settings');
  };

  return (
    <div className={topBarClasses.container}>
      <div className={topBarClasses.content}>
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          {showMenuButton && (
            <button
              onClick={onMenuToggle}
              className={`${topBarClasses.button} xl:hidden`}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}

          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-lime-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">CV</span>
            </div>
            <span className="text-white font-semibold text-lg hidden sm:block">
              CV Circle
            </span>
          </div>
        </div>

        {/* Center Section - Navigation breadcrumbs could go here */}
        <div className="flex-1 flex items-center justify-center">
          {/* Optional: Add breadcrumbs or current page indicator */}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <motion.button
            onClick={handleNotificationsClick}
            className={topBarClasses.button}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell size={18} />
          </motion.button>

          {/* Settings */}
          <motion.button
            onClick={handleSettingsClick}
            className={topBarClasses.button}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={18} />
          </motion.button>

          {/* User Profile */}
          <motion.button
            onClick={handleProfileClick}
            className={`${topBarClasses.button} flex items-center gap-2`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <User size={18} />
            )}
            <span className="hidden sm:block text-sm font-medium">
              {session?.user?.firstName || session?.user?.name || 'User'}
            </span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;