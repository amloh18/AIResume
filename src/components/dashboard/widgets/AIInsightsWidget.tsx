'use client';

import React from 'react';
import { Sparkles, ArrowRight, X, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { useDashboardData } from '@/contexts/DashboardDataContext';

interface AIInsightsWidgetProps {
  className?: string;
}

type InsightType = 'action' | 'tip' | 'market' | 'improvement' | 'skill_gap' | 'cv_optimization' | 'strategy' | 'opportunity';

interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  cta?: string;
  priority: 'high' | 'medium' | 'low';
  actionable?: boolean;
}

const getIcon = (type: InsightType) => {
  switch (type) {
    case 'skill_gap':
    case 'improvement':
      return TrendingUp;
    case 'cv_optimization':
    case 'action':
      return Target;
    case 'strategy':
    case 'tip':
      return Lightbulb;
    case 'opportunity':
    case 'market':
      return Sparkles;
    default:
      return Sparkles;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20';
    case 'medium':
      return 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20';
    default:
      return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
  }
};

export default function AIInsightsWidget({ className }: AIInsightsWidgetProps) {
  const { aiInsights, secondaryLoading } = useDashboardData();
  const isLoading = secondaryLoading.aiInsights;
  const [dismissedIds, setDismissedIds] = React.useState<Set<string>>(new Set());

  // Map API insights to component format if needed
  const insights: Insight[] = React.useMemo(() => {
    return aiInsights.map((insight: any, idx: number) => ({
      id: insight.id || `insight-${idx}`,
      type: insight.type || 'tip',
      title: insight.title,
      description: insight.description,
      cta: insight.cta || 'Learn More',
      priority: insight.priority || 'medium',
      actionable: !!insight.cta || true,
    }));
  }, [aiInsights]);

  const visibleInsights = insights.filter(i => !dismissedIds.has(i.id));

  const dismissInsight = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  return (
    <div className={cn(
      'bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-white/5 relative',
      className
    )}>
      {/* Gradient border accent */}
      <div className="absolute inset-0 rounded-3xl p-[2px] bg-gradient-to-br from-lime-400 via-emerald-400 to-teal-400 -z-10">
        <div className="w-full h-full bg-white dark:bg-[#111317] rounded-3xl" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            AI Insights
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Personalized recommendations
          </p>
        </div>
      </div>

      {/* Insights list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleInsights.map((insight, idx) => {
              const Icon = getIcon(insight.type);
              return (
                <motion.div
                  key={insight.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  className={cn(
                    'relative group rounded-2xl border p-3 transition-all hover:shadow-md',
                    getPriorityColor(insight.priority)
                  )}
                >
                  <button
                    onClick={() => dismissInsight(insight.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    <X size={12} className="text-gray-500" />
                  </button>

                  <div className="flex items-start gap-3 pr-6">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                      insight.priority === 'high' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300' :
                      insight.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300' :
                      'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                    )}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        {insight.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {insight.description}
                      </p>
                      
                      {insight.actionable && (
                        <button className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                          {insight.cta}
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {!isLoading && visibleInsights.length === 0 && (
          <div className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No new insights. Check back later!
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 text-right">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-lime-600 dark:hover:text-lime-400 transition-colors cursor-pointer">
          View All Insights →
        </span>
      </div>

      {/* Soft glow on new insights */}
      {visibleInsights.some(i => i.priority === 'high') && (
        <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-emerald-500/10 rounded-3xl blur-xl -z-20 pointer-events-none" />
      )}
    </div>
  );
}
