'use client';

import React from 'react';
import ErrorPageTemplate from '@/components/ui/ErrorPageTemplate';

export default function ForbiddenPage() {
  return (
    <ErrorPageTemplate
      code="403"
      title="Access Forbidden"
      message="You don't have permission to access this resource. Please make sure you're logged in with the correct account or contact support."
    />
  );
}
