'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { CanvasSkeleton } from '@/components/ui/OptimizedSkeletons';

// Dynamically import Canvas component for code splitting
const Canvas = dynamic(() => import('@/components/dashboard/Canvas'), {
  loading: () => <CanvasSkeleton />,
  ssr: false,
});

const CanvasPage: React.FC = () => {
  return (
    <Suspense fallback={<CanvasSkeleton />}>
      <Canvas />
    </Suspense>
  );
};

export default CanvasPage;
