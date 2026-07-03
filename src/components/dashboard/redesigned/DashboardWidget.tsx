'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, MoreHorizontal, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardWidgetProps } from '@/types/dashboard-widgets';

export default function DashboardWidget({
  title,
  subtitle,
  loading,
  empty,
  emptyState,
  error,
  actions,
  className,
  children,
  expandable,
  onExpand,
  type
}: DashboardWidgetProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    onExpand?.();
  };

  return (
    <div
      className={cn(
        'relative bg-white dark:bg-[#111317] rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col',
        isExpanded ? 'z-50' : 'z-0',
        className
      )}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h3 className="dashboard-widget-title text-[13px] font-semibold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            {type === 'hero' && <Sparkles size={16} className="text-[#83d60d]" />}
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {expandable && (
            <button
              onClick={handleExpand}
              className="p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400 transition-colors"
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}
          {actions && actions.length > 0 && (
            <button className="p-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-400 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className={cn(
        'flex-1 px-6 pb-6 pt-2 overflow-y-auto scrollbar-hide',
        loading || empty || error ? 'flex items-center justify-center min-h-[200px]' : ''
      )}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 text-gray-400"
            >
              <Loader2 className="w-8 h-8 animate-spin text-[#83d60d]" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Gathering Data...</span>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 text-center px-4"
            >
              <AlertCircle className="w-8 h-8 text-rose-500" />
              <div>
                <p className="text-small font-bold text-gray-900 dark:text-white">Oops! Something went wrong</p>
                <p className="text-small text-gray-500 mt-1">{error}</p>
              </div>
            </motion.div>
          ) : empty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center px-4"
            >
              <div className="w-16 h-16 rounded-3xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                <Sparkles size={32} className="text-gray-200 dark:text-white/10" />
              </div>
              <div>
                <p className="text-small font-bold text-gray-900 dark:text-white">{emptyState?.title || 'No data yet'}</p>
                <p className="text-small text-gray-500 mt-1 max-w-[200px]">{emptyState?.description || 'Your control room is waiting.'}</p>
              </div>
              {emptyState?.action && (
                <button
                  onClick={emptyState.action.onClick}
                  className={cn(
                    "px-4 py-2 rounded-xl text-small font-medium uppercase tracking-wide transition-all",
                    emptyState.action.primary 
                      ? "bg-[#83d60d] text-slate-900 shadow-lg shadow-[#83d60d]/20" 
                      : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                  )}
                >
                  {emptyState.action.label}
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Gradient Border (Subtle) */}
      <div className="absolute inset-0 rounded-[32px] border border-gray-100 dark:border-white/5 pointer-events-none" />
      
      {/* Footer / Status (Optional) */}
      {isExpanded && (
        <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Detailed View</span>
          <div className="flex gap-2">
            {actions?.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-wide transition-all",
                  action.primary 
                    ? "bg-[#83d60d] text-slate-900" 
                    : "bg-white dark:bg-white/10 text-gray-500 border border-gray-200 dark:border-white/5 hover:bg-gray-100"
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
