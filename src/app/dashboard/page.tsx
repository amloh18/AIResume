'use client';

import React, { Suspense, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import RouteGuard from '@/components/auth/RouteGuard';
import { Skeleton } from '@/components/ui/Skeleton';
import RedesignedDashboardView from '@/components/dashboard/redesigned/RedesignedDashboardView';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { useMembership } from '@/lib/hooks/useMembership';

async function fetchOnboardingData() {
  const res = await authenticatedFetch('/api/user/onboarding');
  const result = await res.json();
  if (result.success && result.data) {
    return result.data.onboarding || {};
  }
  return null;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouteGuard requireAuth={true}>
        <DashboardContent />
      </RouteGuard>
    </Suspense>
  );
}

function DashboardContent() {
  const { data: session, status } = useSession();

  // --- All Hooks must be at the top ---
  const { membership } = useMembership();
  const { data: onboardingData } = useQuery({
    queryKey: ['dashboard', 'onboarding', session?.user?.id],
    queryFn: fetchOnboardingData,
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000,
  });

  const [notification, setNotification] = useState<string | null>(null);

  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  // Let onboarding data and membership load in the background to speed up dashboard initial paint
  // Only show fallback loader if we explicitly need to redirect due to pending onboarding activation
  if (onboardingData?.activation_status === 'pending' && onboardingData?.activation_route) {
    return <LoadingFallback />;
  }

  return (
    /* Cover the full main area (main is position:relative) so the page bg matches the
       sidebar; the card is inset on the right only — flush at top, left and bottom */
    <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden selection:bg-[#83d60d]/30 flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
        <style jsx global>{`
          /* Hide scrollbar for Chrome, Safari and Opera */
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          /* Hide scrollbar for IE, Edge and Firefox */
          .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
        `}</style>

        {/* Toast Notification Banner - Bottom Right */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-800"
            >
              <div className="w-2 h-2 rounded-full bg-[#83d60d] animate-ping" />
              <span className="text-small font-bold uppercase tracking-wider">{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rounded content area card — fills the viewport (minus header + margins) so its
            corners are always visible; content scrolls inside the card */}
        <div id="dashboard-container" className="flex-1 min-h-0">
          {/* Horizontal padding lives on the card; vertical padding is inside the scroll
              content so it scrolls away — no fixed blank band when scrolled to the ends */}
          <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm px-5 md:px-8 h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain">
              <div className="py-5 md:py-8">
                <RedesignedDashboardView />
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

/* Skeleton panel: a real card frame with a static title and skeleton rows */
function PanelSkeleton({
  title,
  subtitle,
  rows = 3,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  rows?: number;
  compact?: boolean;
}) {
  return (
    <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="dashboard-panel-title text-[var(--text-primary)]">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 ${compact ? 'justify-between' : ''}`}
          >
            <Skeleton className={`${compact ? 'h-3.5 w-2/3' : 'h-9 flex-1'}`} />
            {!compact && <Skeleton className="h-9 w-24" />}
            {!compact && <Skeleton className="h-9 w-16" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden selection:bg-[#83d60d]/30 flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
      <div id="dashboard-container" className="flex-1 min-h-0">
        <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm px-5 md:px-8 h-full min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain">
            <div className="py-5 md:py-8 space-y-6" role="status" aria-label="Loading dashboard">
              {/* Greeting — the greeting text depends on the user/session, so it
                  pulses as a skeleton block sized like the real heading */}
              <div className="pt-2" role="status" aria-label="Loading dashboard">
                <Skeleton className="h-7 w-64 max-w-full" />
                <Skeleton className="mt-2 h-4 w-80 max-w-full" />
              </div>

              {/* KPI strip skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-sm px-5 py-4"
                  >
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-3.5 w-20" />
                    </div>
                    <Skeleton className="mt-3 h-6 w-12" />
                    <Skeleton className="mt-1.5 h-3 w-24" />
                  </div>
                ))}
              </div>

              {/* Two-column workspace skeleton */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                  <PanelSkeleton title="My CVs" subtitle="Your CVs and their performance overview." rows={4} />
                  <PanelSkeleton title="Recent Jobs" subtitle="Jobs you're tracking and their current status." rows={4} />
                </div>
                <div className="space-y-6">
                  {/* Upgrade suggestion card skeleton — keeps the rail stable while
                      membership (and therefore the card) is still loading */}
                  <div className="relative overflow-hidden rounded-xl border border-lime-500/25 bg-gradient-to-br from-[#101b12] via-[#142114] to-[#0c140e] p-5">
                    <Skeleton className="h-3.5 w-28 rounded-full bg-white/10" />
                    <Skeleton className="mt-3 h-4 w-4/5 bg-white/10" />
                    <Skeleton className="mt-2 h-3 w-3/5 bg-white/10" />
                    <div className="mt-4 flex gap-2.5">
                      <Skeleton className="h-8 flex-1 rounded-lg bg-white/10" />
                      <Skeleton className="h-8 w-24 rounded-lg bg-white/10" />
                    </div>
                  </div>
                  <PanelSkeleton title="Continue where you left off" rows={2} compact />
                  <PanelSkeleton title="CV Health" rows={3} compact />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
