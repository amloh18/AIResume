'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';

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
    <div className="mb-3">
      {/* Desktop Layout */}
      <div className="hidden xl:flex items-center justify-between py-6">
        {/* Title and Description */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-base text-gray-600 dark:text-white/60 mt-2">{description}</p>
        </div>
        
        {/* Search Bar - Right side on desktop */}
        <div className="flex items-center gap-4">
          <GlobalSearchBar />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="xl:hidden py-6">
        <div className="flex items-center justify-between gap-3">
          {/* Hamburger Menu */}
          <button
            onClick={onMobileMenuToggle}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Title and Description - Offset towards hamburger */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
            <p className="text-base text-gray-600 dark:text-white/60 mt-2 line-clamp-1">{description}</p>
          </div>
          
          {/* Search Bar - Right side on mobile (icon with overlay) */}
          <div className="flex-shrink-0">
            <GlobalSearchBar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
