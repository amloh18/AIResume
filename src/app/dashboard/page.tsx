'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AnalyticsSkeleton } from '@/components/ui/OptimizedSkeletons';

// Dynamically import Analytics component for code splitting
const Analytics = dynamic(() => import('@/components/dashboard/Analytics'), {
  loading: () => <AnalyticsSkeleton />,
  ssr: false,
});

const Dashboard: React.FC = () => {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <Analytics />
    </Suspense>
  );
};

export default Dashboard; 