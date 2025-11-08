'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';
import NotificationCenter from '@/components/notifications/NotificationCenter';

interface PageHeaderProps {
  title: string;
  description: string;
  user: {
    name: string;
    email: string;
    username?: string;
    profilePhoto?: string;
    designation?: string;
    subscription?: any;
    isEmailVerified?: boolean;
  };
  showSettings?: boolean;
  onMobileMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  user, 
  showSettings = true,
  onMobileMenuToggle,
  isMobileMenuOpen = false
}) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="mb-3 sm:mb-4">
      {/* Desktop Layout - Visible on lg and above */}
      <div className="hidden lg:flex items-center justify-between py-4 xl:py-6">
        {/* Title and Description */}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
          <p className="text-sm xl:text-base text-gray-600 dark:text-white/60 mt-1 xl:mt-2 line-clamp-2">{description}</p>
        </div>
        
        {/* Search Bar and Notifications - Right side on desktop */}
        <div className="flex items-center gap-4 ml-4 flex-shrink-0">
          <GlobalSearchBar />
          <NotificationCenter />
        </div>
      </div>

      {/* Mobile Layout - Visible on sm only, hidden on md+ */}
      <div className="md:hidden py-4">
        <div className="flex items-center justify-between gap-2">
          {/* Hamburger Menu */}
          <button
            onClick={onMobileMenuToggle}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0 w-6 h-6 flex items-center justify-center"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Title and Description - Offset towards hamburger */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h1>
            <p className="text-xs text-gray-600 dark:text-white/60 mt-1 line-clamp-1">{description}</p>
          </div>
          
          {/* Search Bar and Notifications - Right side on mobile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationCenter />
            <GlobalSearchBar />
          </div>
        </div>
      </div>

      {/* Tablet Layout - Visible on md only, hidden on sm and lg+ */}
      <div className="hidden md:flex lg:hidden items-center justify-between py-4 sm:py-6 gap-3">
        {/* Title and Description */}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
          <p className="text-sm text-gray-600 dark:text-white/60 mt-1 sm:mt-2 line-clamp-1">{description}</p>
        </div>
        
        {/* Search Bar and Notifications - Right side on tablet */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <GlobalSearchBar />
          <NotificationCenter />
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
