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
    <div className="min-h-screen app-page-bg p-4 lg:p-6">
      <Suspense fallback={<JobsLoadingState />}>
        <RouteGuard requireAuth={true}>
          <JobsDashboard />
        </RouteGuard>
      </Suspense>
    </div>
  );
}
