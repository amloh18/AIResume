'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Briefcase, Columns3, List, Plus, SlidersHorizontal } from 'lucide-react';

const TrackerShell = () => (
  <div className="h-full flex flex-col min-w-0 w-full max-w-full overflow-hidden">
    <div className="flex-shrink-0 w-full px-0 sm:px-4 md:px-6">
      <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-lime-500/10 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-lime-500" />
            </div>
            <div>
              <h1 className="text-h2 font-black text-gray-900 dark:text-white">Application Tracker</h1>
              <div className="mt-1 h-3 w-44 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] flex items-center justify-center text-gray-500">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] flex items-center justify-center text-gray-500">
            <List className="h-4 w-4" />
          </button>
          <button className="h-10 w-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] flex items-center justify-center text-gray-500">
            <Columns3 className="h-4 w-4" />
          </button>
          <button className="h-10 px-4 rounded-xl bg-lime-500 text-black font-semibold text-small flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Job
          </button>
        </div>
      </div>
    </div>

    <div className="flex-1 min-h-0 w-full relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 bottom-0 mt-4 px-0 sm:px-4 md:px-6 overflow-hidden">
        <div className="h-full w-full overflow-hidden rounded-lg bg-white/60 dark:bg-[#141810]/60 border border-gray-200 dark:border-white/10">
          <div className="grid grid-cols-[40px_1.4fr_1fr_140px_120px] gap-4 border-b border-gray-200 dark:border-white/10 px-4 py-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 rounded bg-gray-200 dark:bg-white/10 animate-pulse" />
            ))}
          </div>
          <div className="divide-y divide-gray-200 dark:divide-white/10">
            {[...Array(8)].map((_, i) => (
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
    <Suspense fallback={<TrackerShell />}>
      <JobsTracker />
    </Suspense>
  );
};

export default TrackerPage;
