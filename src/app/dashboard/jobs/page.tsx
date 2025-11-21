'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { ApplicationTrackerSkeleton } from '@/components/ui/OptimizedSkeletons';

// Dynamically import JobsTracker component for code splitting
const JobsTracker = dynamic(() => import('@/components/dashboard/JobsTracker'), {
  ssr: false,
  loading: () => <ApplicationTrackerSkeleton />
});

const JobsPage: React.FC = () => {
  return (
    <Suspense fallback={<ApplicationTrackerSkeleton />}>
      <JobsTracker />
    </Suspense>
  );
};

export default JobsPage;

