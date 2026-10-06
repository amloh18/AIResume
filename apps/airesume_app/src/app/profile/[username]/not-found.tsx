'use client';

import React from 'react';
import ErrorPageTemplate from '@/components/ui/ErrorPageTemplate';

export default function ProfileNotFound() {
  return (
    <ErrorPageTemplate
      code="404"
      title="Profile Not Found"
      message="The profile you're looking for doesn't exist or may have been removed. Please check the username and try again."
    />
  );
}
