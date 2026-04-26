'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { usePathname } from 'next/navigation';

export default function B2BMobileHeader({ userRole }: { userRole: string }) {
  const { setIsOpen } = useMobileSidebar();
  const pathname = usePathname();

  // Helper to get page title based on pathname
  const getPageTitle = () => {
    if (pathname === '/b2b/dashboard') return 'Overview & Analytics';
    if (pathname.startsWith('/b2b/dashboard/roster')) return 'Smart Roster';
    if (pathname.startsWith('/b2b/dashboard/api-keys')) return 'API Keys & Webhooks';
    if (pathname.startsWith('/b2b/dashboard/sandbox')) return 'Sandbox UI';
    if (pathname.startsWith('/b2b/dashboard/settings')) return 'Settings';
    return 'HR Dashboard';
  };

  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-1 -ml-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-semibold">{getPageTitle()}</span>
      </div>
    </div>
  );
}
