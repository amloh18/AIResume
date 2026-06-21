'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CanvasRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect all canvas traffic to the editor (Step 1)
    const queryString = searchParams.toString();
    const destination = `/editor${queryString ? `?${queryString}` : ''}`;
    router.replace(destination);
  }, [router, searchParams]);

  return null;
}

export default function CanvasPage() {
  return (
    <Suspense fallback={null}>
      <CanvasRedirect />
    </Suspense>
  );
}
