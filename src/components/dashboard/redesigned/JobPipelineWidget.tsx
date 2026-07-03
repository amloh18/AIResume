'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Stage {
  label: string;
  count: number;
  color: string;
  path: string;
}

const defaultStages: Stage[] = [
  { label: 'Draft', count: 0, color: 'bg-slate-400', path: '/dashboard/tracker?filter=draft' },
  { label: 'Staging', count: 0, color: 'bg-cyan-500', path: '/dashboard/tracker?filter=created' },
  { label: 'Applied', count: 3, color: 'bg-blue-500', path: '/dashboard/tracker?filter=applied' },
  { label: 'Interview', count: 2, color: 'bg-amber-500', path: '/dashboard/tracker?filter=interview' },
  { label: 'Offer', count: 1, color: 'bg-[#83d60d]', path: '/dashboard/tracker?filter=offer' },
  { label: 'Rejected', count: 12, color: 'bg-rose-500', path: '/dashboard/tracker?filter=rejected' },
];

export default function JobPipelineWidget({ stages = defaultStages, loading = false, empty = false }: { stages?: Stage[], loading?: boolean, empty?: boolean }) {
  const router = useRouter();
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

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
          onClick: () => router.push('/dashboard/tracker?action=add-job'),
          primary: true
        }
      }}
      className="h-full"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 xl:grid-cols-6 gap-2 min-h-[160px]">
        {stages.map((stage, idx) => (
          <div 
            key={stage.label} 
            className="flex-1 flex flex-col gap-2 group cursor-pointer"
            onClick={() => router.push(stage.path)}
          >
            <div className="relative min-h-[88px] bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden group-hover:border-[#83d60d]/30 transition-all">
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${(stage.count / maxCount) * 100}%` }}
                className={cn("absolute bottom-0 inset-x-0 opacity-20", stage.color)}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-h3 font-black text-gray-900 dark:text-white group-hover:scale-110 transition-transform">
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
        <button 
          onClick={() => router.push('/dashboard/tracker?filter=interview')}
          className="text-[10px] font-black uppercase tracking-widest text-[#487e04] dark:text-[#83d60d] hover:underline"
        >
          View Schedule →
        </button>
      </div>
    </DashboardWidget>
  );
}
