'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

import { useDashboardData } from '@/contexts/DashboardDataContext';

interface ApplicationFunnelProps {
  className?: string;
  stages?: Array<{ name: string; count: number; color: string }>;
}

// Simple donut chart component
function OfferRateDonut({ percentage }: { percentage: number }) {
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct: number) => {
    if (pct >= 25) return '#10B981';
    if (pct >= 15) return '#8B5CF6';
    if (pct >= 10) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-100 dark:text-gray-800"
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(percentage)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-gray-900 dark:text-white">
          {percentage}%
        </span>
      </div>
    </div>
  );
}

export default function ApplicationFunnel({ className, stages: propStages }: ApplicationFunnelProps) {
  const { jobs, secondaryLoading } = useDashboardData();
  const isLoading = secondaryLoading.jobs;

  // Calculate stages from real jobs data
  const stages = React.useMemo(() => {
    if (propStages) return propStages;
    
    const counts = {
      Draft: jobs.filter(j => j.status === 'draft' || j.status === 'created').length,
      Applied: jobs.filter(j => j.status === 'applied').length,
      Interview: jobs.filter(j => j.status === 'interview' || j.status === 'screening').length,
      Offer: jobs.filter(j => j.status === 'offer' || j.status === 'accepted').length,
    };

    return [
      { name: 'Draft', count: counts.Draft, color: 'bg-gray-400' },
      { name: 'Applied', count: counts.Applied, color: 'bg-blue-500' },
      { name: 'Interview', count: counts.Interview, color: 'bg-violet-500' },
      { name: 'Offer', count: counts.Offer, color: 'bg-emerald-500' },
    ];
  }, [jobs, propStages]);

  const total = stages.reduce((sum, s) => sum + s.count, 0);
  const offerCount = stages.find(s => s.name === 'Offer')?.count || 0;
  const offerRate = total > 0 ? Math.round((offerCount / total) * 100) : 0;

  // Calculate conversion from each stage to next
  const getConversionRate = (currentIdx: number): number => {
    const currentCount = stages[currentIdx]?.count || 0;
    const prevCount = stages[currentIdx - 1]?.count || currentCount;
    return prevCount > 0 ? Math.round((currentCount / prevCount) * 100) : 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={cn(
        'bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden flex flex-col',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-8 -bottom-8 opacity-[0.02]">
        <svg width="200" height="200" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="40" />
        </svg>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Application Funnel
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Conversion tracking
          </p>
        </div>

        {!isLoading && total > 0 && (
          <div className="text-right">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {offerRate}%
            </span>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Offer Rate
            </p>
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className="relative z-10 flex-1 flex flex-col justify-center space-y-3 min-h-[240px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : total === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-gray-500">No application data yet.</p>
          </div>
        ) : (
          stages.map((stage, idx) => {
            const percentage = total > 0 ? (stage.count / total) * 100 : 0;
            const widthPercent = Math.max(percentage, 5); // Minimum 5% visibility
            const conversion = idx > 0 ? getConversionRate(idx) : null;
            
            return (
              <div key={stage.name} className="flex items-center gap-4">
                {/* Stage label */}
                <div className="w-20 flex-shrink-0">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {stage.name}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 relative h-7 md:h-8 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full transition-colors',
                      stage.color
                    )}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">
                    {stage.count}
                  </span>
                </div>

                {/* Conversion rate from previous */}
                {conversion !== null && (
                  <div className="w-16 text-right">
                    <span className={cn(
                      'text-[10px] font-bold',
                      conversion >= 50 ? 'text-emerald-600 dark:text-emerald-400' :
                      conversion >= 30 ? 'text-amber-600 dark:text-amber-400' :
                      'text-rose-600 dark:text-rose-400'
                    )}>
                      {conversion}%
                    </span>
                    <span className="text-[9px] text-gray-400 ml-0.5">conv.</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </motion.div>
  );
}
