'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Briefcase, 
  Target, 
  Mic, 
  Sparkles, 
  Folder,
  ChevronLeft,
  ChevronRight,
  Upload,
  PlusCircle,
  Target as TrackTarget,
  Search,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  className?: string;
}

export default function SidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname();
  const { isDesktopExpanded, toggleDesktopSidebar, toggleSidebar } = useMobileSidebar();

  // Persist expanded state in localStorage
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', String(isDesktopExpanded));
  }, [isDesktopExpanded]);

  // Load initial state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarExpanded');
    if (saved !== null) {
      // Note: We're not setting state here to avoid hydration mismatch
      // The context provider will provide default, and first client render will sync
    }
  }, []);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: FileText, label: 'CVs', href: '/cv' },
    { icon: Briefcase, label: 'Jobs', href: '/dashboard/tracker' },
    { icon: Target, label: 'Applications', href: '/applications' },
    { icon: Mic, label: 'Interview Coach', href: '/dashboard/interview' },
    { icon: Sparkles, label: 'Insights', href: '/insights' },
    { icon: Folder, label: 'Documents', href: '/documents' },
  ];

  const quickActions = [
    { icon: Upload, label: 'Import CV', href: '/import-cv' },
    { icon: PlusCircle, label: 'Add Job', href: '/jobs/new' },
    { icon: Target, label: 'New Application', href: '/applications/new' },
    { icon: Search, label: 'Track Job', href: '/track-job' },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Sidebar container */}
      <nav
        className={cn(
          'flex flex-col h-full w-full transition-all duration-300 ease-in-out',
          className
        )}
      >
        {/* Inner container with glassmorphism */}
        <div className="flex flex-col h-full w-full bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl border-r border-gray-200/50 dark:border-white/5 rounded-r-3xl m-0.5 shadow-lg">
          {/* Header with logo */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/5">
            <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white font-black text-sm">C</span>
              </div>
              <AnimatePresence mode="wait">
                {isDesktopExpanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap"
                  >
                    Circle
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
            
            {/* Mobile close button */}
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
            
            {/* Desktop expand/collapse button */}
            <button
              onClick={toggleDesktopSidebar}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              {isDesktopExpanded ? (
                <ChevronLeft size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
            </button>
          </div>

          {/* Main navigation */}
          <div className="flex-1 py-6 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    active
                      ? 'text-lime-600 dark:text-lime-400 bg-lime-50 dark:bg-lime-500/10'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-lime-500 rounded-r-full"
                    />
                  )}
                  
                  <Icon 
                    size={20} 
                    className={cn(
                      'flex-shrink-0 transition-all',
                      active ? 'text-lime-600 dark:text-lime-400' : 'group-hover:text-gray-900 dark:group-hover:text-white'
                    )} 
                  />
                  
                  <AnimatePresence mode="wait">
                    {isDesktopExpanded && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="font-medium text-sm whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Tooltip for collapsed state */}
                  {!isDesktopExpanded && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick actions section */}
          <div className="px-2 pb-4 border-t border-gray-100 dark:border-white/5 pt-4">
            <AnimatePresence mode="wait">
              {isDesktopExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 mb-3"
                >
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Quick Actions
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-3 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-lime-50 dark:hover:bg-lime-500/10 hover:text-lime-600 dark:hover:text-lime-400 transition-all"
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <AnimatePresence mode="wait">
                      {isDesktopExpanded && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="text-sm font-medium whitespace-nowrap"
                        >
                          {action.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Footer with user profile placeholder */}
          <div className="p-3 border-t border-gray-100 dark:border-white/5">
            <div className={cn(
              'flex items-center gap-3 rounded-xl p-2 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer',
              isDesktopExpanded ? 'justify-start' : 'justify-center'
            )}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {isDesktopExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      Your Name
                    </p>
                    <p className="text-xs text-gray-500 truncate">Free Plan</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
