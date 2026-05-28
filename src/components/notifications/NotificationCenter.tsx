// @ts-nocheck
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { Bell, X, AlertCircle, Info, CheckCircle, AlertTriangle, Clock, TrendingUp, Briefcase, FileText, Sparkles, Layout } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { DashboardDataContext } from '@/contexts/DashboardDataContext';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

type TabType = 'notifications' | 'activities';

export default function NotificationCenter() {
  const {
    notifications,
    activities: liveActivities,
    progressEvents,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Safe context access to avoid "must be used within DashboardDataProvider" error
  const dashboardContext = useContext(DashboardDataContext);
  const dbActivities = dashboardContext?.activities || [];
  const secondaryLoading = dashboardContext?.secondaryLoading || { activities: false };
  
  // Merge live activities with DB activities
  const allActivities = [...liveActivities];
  dbActivities.forEach(dbA => {
    if (!allActivities.some(a => a.id === dbA.id)) {
      allActivities.push(dbA);
    }
  });
  
  // Sort merged activities by timestamp
  allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [isOpen, setIsOpen] = useState(false);
  
  // Convert progressEvents Map to Array for rendering
  const activeProgressArray = Array.from(progressEvents.values());

  
  // Hide activity tab if context is missing
  const showActivityTab = !!dashboardContext;

  // Listen for global toggle event
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-notification-drawer', handleToggle);
    return () => window.removeEventListener('toggle-notification-drawer', handleToggle);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cv_updated': return FileText;
      case 'applied': return Briefcase;
      case 'interview': return Clock;
      case 'improvement': return TrendingUp;
      case 'recommendation': return Sparkles;
      default: return CheckCircle;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'cv_updated': return 'text-blue-500 bg-blue-500/10';
      case 'applied': return 'text-emerald-500 bg-emerald-500/10';
      case 'interview': return 'text-purple-500 bg-purple-500/10';
      case 'improvement': return 'text-amber-500 bg-amber-500/10';
      case 'recommendation': return 'text-lime-500 bg-lime-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-all group active:scale-95"
      >
        <Bell size={16} className={`transition-colors ${isOpen ? 'text-[#80FF00]' : 'text-gray-500 dark:text-gray-400 group-hover:text-[#80FF00]'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#80FF00] text-black text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center border-2 border-white dark:border-[#141810] shadow-[0_0_8px_#80FF00]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-[380px] md:w-[420px] max-h-[80vh] bg-white dark:bg-[#111317] rounded-3xl shadow-2xl z-[9999] flex flex-col overflow-hidden border border-gray-200 dark:border-white/10"
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">
                    Inbox & Activity
                  </h2>
                  <button onClick={() => setIsOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>

                {showActivityTab && (
                  <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5">
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'notifications' ? 'bg-white dark:bg-[#1a230f] text-[#80FF00] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                    >
                      <Bell size={12} />
                      Notifications {unreadCount > 0 && `(${unreadCount})`}
                    </button>
                    <button
                      onClick={() => setActiveTab('activities')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'activities' ? 'bg-white dark:bg-[#1a230f] text-[#80FF00] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}
                    >
                      <Clock size={12} />
                      Recent Activity
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar min-h-[300px]">
                {activeTab === 'notifications' || !showActivityTab ? (
                  <div className="space-y-2">
                    {/* Live Progress Section */}
                    {activeProgressArray.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {activeProgressArray.map((p) => (
                          <div key={p.id} className="p-4 rounded-2xl bg-[#80FF00]/5 border border-[#80FF00]/20 shadow-sm animate-pulse">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#80FF00]">
                                {p.type === 'progress' ? 'Processing...' : 'Information'}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500">{p.progress}%</span>
                            </div>
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2">{p.message || 'Updating...'}</h4>
                            <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-[#80FF00] shadow-[0_0_8px_#80FF00]"
                                initial={{ width: 0 }}
                                animate={{ width: `${p.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {notifications.length === 0 && activeProgressArray.length === 0 ? (
                      <EmptyState icon={Bell} title="No notifications" sub="You're all caught up!" />
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n._id} 
                          onClick={() => { markAsRead(n._id); n.actionUrl && (window.location.href = n.actionUrl); }}
                          className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${n.read ? 'bg-gray-50/50 dark:bg-white/[0.02] border-transparent' : 'bg-white dark:bg-[#1a230f] border-gray-100 dark:border-[#80FF00]/20 shadow-sm'}`}
                        >
                          <div className="flex gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.read ? 'bg-gray-100 dark:bg-white/5 text-gray-400' : 'bg-[#80FF00]/10 text-[#80FF00]'}`}>
                              <Bell size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`text-sm font-bold truncate ${n.read ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{n.title}</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{n.message}</p>
                              <div className="flex items-center gap-2 mt-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                <span>{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                                {n.category && <><span>•</span><span>{n.category}</span></>}
                              </div>
                            </div>
                          </div>
                          {!n.read && <div className="absolute top-4 right-4 w-2 h-2 bg-[#80FF00] rounded-full shadow-[0_0_8px_#80FF00]" />}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {secondaryLoading.activities && allActivities.length === 0 ? (
                       <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#80FF00]" /></div>
                    ) : allActivities.length === 0 ? (
                      <EmptyState icon={Clock} title="No activity" sub="Your timeline is empty" />
                    ) : (
                      allActivities.map((a, idx) => {
                        const Icon = getActivityIcon(a.type);
                        const colorClass = getActivityColor(a.type);
                        return (
                          <div key={a.id || idx} className="p-4 rounded-2xl bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all flex gap-4 border border-transparent hover:border-gray-200 dark:hover:border-white/5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                              <Icon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                               <p className="text-sm text-gray-900 dark:text-white font-medium leading-snug">{a.message}</p>
                               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2 block">
                                 {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                               </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              {activeTab === 'notifications' && unreadCount > 0 && (
                <div className="p-4 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5">
                  <button onClick={markAllAsRead} className="w-full py-3 text-[10px] font-black uppercase tracking-widest text-[#80FF00] hover:bg-[#80FF00]/10 rounded-xl transition-all">
                    Mark all as read
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const EmptyState = ({ icon: Icon, title, sub }: any) => (
  <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
    <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 border border-gray-200 dark:border-white/5">
      <Icon size={32} className="text-gray-300 dark:text-gray-600" />
    </div>
    <h3 className="text-base font-bold text-gray-900 dark:text-white uppercase tracking-tighter italic">{title}</h3>
    <p className="text-xs text-gray-500 mt-1 font-medium">{sub}</p>
  </div>
);
