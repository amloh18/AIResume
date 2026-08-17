'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Briefcase, Plus } from 'lucide-react';

const TrackerShell = () => (
  <div className="flex flex-col min-w-0 w-full max-w-full">
    {/* Compact skeleton header matching the real PageHeader height */}
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-lime-500/10 flex items-center justify-center shrink-0">
          <Briefcase className="h-4 w-4 text-lime-500" />
        </div>
        <div className="min-w-0">
          <div className="h-4 w-36 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
          <div className="mt-1.5 h-3 w-24 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-white/10 animate-pulse" />
        <div className="h-8 px-3 rounded-lg bg-lime-500/15 animate-pulse flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5 text-lime-600" />
        </div>
      </div>
    </div>

    {/* Skeleton table card */}
    <div className="mt-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-[#141810]/60 overflow-hidden">
      <div className="grid grid-cols-[40px_1.4fr_1fr_140px_120px] gap-4 border-b border-gray-200 dark:border-white/10 px-4 py-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-3 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
        ))}
      </div>
      <div className="divide-y divide-gray-200 dark:divide-white/10">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="grid grid-cols-[40px_1.4fr_1fr_140px_120px] gap-4 px-4 py-4">
            <div className="h-4 w-4 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-4/5 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
              <div className="h-3 w-2/5 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
            </div>
            <div className="h-4 w-3/5 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
            <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Dynamically import JobsTracker component for code splitting
const JobsTracker = dynamic(() => import('@/components/dashboard/JobsTracker'), {
  ssr: false,
  loading: () => <TrackerShell />
});

const TrackerPage: React.FC = () => {
  return (
    /* Same shell as the home dashboard: full-area page bg matching the sidebar,
       content in a rounded off-white card inset on the right only */
    <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden selection:bg-[#83d60d]/30 flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
      <div className="flex-1 min-h-0">
        <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm px-5 md:px-8 h-full min-h-0 flex flex-col overflow-hidden">
          {/* The tracker manages its own internal layout (fixed header + scrolling
              content), so it fills the card directly without an extra scroll layer */}
          <div className="flex-1 min-h-0 flex flex-col">
            <Suspense fallback={<TrackerShell />}>
              <JobsTracker />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackerPage;
