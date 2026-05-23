'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import ErrorPageTemplate from '@/components/ui/ErrorPageTemplate';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#f3f2ee] dark:bg-[#1a230f]">
        <ErrorPageTemplate
          code="500"
          title="Critical Error"
          message="A critical system error has occurred. We've been notified and are investigating. Please try again later."
          onReset={reset}
        />
      </body>
    </html>
  );
}
