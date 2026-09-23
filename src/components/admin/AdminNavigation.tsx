// @ts-nocheck
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/ui/Logo';
import {
  LayoutDashboard, BarChart3, Users, Settings, LogOut, Activity, Mail, Database, CreditCard, Shield, X, Sparkles, FileText, MessageSquare, Bell, ChevronRight,
  Globe, Gift, Tag, DollarSign, ExternalLink
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { CHIP_INLINE, CHIP_TONES_DARK } from '@/components/ui/chip-styles';

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
        { id: 'user-dashboard', label: 'User Dashboard', icon: ExternalLink, action: () => router.push('/dashboard/jobs') },
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
            { id: 'queue', label: 'Queue & Triage', icon: Shield },
            { id: 'sources', label: 'Sources', icon: Activity },
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
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="relative group">
          <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Logo size="md" />
        </div>
      </div>
      
      <div className="px-5 mb-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CHIP_INLINE} font-bold uppercase tracking-widest ${CHIP_TONES_DARK.emerald}`}
        >
          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
          Status: Online
        </motion.div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 space-y-3 scrollbar-hide py-2">
        {navGroups.map((group, groupIdx) => (
          <motion.div 
            key={groupIdx}
            role="group"
            aria-label={group.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * groupIdx }}
          >
            <div className="space-y-1">
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
                      className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 text-left overflow-hidden ${
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
                      
                      <div className={`relative z-10 p-1.5 rounded-lg transition-all duration-300 ${
                        isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40 group-hover/item:text-white/70'
                      }`}>
                        <Icon className="w-4 h-4 flex-shrink-0" />
                      </div>
                      
                      <span className="relative z-10 font-medium text-[13px] tracking-tight">{item.label}</span>
                      
                      {item.subItems && (
                        <ChevronRight className={`ml-auto w-3.5 h-3.5 transition-transform duration-300 ${isActive ? 'rotate-90 text-emerald-500' : 'text-white/20'}`} />
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
                          <div className="mt-1 ml-4 pl-4 border-l border-white/5 space-y-0.5">
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
                                  className={`group/sub w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-300 text-left text-xs ${
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
      <div className="px-3 pt-2 pb-3 mt-auto">
        {/* User Profile Card */}
        <div className="relative group p-[1px] rounded-2xl overflow-hidden bg-white/5 hover:bg-gradient-to-br hover:from-emerald-500/50 hover:to-transparent transition-all duration-500">
          <div className="bg-[#0a0a0a] rounded-2xl p-2.5 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-black font-black text-base shadow-[0_0_20px_rgba(16,185,129,0.3)] flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate">
                {user?.name || 'Admin'}
              </p>
              <p className="text-[10px] text-white/30 truncate uppercase tracking-wider">
                Administrator
              </p>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-1.5 text-white/20 hover:text-red-400 transition-colors"
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
