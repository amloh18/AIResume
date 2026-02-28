import { Suspense } from 'react';
import JobsDashboard from '@/components/dashboard/JobsDashboard';
import JobsLoadingState from '@/components/dashboard/JobsDashboard/JobsLoadingState';

export const metadata = {
  title: 'Jobs - CV Circle',
  description: 'AI-powered job matching and automation dashboard',
};

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-[#f3f2ee] dark:bg-[#1a230f] p-4 lg:p-6">
      <Suspense fallback={<JobsLoadingState />}>
        <JobsDashboard />
      </Suspense>
    </div>
  );
}
