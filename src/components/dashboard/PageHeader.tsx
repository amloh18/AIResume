'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X, ChevronRight } from 'lucide-react';
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
  rightContent?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  description, 
  user, 
  showSettings = true,
  onMobileMenuToggle,
  isMobileMenuOpen = false,
  rightContent
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const generateBreadcrumbs = () => {
    if (!pathname) return [];
    
    const segments = pathname.split('/').filter(Boolean);
    
    return segments.map((segment, index) => {
      const href = `/${segments.slice(0, index + 1).join('/')}`;
      const text = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
        
      return { href, text, isLast: index === segments.length - 1 };
    });
  };

  const breadcrumbs = generateBreadcrumbs();

  const renderRightSection = () => {
    if (rightContent) {
      return (
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4 min-w-0 max-w-full">
          {rightContent}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 md:gap-4 min-w-0 max-w-full">
        {/* Mobile: Show hamburger menu */}
        <button
          onClick={onMobileMenuToggle}
          className="sm:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex-shrink-0 w-6 h-6 flex items-center justify-center"
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <GlobalSearchBar />
        <NotificationCenter />
      </div>
    );
  };

  return (
    <div className="mb-3 sm:mb-4 mt-2 sm:mt-3">
      {/* Responsive Header - Visible on all screen sizes */}
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4 pt-3 sm:pt-4 lg:pt-4 xl:pt-6 pb-2 sm:pb-2 lg:pb-2 xl:pb-3">
        {/* Title and Description */}
        <div className="min-w-0 flex-1">
          {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex text-xs text-gray-500 dark:text-gray-400 mb-2">
              <ol className="flex items-center">
                {breadcrumbs.map((crumb, index) => (
                  <li key={crumb.href} className="flex items-center">
                    {index > 0 && <ChevronRight className="w-3 h-3 mx-1 sm:mx-2 text-gray-400 dark:text-gray-500 flex-shrink-0" />}
                    {crumb.isLast ? (
                      <span className="font-medium text-gray-700 dark:text-gray-300 truncate" aria-current="page">
                        {crumb.text}
                      </span>
                    ) : (
                      <Link href={crumb.href} className="hover:text-gray-900 dark:hover:text-white transition-colors truncate">
                        {crumb.text}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
          <p className="text-xs sm:text-sm md:text-sm lg:text-sm xl:text-base text-gray-600 dark:text-white/60 mt-1 sm:mt-1 md:mt-1 lg:mt-1 xl:mt-2 line-clamp-1 sm:line-clamp-2">{description}</p>
        </div>
        
        {/* Search Bar / Notifications / Custom actions */}
        {renderRightSection()}
      </div>
    </div>
  );
};

export default PageHeader;
