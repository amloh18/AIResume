'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Canvas component for code splitting
// Removed loading skeleton - dashboard loads without animation
const Canvas = dynamic(() => import('@/components/dashboard/Canvas'), {
  ssr: false,
});

const CanvasPage: React.FC = () => {
  return (
    <Suspense fallback={null}>
      <Canvas />
    </Suspense>
  );
};

export default CanvasPage;
