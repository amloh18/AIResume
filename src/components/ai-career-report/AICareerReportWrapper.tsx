'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the client component with ssr: false
const AICareerReportClient = dynamic(
  () => import('@/components/ai-career-report/AICareerReportClient'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#1A261A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading Master CV...</p>
        </div>
      </div>
    )
  }
);

export default function AICareerReportWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#1A261A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60">Loading Master CV...</p>
        </div>
      </div>
    }>
      <AICareerReportClient />
    </Suspense>
  );
}

