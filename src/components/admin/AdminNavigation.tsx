// @ts-nocheck
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import {
  LayoutDashboard, BarChart3, Users, Settings, LogOut, Activity, Mail, Database, CreditCard, Shield, X, Sparkles, FileText, MessageSquare, Bell, ChevronRight,
  Globe, Gift, Tag, DollarSign
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

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
      title: 'Main',
      items: [
        { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      title: 'Management',
      items: [
        { 
          id: 'management', 
          label: 'Content', 
          icon: Shield,
          subItems: [
            { id: 'users', label: 'Users', icon: Users },
            { id: 'campaigns', label: 'Campaigns', icon: Mail },
            { id: 'notifications', label: 'Alerts', icon: Bell },
            { id: 'drafts', label: 'Drafts', icon: FileText },
            { id: 'sponsorships', label: 'Data Tables', icon: Database },
          ]
        },
        { 
          id: 'pricing', 
          label: 'Pricing', 
          icon: CreditCard,
          subItems: [
            { id: 'plans', label: 'Protocols', icon: CreditCard },
            { id: 'regional', label: 'Regional', icon: Globe },
            { id: 'promotions', label: 'Signals', icon: Gift },
            { id: 'coupons', label: 'Bypass', icon: Tag },
            { id: 'revenue', label: 'Liquidity', icon: DollarSign },
          ]
        },
      ]
    },
    {
      title: 'Job Ingestion & Automation',
      items: [
        {
          id: 'job-intelligence',
          label: 'Job Intelligence',
          icon: Globe,
          subItems: [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'jobs', label: 'Live Jobs', icon: Database },
            { id: 'sources', label: 'Sources', icon: Activity },
            { id: 'runs', label: 'Ingestion Runs', icon: FileText },
            { id: 'errors', label: 'Diagnostics Hub', icon: Shield },
            { id: 'duplicates', label: 'Duplicate Matrix', icon: BarChart3 },
            { id: 'analytics', label: 'Supply Analytics', icon: BarChart3 },
          ],
        },
        {
          id: 'automation',
          label: 'Auto-Apply Engine',
          icon: Sparkles,
          subItems: [
            { id: 'overview', label: 'Queue & Health', icon: LayoutDashboard },
            { id: 'runs', label: 'Run Inspector', icon: Activity },
            { id: 'review', label: 'Review Queue', icon: Shield },
            { id: 'controls', label: 'Kill Switch', icon: Settings },
          ],
        },
      ],
    },
    {
      title: 'Insights',
      items: [
        { 
          id: 'analytics', 
          label: 'Analytics', 
          icon: BarChart3,
          subItems: [
            { id: 'ai', label: 'AI Analytics', icon: Sparkles },
            { id: 'journey', label: 'Journeys', icon: FileText },
            { id: 'content', label: 'Conversations', icon: MessageSquare },
            { id: 'logs', label: 'Logs', icon: Activity },
            { id: 'system', label: 'Health', icon: Settings },
          ]
        },
      ]
    }
  ];

  return (
    <div className="h-full w-full flex flex-col bg-[#050505] border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Mobile Close Button */}
      <div className="lg:hidden absolute top-6 right-6 z-50">
        <button 
          onClick={() => setIsMobileMenuOpen(false)} 
          className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Logo Area */}
      <div className="p-8 pb-4 flex items-center justify-between">
        <div className="relative group">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Logo size="md" />
        </div>
      </div>
      
      <div className="px-8 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest"
        >
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          Status: Online
        </motion.div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-6 space-y-10 scrollbar-hide py-4">
        {navGroups.map((group, groupIdx) => (
          <motion.div 
            key={groupIdx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * groupIdx }}
          >
            <h3 className="px-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">
              {group.title}
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                
                return (
                  <div key={item.id} className="flex flex-col group/item">
                    <button
                      onClick={() => {
                        if (item.action) {
                          item.action();
                        } else {
                          onTabChange(item.id, item.subItems?.[0]?.id);
                          if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 text-left overflow-hidden ${
                        isActive && !item.action
                          ? 'bg-white/5 text-white'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Active Indicator Bar */}
                      {isActive && (
                        <motion.div 
                          layoutId="activeTab"
                          className="absolute left-0 w-1 h-1/2 bg-emerald-500 rounded-r-full"
                        />
                      )}
                      
                      <div className={`relative z-10 p-2 rounded-xl transition-all duration-300 ${
                        isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40 group-hover/item:text-white/70'
                      }`}>
                        <Icon className="w-5 h-5 flex-shrink-0" />
                      </div>
                      
                      <span className="relative z-10 font-medium text-sm tracking-tight">{item.label}</span>
                      
                      {item.subItems && (
                        <ChevronRight className={`ml-auto w-4 h-4 transition-transform duration-300 ${isActive ? 'rotate-90 text-emerald-500' : 'text-white/20'}`} />
                      )}
                    </button>
                    
                    {/* Sub-items with liquid animation */}
                    <AnimatePresence>
                      {item.subItems && isActive && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-6 pl-6 border-l border-white/5 space-y-1">
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
                                  className={`group/sub w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 text-left text-xs ${
                                    isSubActive
                                      ? 'text-emerald-400 font-semibold'
                                      : 'text-white/30 hover:text-white/70'
                                  }`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                                    isSubActive ? 'bg-emerald-500 scale-100' : 'bg-white/10 scale-0 group-hover/sub:scale-100'
                                  }`} />
                                  <span className="truncate tracking-wide">{subItem.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer Area */}
      <div className="p-6 mt-auto space-y-4">
        {/* User Profile Card */}
        <div className="relative group p-[1px] rounded-[1.5rem] overflow-hidden bg-white/5 hover:bg-gradient-to-br hover:from-emerald-500/50 hover:to-transparent transition-all duration-500">
          <div className="bg-[#0a0a0a] rounded-[1.5rem] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {user?.name || 'Admin'}
              </p>
              <p className="text-[10px] text-white/30 truncate uppercase tracking-wider">
                Administrator
              </p>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 text-white/20 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
