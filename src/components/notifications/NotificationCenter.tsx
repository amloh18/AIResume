// @ts-nocheck
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, AlertCircle, Info, CheckCircle, AlertTriangle, Clock, TrendingUp, Briefcase, FileText, Sparkles, Loader2 } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { DashboardDataContext } from '@/contexts/DashboardDataContext';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationCenterProps {
  variant?: 'default' | 'pill';
}

function ProgressCircle({ progress, size = 36, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-gray-200 dark:stroke-white/10"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-emerald-600 dark:stroke-[#80FF00] transition-all duration-300 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="absolute text-[9px] font-bold tabular-nums text-gray-800 dark:text-white">
        {Math.round(clampedProgress)}%
      </span>
    </div>
  );
}

export default function NotificationCenter({ variant = 'default' }: NotificationCenterProps) {
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

  const [activeTab, setActiveTab] = useState<'notifications' | 'activities'>('notifications');
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Convert progressEvents Map to Array for rendering
  const activeProgressArray = Array.from(progressEvents.values());
  const activeProgress = activeProgressArray.length > 0 ? activeProgressArray[0] : null;

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
      case 'cv_updated': return 'text-blue-500 bg-blue-500/10 dark:bg-blue-500/15';
      case 'applied': return 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/15';
      case 'interview': return 'text-purple-600 bg-purple-500/10 dark:text-purple-400 dark:bg-purple-500/15';
      case 'improvement': return 'text-amber-600 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/15';
      case 'recommendation': return 'text-lime-600 bg-lime-500/10 dark:text-[#80FF00] dark:bg-[#80FF00]/15';
      default: return 'text-gray-500 bg-gray-500/10 dark:bg-gray-500/15';
    }
  };

  const formatSafeTimeAgo = (dateVal: any) => {
    if (!dateVal) return 'Just now';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Just now';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="relative font-sans">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className={variant === 'pill' 
          ? "relative w-8 h-8 rounded-full bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/15 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/10 transition-all group active:scale-95 shadow-xs"
          : "relative w-8 h-8 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/10 transition-all group active:scale-95"
        }
      >
        {/* Circular Progress Ring around Bell button when active applying */}
        {activeProgress && (
          <svg className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90 pointer-events-none" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="17"
              className="stroke-gray-200 dark:stroke-white/10"
              strokeWidth="2.5"
              fill="none"
            />
            <circle
              cx="20"
              cy="20"
              r="17"
              className="stroke-emerald-500 dark:stroke-[#80FF00] transition-all duration-300 ease-out drop-shadow-[0_0_4px_rgba(128,255,0,0.6)]"
              strokeWidth="2.5"
              strokeDasharray={2 * Math.PI * 17}
              strokeDashoffset={2 * Math.PI * 17 - (Math.min(100, Math.max(0, activeProgress.progress || 0)) / 100) * (2 * Math.PI * 17)}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        )}

        <Bell
          size={16}
          className={`transition-colors ${
            activeProgress
              ? 'text-emerald-600 dark:text-[#80FF00] animate-pulse'
              : isOpen
                ? 'text-emerald-600 dark:text-[#80FF00]'
                : 'text-gray-600 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-[#80FF00]'
          }`}
        />

        {unreadCount > 0 && !activeProgress && (
          <span className="absolute -top-1 -right-1 bg-emerald-500 dark:bg-[#80FF00] text-white dark:text-black text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center border-2 border-white dark:border-[#141810] shadow-[0_0_8px_rgba(128,255,0,0.8)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {mounted && typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {isOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[99998] bg-black/40 dark:bg-black/70 backdrop-blur-xs"
                    onClick={() => setIsOpen(false)}
                  />

                  {/* Sidebar Panel — slides in from the right, with margin & rounded corners */}
                  <motion.div
                    initial={{ x: 'calc(100% + 12px)' }}
                    animate={{ x: 0 }}
                    exit={{ x: 'calc(100% + 12px)' }}
                    transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    className="fixed top-3 right-3 bottom-3 w-[320px] sm:w-[360px] bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl z-[99999] flex flex-col shadow-2xl overflow-hidden"
                  >
                    {/* Header — same height as the global topbar (h-14) */}
                    <div className="flex items-center justify-between h-14 px-5 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                          Updates
                        </h2>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-[#80FF00]/15 text-emerald-700 dark:text-[#80FF00] border border-emerald-200 dark:border-[#80FF00]/30 tabular-nums">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[11px] font-semibold text-emerald-600 dark:text-[#80FF00] hover:underline transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                        <button
                          onClick={() => setIsOpen(false)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <X size={17} />
                        </button>
                      </div>
                    </div>

                    {/* Tab Bar */}
                    {showActivityTab && (
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex-shrink-0">
                        <div className="flex p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200/80 dark:border-white/5">
                          <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                              activeTab === 'notifications'
                                ? 'bg-white dark:bg-[#1c2415] text-emerald-800 dark:text-[#80FF00] shadow-xs border border-gray-200/60 dark:border-[#80FF00]/30'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                            }`}
                          >
                            <Bell size={13} />
                            Notifications {unreadCount > 0 && `(${unreadCount})`}
                          </button>
                          <button
                            onClick={() => setActiveTab('activities')}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                              activeTab === 'activities'
                                ? 'bg-white dark:bg-[#1c2415] text-emerald-800 dark:text-[#80FF00] shadow-xs border border-gray-200/60 dark:border-[#80FF00]/30'
                                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                            }`}
                          >
                            <Clock size={13} />
                            Recent Activity
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
                      {activeTab === 'notifications' || !showActivityTab ? (
                        <div className="space-y-2.5">
                          {/* Live Progress Section with Progress Circle */}
                          {activeProgressArray.length > 0 && (
                            <div className="mb-3 space-y-2">
                              {activeProgressArray.map((p) => (
                                <div
                                  key={p.id}
                                  className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-[#80FF00]/5 border border-emerald-200 dark:border-[#80FF00]/25 shadow-xs flex items-center gap-3.5"
                                >
                                  <ProgressCircle progress={p.progress || 0} size={40} strokeWidth={3.5} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-[#80FF00]">
                                        {p.type === 'progress' ? 'Applying...' : 'In Progress'}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-semibold text-gray-900 dark:text-white mt-0.5 truncate">
                                      {p.message || 'Updating status...'}
                                    </h4>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {notifications.length === 0 && activeProgressArray.length === 0 ? (
                            <EmptyState icon={Bell} title="No notifications" sub="You're all caught up!" />
                          ) : (
                            notifications.map((n) => (
                              <div
                                key={n._id || n.id}
                                onClick={() => {
                                  markAsRead(n._id || n.id);
                                  if (n.actionUrl) window.location.href = n.actionUrl;
                                }}
                                className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${
                                  n.read
                                    ? 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-200/70 dark:border-white/5 hover:bg-gray-100/60 dark:hover:bg-white/[0.04]'
                                    : 'bg-white dark:bg-[#1a230f]/60 border-emerald-300/70 dark:border-[#80FF00]/30 shadow-xs hover:border-emerald-400 dark:hover:border-[#80FF00]/50'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                      n.read
                                        ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500'
                                        : 'bg-emerald-100/80 text-emerald-700 dark:bg-[#80FF00]/15 dark:text-[#80FF00]'
                                    }`}
                                  >
                                    <Bell size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4
                                      className={`text-xs truncate ${
                                        n.read
                                          ? 'font-medium text-gray-600 dark:text-gray-400'
                                          : 'font-semibold text-gray-900 dark:text-white'
                                      }`}
                                    >
                                      {n.title}
                                    </h4>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed line-clamp-2">
                                      {n.message}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1.5 text-[9.5px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                      <span>{formatSafeTimeAgo(n.createdAt)}</span>
                                      {n.category && (
                                        <>
                                          <span>•</span>
                                          <span>{n.category}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {!n.read && (
                                  <div className="absolute top-3.5 right-3.5 w-2 h-2 bg-emerald-500 dark:bg-[#80FF00] rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)] dark:shadow-[0_0_6px_#80FF00]" />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {secondaryLoading.activities && allActivities.length === 0 ? (
                            <div className="flex justify-center py-10">
                              <Loader2 className="animate-spin text-emerald-600 dark:text-[#80FF00]" size={24} />
                            </div>
                          ) : allActivities.length === 0 ? (
                            <EmptyState icon={Clock} title="No activity" sub="Your timeline is empty" />
                          ) : (
                            allActivities.map((a, idx) => {
                              const Icon = getActivityIcon(a.type);
                              const colorClass = getActivityColor(a.type);
                              return (
                                <div
                                  key={a.id || idx}
                                  className="p-3 rounded-xl bg-gray-50/50 dark:bg-white/[0.02] hover:bg-gray-100/60 dark:hover:bg-white/[0.04] transition-all flex items-start gap-3 border border-gray-200/70 dark:border-white/5"
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
                                    <Icon size={15} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-gray-900 dark:text-white font-medium leading-snug">
                                      {a.message || a.title}
                                    </p>
                                    <span className="text-[9.5px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-1 block">
                                      {formatSafeTimeAgo(a.timestamp)}
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
                      <div className="p-4 bg-gray-50/60 dark:bg-white/[0.02] border-t border-gray-200/70 dark:border-white/10 flex-shrink-0">
                        <button
                          onClick={markAllAsRead}
                          className="w-full py-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-[#80FF00] hover:bg-emerald-50 dark:hover:bg-[#80FF00]/10 rounded-xl transition-all"
                        >
                          Mark all as read
                        </button>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}

const EmptyState = ({ icon: Icon, title, sub }: any) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3 border border-gray-200 dark:border-white/5">
      <Icon size={26} className="text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{title}</h3>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{sub}</p>
  </div>
);

