'use client';

import { Skeleton } from './Skeleton';

interface PageSkeletonProps {
  cards?: number;
}

/**
 * Generic content-area skeleton used while the session/route is being verified.
 *
 * Unlike the old full-screen LoadingOverlay, this flows inside the page layout —
 * the app chrome (sidebar, top bar) stays visible and only the content region
 * shows skeleton cards. Headings/static chrome are never covered.
 */
export default function PageSkeleton({ cards = 6 }: PageSkeletonProps) {
  return (
    <div className="w-full h-full min-h-0 flex flex-col" role="status" aria-label="Loading content">
      {/* Title bar skeleton */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="space-y-2.5">
          <Skeleton className="h-6 w-48 sm:w-64" />
          <Skeleton className="h-3.5 w-72 sm:w-96 max-w-full" />
        </div>
        <Skeleton className="hidden sm:block h-9 w-28" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
