'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, KeyRound, PlaySquare, Settings, LogOut, ArrowLeft, Users, Shield, Menu, X, Briefcase, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { motion } from 'framer-motion';

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
        "fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-72 border-r bg-[#0d1209] border-white/5 flex flex-col transition-transform duration-500 ease-in-out shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-8 flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white">
              CV<span className="text-[#80FF00]">CIRCLE</span> <br />
              <span className="text-[10px] tracking-[0.4em] uppercase opacity-40">Enterprise</span>
            </h2>
          </div>
          <button 
            className="lg:hidden p-2 -mr-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-all"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-300 group relative overflow-hidden',
                  isActive
                    ? 'text-black bg-[#80FF00]'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                  isActive ? "text-black" : "text-[#80FF00]"
                )} />
                {link.name}
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-[#80FF00] -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 mt-auto space-y-4">
          <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
            <p className="text-[10px] font-black tracking-widest text-gray-500 uppercase mb-4">Account</p>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#80FF00] to-green-600 flex items-center justify-center font-black text-black text-xs">
                {globalUser?.name?.substring(0, 2).toUpperCase() || 'HR'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{globalUser?.name || 'Manager'}</p>
                <p className="text-[10px] text-gray-500 truncate uppercase tracking-tighter">{userRole}</p>
              </div>
            </div>
            
            <Link href="/dashboard" className="block w-full group">
              <div className="flex items-center justify-between py-2 text-xs font-bold text-gray-400 group-hover:text-[#80FF00] transition-colors">
                <span>Consumer Portal</span>
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
          
          {isSystemAdmin && (
            <Link href="/admin/dashboard" className="block w-full">
              <Button className="w-full justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl h-12 shadow-lg shadow-indigo-900/20">
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
