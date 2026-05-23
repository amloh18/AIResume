'use client';

import React, { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import ErrorPageTemplate from '@/components/ui/ErrorPageTemplate';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    console.error('Runtime error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <ErrorPageTemplate
      code="500"
      title="Something Went Wrong"
      message="We encountered an unexpected error. Our team has been notified and is working to fix it. Please try refreshing the page."
      onReset={reset}
    />
  );
}
