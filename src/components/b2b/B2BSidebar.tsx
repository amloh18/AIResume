'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, KeyRound, PlaySquare, Settings, LogOut, ArrowLeft, Users, Shield, Menu, X, Briefcase, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';

interface B2BSidebarProps {
  userRole: 'admin' | 'recruiter' | 'member';
}

export default function B2BSidebar({ userRole }: B2BSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const globalUser = session?.user as any;
  const isSystemAdmin = globalUser?.role === 'admin' || globalUser?.role === 'superadmin' || globalUser?.type === 'admin';
  const { isOpen, setIsOpen } = useMobileSidebar();

  const links = [
    {
      name: 'Overview & Analytics',
      href: '/b2b/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'recruiter', 'member'],
    },
    {
      name: 'Jobs / Requisitions',
      href: '/b2b/dashboard/jobs',
      icon: Briefcase,
      roles: ['admin', 'recruiter', 'member'],
    },
    {
      name: 'Smart Roster',
      href: '/b2b/dashboard/roster',
      icon: Users,
      roles: ['admin', 'recruiter', 'member'],
    },
    {
      name: 'Careers Page',
      href: '/b2b/dashboard/careers-page',
      icon: Globe,
      roles: ['admin', 'recruiter'],
    },
    {
      name: 'API Keys & Webhooks',
      href: '/b2b/dashboard/api-keys',
      icon: KeyRound,
      roles: ['admin'],
    },
    {
      name: 'Sandbox UI',
      href: '/b2b/dashboard/sandbox',
      icon: PlaySquare,
      roles: ['admin', 'recruiter', 'member'],
    },
    {
      name: 'Settings',
      href: '/b2b/dashboard/settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const filteredLinks = links.filter(link => link.roles.includes(userRole));

  // Close sidebar on route change on mobile
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 border-r bg-white dark:bg-[#141810] dark:border-gray-800 flex flex-col transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
              CVCircle HR
            </h2>
          </div>
          <button 
            className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {filteredLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 lg:py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5 lg:w-4 lg:h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t dark:border-gray-800 space-y-3">
          <Link href="/dashboard" className="block w-full">
            <Button variant="outline" className="w-full justify-start gap-2 h-10 lg:h-9">
              <ArrowLeft className="w-4 h-4" />
              Return to Consumer
            </Button>
          </Link>
          
          {isSystemAdmin && (
            <Link href="/admin/dashboard" className="block w-full">
              <Button variant="outline" className="w-full justify-start gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 dark:border-indigo-800 h-10 lg:h-9">
                <Shield className="w-4 h-4" />
                System Admin
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
