'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function SessionHubPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  useEffect(() => {
    if (jobId) {
      router.replace(`/dashboard/interview/${jobId}`);
    }
  }, [jobId, router]);

  return (
    <div className="absolute inset-0 dashboard-workspace flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-600 dark:border-lime-500 border-t-transparent animate-spin" />
    </div>
  );
}
