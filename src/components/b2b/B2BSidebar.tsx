'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, KeyRound, PlaySquare, Settings, LogOut, ArrowLeft, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface B2BSidebarProps {
  userRole: 'admin' | 'recruiter' | 'member';
}

export default function B2BSidebar({ userRole }: B2BSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const globalUser = session?.user as any;
  const isSystemAdmin = globalUser?.role === 'admin' || globalUser?.role === 'superadmin' || globalUser?.type === 'admin';

  const links = [
    {
      name: 'Overview & Analytics',
      href: '/b2b/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'recruiter', 'member'],
    },
    {
      name: 'Smart Roster',
      href: '/b2b/dashboard/roster',
      icon: Users,
      roles: ['admin', 'recruiter', 'member'],
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

  return (
    <div className="w-64 border-r bg-white dark:bg-[#141810] dark:border-gray-800 flex flex-col">
      <div className="p-6">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
          CVCircle B2B
        </h2>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{userRole} Portal</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {filteredLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t dark:border-gray-800 space-y-2">
        <Link href="/dashboard" className="block w-full">
          <Button variant="outline" className="w-full justify-start gap-2">
            <ArrowLeft className="w-4 h-4" />
            Return to Consumer
          </Button>
        </Link>
        
        {isSystemAdmin && (
          <Link href="/admin/dashboard" className="block w-full">
            <Button variant="outline" className="w-full justify-start gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 dark:border-indigo-800">
              <Shield className="w-4 h-4" />
              System Admin
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
