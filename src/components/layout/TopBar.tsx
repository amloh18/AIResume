'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Settings, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getTopBarClasses } from '@/lib/utils/themeUtils';
import UserAvatar from '@/components/ui/UserAvatar';
import { useUserData } from '@/lib/hooks/useUserData';
import { useSession } from 'next-auth/react';
import GlobalSearchBar from './GlobalSearchBar';
import NotificationCenter from '@/components/notifications/NotificationCenter';

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
  const router = useRouter();
  const topBarClasses = getTopBarClasses();
  const { data: session } = useSession();
  const { userData } = useUserData();

  const handleProfileClick = () => {
    router.push('/dashboard/settings');
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-[#1a2015] p-1 shadow-sm">
              <Image 
                src="/images/logo.png" 
                alt="CVCircle Logo" 
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
                unoptimized
              />
            </div>
            <span className="text-white dark:text-gray-100 font-semibold text-lg hidden sm:block">
              <span className="text-lime-400 dark:text-[rgb(129,255,0)]">CV</span><span className="text-gray-300 dark:text-gray-200">Circle</span>
            </span>
          </div>
        </div>

        {/* Center Section - Navigation breadcrumbs could go here */}
        <div className="flex-1 flex items-center justify-center">
          {/* Optional: Add breadcrumbs or current page indicator */}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <GlobalSearchBar />

          {/* Notification Center */}
          <NotificationCenter />

          {/* Settings */}
          <motion.button
            onClick={handleSettingsClick}
            className={topBarClasses.button}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={18} />
          </motion.button>

          {/* User Avatar */}
          <UserAvatar 
            src={userData?.avatar || session?.user?.image || undefined}
            name={userData?.firstName && userData?.lastName 
              ? `${userData.firstName} ${userData.lastName}` 
              : userData?.username || session?.user?.name || 'User'}
            alt={userData?.firstName && userData?.lastName 
              ? `${userData.firstName} ${userData.lastName}` 
              : userData?.username || session?.user?.name || 'User avatar'}
            size="sm"
          />

        </div>
      </div>
    </div>
  );
};

export default TopBar;