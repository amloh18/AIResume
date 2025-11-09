'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Analytics component for code splitting
// Removed loading skeleton - dashboard loads without animation
const Analytics = dynamic(() => import('@/components/dashboard/Analytics'), {
  ssr: false,
});

const Dashboard: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <Analytics />
    </Suspense>
  );
};

export default Dashboard; 