'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title?: string;
  description?: string;
  user?: {
    name?: string;
    email?: string;
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
  actions?: React.ReactNode; // Optional Row 2 action buttons
  compact?: boolean; // Tighter spacing: little top padding, no bottom padding
}

export default function PageHeader(props: PageHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Helper to determine the current page title based on the URL path segment
  const getPageName = () => {
    if (!pathname || pathname === '/dashboard' || pathname === '/dashboard/jobs') {
      const tab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
      if (tab === 'discover' || tab === 'jobs') return 'Jobs Hub';
      if (tab === 'applications' || tab === 'tracker') return 'Applications';
      if (tab === 'comms') return 'Communications';
      if (tab === 'docs' || tab === 'documents') return 'Documents';
      if (tab === 'settings') return 'Settings';
      return 'Overview';
    }
    
    // Check nested routes
    if (pathname.includes('/dashboard/tracker')) return 'Tracker';
    if (pathname.includes('/dashboard/settings')) return 'Settings';
    if (pathname.includes('/dashboard/interview')) return 'Interview Coach';

    const segment = pathname.split('/').pop() || '';
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <div className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${props.compact ? "pt-2" : "pb-4 mb-4"}`}>
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-body text-gray-500 dark:text-gray-400 font-medium">
        <span 
          onClick={() => router.push('/dashboard/jobs')}
          className="hover:text-lime-600 dark:hover:text-lime-400 cursor-pointer transition-colors"
        >
          Dashboard
        </span>
        <ChevronRight className="h-4 w-4 text-gray-455 dark:text-gray-500" />
        <span className="text-gray-800 dark:text-gray-200 font-bold">
          {getPageName()}
        </span>
      </div>

      {/* Right: Actions */}
      {props.actions && (
        <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
          {props.actions}
        </div>
      )}
    </div>
  );
}
