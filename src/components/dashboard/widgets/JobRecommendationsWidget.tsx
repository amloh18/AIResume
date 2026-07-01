'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Briefcase, ChevronRight, Star, MapPin, Building } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useDashboardData } from '@/contexts/DashboardDataContext';

interface JobRecommendationsWidgetProps {
  className?: string;
}

interface JobRec {
  id: string;
  title: string;
  company: string;
  location?: string;
  match: number;
  tags: string[];
  reason: string;
  posted: string;
}

function MatchBadge({ percentage }: { percentage: number }) {
  const getColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    if (pct >= 80) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    if (pct >= 70) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  };

  return (
    <div className={cn('px-2 py-1 rounded-full text-small font-bold flex items-center gap-1', getColor(percentage))}>
      <Star size={12} fill="currentColor" />
      {percentage}%
    </div>
  );
}

export default function JobRecommendationsWidget({ className }: JobRecommendationsWidgetProps) {
  const { jobRecommendations, secondaryLoading, refreshJobRecommendations } = useDashboardData();
  const isLoading = secondaryLoading.jobRecommendations;

  const jobs: JobRec[] = React.useMemo(() => {
    return jobRecommendations.map((j: any) => ({
      id: j.id,
      title: j.title,
      company: j.company,
      location: j.location,
      match: j.matchScore,
      tags: [j.location, 'Full-time'],
      reason: `Matches your recent search for ${j.title}`,
      posted: 'Recently'
    }));
  }, [jobRecommendations]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className={cn(
        'bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div>
          <h3 className="text-h3 font-bold text-gray-900 dark:text-white">
            Recommended Jobs
          </h3>
          <p className="text-small text-gray-500 dark:text-gray-400">
            Curated matches for you
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center opacity-80">
          <span className="text-h3">🔥</span>
        </div>
      </div>

      {/* Job list */}
      <div className="relative z-10 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-small text-gray-500">No recommendations found.</p>
          </div>
        ) : (
          jobs.slice(0, 3).map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all hover:shadow-md bg-gray-50 dark:bg-gray-800/50 overflow-hidden"
            >
              <div className="p-3">
                {/* Top row: title + match */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-small font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {job.title}
                    </h4>
                    <p className="text-small text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                      <Building size={10} />
                      {job.company}
                      {job.location && (
                        <>
                          <span>•</span>
                          <MapPin size={10} />
                          {job.location}
                        </>
                      )}
                    </p>
                  </div>
                  <MatchBadge percentage={job.match} />
                </div>

                {/* Why matched */}
                <p className="text-small text-gray-600 dark:text-gray-300 mt-2 mb-2 italic">
                  {job.reason}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {job.tags.map((tag, tagIdx) => (
                    <span
                      key={tagIdx}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-gray-700 text-[10px] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button className="flex-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-small font-medium hover:bg-blue-700 transition-colors">
                    Quick Apply
                  </button>
                  <button className="px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-small font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                    Save
                  </button>
                  <button className="px-2 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* View all */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 relative z-10 text-right">
        <button 
          onClick={() => refreshJobRecommendations()}
          className="text-small font-medium text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer"
        >
          Refresh Recommendations →
        </button>
      </div>

      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-full blur-xl pointer-events-none" />
    </motion.div>
  );
}
