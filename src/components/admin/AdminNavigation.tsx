'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import {
  LayoutDashboard, BarChart3, Users, Settings, LogOut, ArrowLeft, Activity, Mail, Database, CreditCard, Shield, Menu, X, Sparkles, FileText, MessageSquare, Bell, Briefcase, UserCircle
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from '@/lib/contexts/ThemeContext';

interface AdminNavigationProps {
  activeTab: string;
  activeSubTab: string;
  onTabChange: (tab: string, subTab?: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export default function AdminNavigation({ activeTab, activeSubTab, onTabChange, isMobileMenuOpen, setIsMobileMenuOpen }: AdminNavigationProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  const handleSignOut = async () => {
    try {
      await signOut({ callbackUrl: '/sign-in', redirect: true });
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/sign-in';
    }
  };

  const navGroups = [
    {
      title: 'MENU',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
        { 
          id: 'management', 
          label: 'Management', 
          icon: Users,
          subItems: [
            { id: 'users', label: 'Users', icon: Users },
            { id: 'businesses', label: 'Businesses (B2B)', icon: Briefcase },
            { id: 'campaigns', label: 'Campaigns', icon: Mail },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'drafts', label: 'CV Drafts', icon: FileText },
            { id: 'sponsorships', label: 'Data', icon: Database },
          ]
        },
        { 
          id: 'analytics', 
          label: 'Analytics', 
          icon: BarChart3,
          subItems: [
            { id: 'ai', label: 'AI Analytics', icon: Sparkles },
            { id: 'journey', label: 'Journey', icon: FileText },
            { id: 'content', label: 'Content', icon: MessageSquare },
            { id: 'logs', label: 'Activity Logs', icon: Activity },
            { id: 'system', label: 'System Health', icon: Settings },
          ]
        },
        { id: 'pricing', label: 'Pricing', icon: CreditCard },
      ]
    },
    {
      title: 'PORTALS',
      items: [
        { id: 'consumer', label: 'Consumer Dashboard', icon: UserCircle, action: () => router.push('/dashboard') },
        { id: 'b2b', label: 'B2B Gateway', icon: Briefcase, action: () => router.push('/b2b/dashboard') },
      ]
    },
    {
      title: 'GENERAL',
      items: [
        { id: 'logout', label: 'Logout', icon: LogOut, action: handleSignOut },
      ]
    }
  ];

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-[#1a230f] border-r border-gray-200 dark:border-gray-800 shadow-sm rounded-r-3xl my-2 ml-2 relative overflow-hidden transition-colors duration-300">
      {/* Mobile Close Button */}
      <div className="lg:hidden absolute top-4 right-4 z-50">
        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Logo Area */}
      <div className="p-6 pb-2 flex items-center justify-between">
        <Logo size="md" showText={true} />
      </div>
      <div className="px-6 mb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
          <Shield className="w-3 h-3" />
          Admin
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 scrollbar-hide">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h3 className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                
                return (
                  <div key={item.id} className="flex flex-col">
                    <button
                      onClick={() => {
                        if (item.action) {
                          item.action();
                        } else {
                          onTabChange(item.id, item.subItems?.[0]?.id);
                          if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 text-left ${
                        isActive && !item.action
                          ? 'bg-[#185b3a] text-white shadow-md shadow-[#185b3a]/20'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive && !item.action ? 'text-lime-300' : ''}`} />
                      <span className="font-medium truncate">{item.label}</span>
                    </button>
                    
                    {/* Sub-items */}
                    {item.subItems && isActive && (
                      <div className="mt-1 ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-1">
                        {item.subItems.map(subItem => {
                          const SubIcon = subItem.icon;
                          const isSubActive = activeSubTab === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => {
                                onTabChange(item.id, subItem.id);
                                if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-200 text-left text-sm ${
                                isSubActive
                                  ? 'bg-lime-100 dark:bg-lime-900/30 text-[#185b3a] dark:text-lime-400 font-semibold'
                                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/30 hover:text-gray-900 dark:hover:text-gray-200'
                              }`}
                            >
                              <SubIcon className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{subItem.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile Card */}
      <div className="p-4 mt-auto">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex items-center gap-3 border border-gray-100 dark:border-gray-700">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#185b3a] to-lime-500 flex items-center justify-center text-white font-bold text-lg shadow-inner flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
