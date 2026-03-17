'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Use the consolidated AnalyticsPage with tabs
const AnalyticsPage = dynamic(() => import('@/components/dashboard/AnalyticsPage'), {
  ssr: false,
});

const DashboardPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
      </div>
    }>
      <AnalyticsPage />
    </Suspense>
  );
};

export default DashboardPage; 