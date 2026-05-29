'use client';

import React from 'react';
import { motion } from 'framer-motion';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Stage {
  label: string;
  count: number;
  color: string;
  path: string;
}

const defaultStages: Stage[] = [
  { label: 'Applied', count: 3, color: 'bg-blue-500', path: '/dashboard/tracker?filter=applied' },
  { label: 'Screening', count: 2, color: 'bg-indigo-500', path: '/dashboard/tracker?filter=screening' },
  { label: 'Assessment', count: 1, color: 'bg-purple-500', path: '/dashboard/tracker?filter=assessment' },
  { label: 'Interview', count: 2, color: 'bg-amber-500', path: '/dashboard/tracker?filter=interview' },
  { label: 'Offer', count: 1, color: 'bg-[#83d60d]', path: '/dashboard/tracker?filter=offer' },
  { label: 'Rejected', count: 12, color: 'bg-rose-500', path: '/dashboard/tracker?filter=rejected' },
];

export default function JobPipelineWidget({ stages = defaultStages, loading = false, empty = false }: { stages?: Stage[], loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="job-pipeline"
      title="Job Pipeline"
      subtitle="Strategic Application Tracking"
      type="pipeline"
      userTier={['focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No jobs tracked yet",
        description: "Start by adding your first application.",
        action: {
          label: "Add Job",
          onClick: () => console.log('Add Job'),
          primary: true
        }
      }}
      className="h-full"
    >
      <div className="flex gap-2 min-h-[120px]">
        {stages.map((stage, idx) => (
          <div 
            key={stage.label} 
            className="flex-1 flex flex-col gap-2 group cursor-pointer"
            onClick={() => console.log(`Navigate to ${stage.path}`)}
          >
            <div className="flex-1 relative bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden group-hover:border-[#83d60d]/30 transition-all">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${(stage.count / Math.max(...stages.map(s => s.count))) * 100}%` }}
                className={cn("absolute bottom-0 inset-x-0 opacity-20", stage.color)}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform">
                  {stage.count}
                </span>
              </div>
            </div>
            <div className="text-center">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                {stage.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex items-center justify-between p-4 bg-[#f0fbc9]/30 dark:bg-[#83d60d]/5 rounded-[24px] border border-[#83d60d]/20">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#83d60d] animate-pulse" />
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">3 Interviews scheduled this week</span>
        </div>
        <button className="text-[10px] font-black uppercase tracking-widest text-[#487e04] dark:text-[#83d60d]">
          View Schedule →
        </button>
      </div>
    </DashboardWidget>
  );
}
