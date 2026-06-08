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
    <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-[#0d1209] border-b border-white/5 sticky top-0 z-30 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 -ml-2 text-white/60 hover:text-white rounded-full hover:bg-white/5 transition-all"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#80FF00] leading-none mb-1">CVCircle HR</span>
          <span className="font-bold text-white text-sm leading-none">{getPageTitle()}</span>
        </div>
      </div>
    </div>
  );
}
