'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { cn } from '@/lib/utils';

interface JobTrackerCardProps {
  className?: string;
}

export default function JobTrackerCard({ className }: JobTrackerCardProps) {
  const { jobs } = useDashboardData();

  const recentJobs = jobs?.slice(0, 3) || [];
  
  // Count by status
  const statusCounts = {
    draft: jobs?.filter((j: any) => j.status === 'draft' || j.status === 'saved').length || 0,
    parsed: jobs?.filter((j: any) => j.status === 'parsed').length || 0,
    applied: jobs?.filter((j: any) => j.status === 'applied').length || 0,
    archived: jobs?.filter((j: any) => j.status === 'archived').length || 0,
  };

  return (
    <Link href="/dashboard/tracker">
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className={cn(
          'group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-5 md:p-6 shadow-lg',
          'shadow-blue-600/30 transition-all duration-300',
          'hover:shadow-xl hover:shadow-blue-600/40',
          'flex flex-col h-full',
          className
        )}
      >
        {/* Background glow */}
        <div className="absolute -inset-24 bg-gradient-to-tr from-blue-700 to-indigo-600 opacity-50 pointer-events-none rounded-full blur-3xl transition-opacity group-hover:opacity-70" />

        {/* Background icon */}
        <div className="absolute -right-6 -bottom-6 opacity-[0.05] pointer-events-none transition-opacity group-hover:opacity-[0.08]">
          <Briefcase size={160} strokeWidth={1} />
        </div>

        {/* Card Header */}
        <div className="flex items-center justify-between relative z-10">
          <span className="text-sm font-semibold text-blue-100">
            Job Tracker
          </span>
          <div className="flex items-center px-3 py-1.5 bg-blue-500/30 backdrop-blur-md rounded-full text-xs font-medium text-white border border-blue-400/20">
            <Briefcase size={14} className="mr-1.5" />
            <span className="hidden sm:inline">Track</span>
          </div>
        </div>

        {/* Main Count */}
        <div className="my-4 flex items-end gap-3 relative z-10">
          <h2 className="text-5xl font-black tracking-tighter text-white leading-none">
            {jobs?.length || 0}
          </h2>
          <span className="text-xs font-medium text-lime-300 mb-1 flex items-center">
            ↑ Saved
          </span>
        </div>

        {/* Extraction Status Summary */}
        <div className="flex gap-2 mb-3 relative z-10">
          <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/20">
            {statusCounts.draft} Draft
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/20">
            {statusCounts.parsed} Parsed
          </span>
          <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/20">
            {statusCounts.applied} Applied
          </span>
        </div>

        {/* Recent Jobs */}
        <div className="flex-1 space-y-2 relative z-10 w-full">
          {recentJobs.map((job: any) => (
            <div
              key={job.id || job._id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)] flex-shrink-0" />
              <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">
                    {job.jobTitle || job.title || 'Untitled Role'}
                  </p>
                  <p className="text-[10px] text-blue-200 truncate mt-0.5">
                    {job.company || 'Unknown Company'}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-medium border capitalize',
                      job.status === 'applied'
                        ? 'bg-emerald-500/40 text-emerald-100 border-emerald-400/30'
                        : job.status === 'parsed'
                        ? 'bg-blue-500/40 text-blue-100 border-blue-400/30'
                        : 'bg-gray-500/40 text-gray-100 border-gray-400/30'
                    )}
                  >
                    {job.status || 'Saved'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {(!jobs || jobs.length === 0) && (
            <div className="text-xs text-blue-100/70 italic py-2 text-center">
              No saved jobs. Add one!
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-3 pt-3 border-t border-blue-500/20 relative z-10 text-right">
          <span className="text-xs font-medium text-blue-100 group-hover:text-white transition-colors">
            View All Jobs →
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
