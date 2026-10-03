'use client';

import React from 'react';
import ErrorPageTemplate from '@/components/ui/ErrorPageTemplate';

export default function NotFound() {
  return (
    <ErrorPageTemplate
      code="404"
      title="Page Not Found"
      message="Oops! The page you're looking for doesn't exist or has been moved to a new destination. Let's get you back on track."
    />
  );
}
