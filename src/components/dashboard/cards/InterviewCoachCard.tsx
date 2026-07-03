'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageSquare, Calendar, TrendingUp, Clock, Mic } from 'lucide-react';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { cn } from '@/lib/utils';

interface InterviewCoachCardProps {
  className?: string;
}

export default function InterviewCoachCard({ className }: InterviewCoachCardProps) {
  const { jobs } = useDashboardData();

  // Get jobs with interview prep ready
  const prepJobs = jobs?.filter((j: any) => j.interviewCoach?.status === 'ready') || [];
  const upcomingSessions = jobs
    ?.filter((j: any) => j.interviewCoach?.nextSession)
    .slice(0, 2) || [];

  // Calculate readiness average
  const avgReadiness = prepJobs.length > 0
    ? Math.round(prepJobs.reduce((sum: number, j: any) => sum + (j.interviewCoach?.readinessScore || 0), 0) / prepJobs.length)
    : 0;

  // Weak areas aggregation
  const weakAreas = prepJobs
    .flatMap((j: any) => j.interviewCoach?.weakAreas || [])
    .filter(Boolean);

  return (
    <Link href="/dashboard/interview">
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className={cn(
          'group relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-5 md:p-6 shadow-lg',
          'shadow-indigo-600/30 transition-all duration-300',
          'hover:shadow-xl hover:shadow-indigo-600/40',
          'flex flex-col h-full',
          className
        )}
      >
        {/* Background glow */}
        <div className="absolute -inset-24 bg-gradient-to-tr from-indigo-700 to-purple-700 opacity-50 pointer-events-none rounded-full blur-3xl transition-opacity group-hover:opacity-70" />

        {/* Background icon */}
        <div className="absolute -right-6 -bottom-6 opacity-[0.05] pointer-events-none transition-opacity group-hover:opacity-[0.08]">
          <Mic size={160} strokeWidth={1} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <span className="text-small font-semibold text-indigo-100">
            Interview Coach
          </span>
          <div className="flex items-center px-3 py-1.5 bg-indigo-500/30 backdrop-blur-sm rounded-full text-small font-medium text-white border border-indigo-400/20">
            <MessageSquare size={14} className="mr-1.5" />
            <span className="hidden sm:inline">Prep</span>
          </div>
        </div>

        {/* Main Count & Status */}
        <div className="my-4 flex items-end gap-3 relative z-10">
          <h2 className="text-display font-black tracking-tighter text-white leading-none">
            {prepJobs.length}
          </h2>
          <span className="text-small font-medium text-amber-300 mb-1 flex items-center">
            ↑ Upcoming
          </span>
        </div>

        {/* Readiness Bar */}
        <div className="mb-3 relative z-10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-indigo-200">Avg. Readiness</span>
            <span className="text-[10px] font-bold text-amber-300">{avgReadiness}%</span>
          </div>
          <div className="h-2 rounded-full bg-indigo-500/30 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${avgReadiness}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                avgReadiness >= 80 ? 'bg-emerald-400' : avgReadiness >= 60 ? 'bg-amber-400' : 'bg-rose-400'
              )}
            />
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="flex-1 space-y-2 relative z-10 w-full">
          {upcomingSessions.length > 0 ? (
            upcomingSessions.map((job: any, idx: number) => (
              <div
                key={job.id || job._id || idx}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-all hover:bg-white/10"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.8)] flex-shrink-0" />
                <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                  <div className="min-w-0">
                    <p className="text-small font-bold text-white truncate">
                      {job.jobTitle || job.title || 'Interview Prep'}
                    </p>
                    <p className="text-[10px] text-indigo-200 truncate mt-0.5 flex items-center gap-1">
                      <Calendar size={10} />
                      {job.interviewCoach?.nextSession
                        ? new Date(job.interviewCoach.nextSession).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric'
                          })
                        : 'Scheduled'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-bold border',
                      avgReadiness >= 80
                        ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30'
                        : avgReadiness >= 60
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                        : 'bg-rose-400/20 text-rose-300 border-rose-400/30'
                    )}
                  >
                    {job.interviewCoach?.readinessScore || 0}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-small text-indigo-200/70 italic py-2 text-center">
              No upcoming interviews. Add a job to start prepping!
            </div>
          )}
        </div>

        {/* Weak Areas Preview */}
        {weakAreas.length > 0 && (
          <div className="mt-3 pt-3 border-t border-indigo-500/20 relative z-10">
            <p className="text-[10px] font-medium text-indigo-200 mb-1.5 flex items-center gap-1">
              <TrendingUp size={12} />
              Focus Areas
            </p>
            <div className="flex flex-wrap gap-1">
              {weakAreas.slice(0, 2).map((area: string, idx: number) => (
                <span
                  key={idx}
                  className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-auto pt-3 text-right relative z-10">
          <span className="text-small font-medium text-indigo-100 group-hover:text-white transition-colors">
            Start Coaching →
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
