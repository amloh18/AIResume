'use client';

import React from 'react';
import { Activity, X, User, FileText, Settings, Shield, Database, Mail, Bell, DollarSign, Zap, Clock, ArrowUpRight, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActivityItem {
  id: string;
  type: 'user' | 'template' | 'system' | 'notification' | 'payment' | 'security' | 'database' | 'email';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  status?: 'success' | 'error' | 'warning' | 'info';
  priority?: 'low' | 'medium' | 'high';
}

interface RecentActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({ 
  isOpen, 
  onClose, 
  activities, 
  loading, 
  error, 
  onRefresh 
}) => {
  const getActivityIcon = (type: string, icon: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      user: <User size={16} className="text-emerald-500" />,
      template: <FileText size={16} className="text-blue-500" />,
      system: <Settings size={16} className="text-purple-500" />,
      notification: <Bell size={16} className="text-amber-500" />,
      payment: <DollarSign size={16} className="text-emerald-500" />,
      security: <Shield size={16} className="text-red-500" />,
      database: <Database size={16} className="text-orange-500" />,
      email: <Mail size={16} className="text-blue-500" />,
    };
    
    return iconMap[type] || <Activity size={16} className="text-white/20" />;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9000]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-md bg-[#050505] border-l border-white/5 shadow-2xl z-[9999] flex flex-col overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="p-8 border-b border-white/5 bg-white/2 backdrop-blur-md relative z-10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Nexus <span className="text-emerald-500">Activity</span></h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Real-time Event Stream</span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Cards */}
            <div className="p-6 space-y-3 relative z-10">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Network Operational</span>
                </div>
                <ArrowUpRight className="w-3 h-3 text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{activities.length} signals in cache</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide relative z-10">
              {loading ? (
                <div className="space-y-6 pt-10">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-12 h-12 bg-white/5 rounded-xl" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-2 bg-white/5 rounded w-3/4" />
                        <div className="h-2 bg-white/5 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <AlertTriangle className="w-12 h-12 text-red-500/20 mb-4" />
                  <p className="text-xs font-black text-red-400 uppercase tracking-widest">{error}</p>
                  <button onClick={onRefresh} className="mt-6 px-6 py-2.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Retry Link</button>
                </div>
              ) : (
                <>
                  {activities.map((activity, idx) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-5 bg-white/[0.02] border border-white/5 rounded-[1.5rem] hover:bg-white/[0.04] hover:border-white/10 transition-all group relative overflow-hidden"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/5 rounded-xl group-hover:bg-white/10 transition-colors">
                          {getActivityIcon(activity.type, activity.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-black text-white/90 group-hover:text-emerald-400 transition-colors truncate uppercase tracking-tight">{activity.title}</p>
                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest whitespace-nowrap ml-2">{formatTimeAgo(activity.timestamp)}</span>
                          </div>
                          <p className="text-[11px] font-medium text-white/30 leading-relaxed line-clamp-2">{activity.description}</p>
                          {activity.status && (
                            <div className="mt-3 flex items-center gap-2">
                              <div className={`w-1 h-1 rounded-full ${activity.status === 'success' ? 'bg-emerald-500' : activity.status === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${activity.status === 'success' ? 'text-emerald-500/60' : activity.status === 'error' ? 'text-red-500/60' : 'text-amber-500/60'}`}>
                                Protocol {activity.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {activities.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                      <Activity className="w-12 h-12 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Silence in Sector</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-white/5 bg-white/2 backdrop-blur-md relative z-10">
              <button
                onClick={onRefresh}
                disabled={loading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-2xl shadow-lg shadow-emerald-500/20 uppercase tracking-[0.2em] text-xs transition-all disabled:opacity-30 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh Stream
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RecentActivityPanel;
