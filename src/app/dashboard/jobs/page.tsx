import { Suspense } from 'react';
import JobsDashboard from '@/components/dashboard/JobsDashboard';
import JobsLoadingState from '@/components/dashboard/JobsDashboard/JobsLoadingState';
import RouteGuard from '@/components/auth/RouteGuard';

export const metadata = {
  title: 'Jobs - CV Circle',
  description: 'AI-powered job matching and automation dashboard',
};

export default function JobsPage() {
  return (
    /* Same rounded-card-with-margins shell as the dashboard: white workspace,
       off-white card inset right/bottom (+ left on mobile/tablet where the
       sidebar is hidden); content scrolls inside the card. */
    <div className="absolute inset-0 dashboard-workspace text-[#0f172a] dark:text-gray-150 font-sans overflow-hidden selection:bg-[#83d60d]/30 flex flex-col pr-3 pb-3 pl-3 lg:pl-0">
      <div className="dashboard-content-card rounded-2xl border border-[var(--border-primary)] shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide overscroll-contain">
          <Suspense fallback={<JobsLoadingState />}>
            <RouteGuard requireAuth={true}>
              <JobsDashboard />
            </RouteGuard>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
