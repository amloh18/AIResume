/**
 * React hook for getting secure S3 URLs
 * Client-side only - must be used in client components
 */

'use client';

import { useState, useEffect } from 'react';
import { isS3Url, getSecureFileUrl } from '@/lib/utils/s3-utils';

/**
 * React hook to get secure S3 URL
 * Automatically fetches presigned URLs for S3 URLs
 */
export function useSecureS3Url(url: string | null | undefined): string | null {
  const [secureUrl, setSecureUrl] = useState<string | null>(url || null);

  useEffect(() => {
    if (!url) {
      setSecureUrl(null);
      return;
    }

    // If it's not an S3 URL, use it directly
    if (!isS3Url(url)) {
      setSecureUrl(url);
      return;
    }

    // For S3 URLs, get presigned URL
    getSecureFileUrl(url)
      .then(setSecureUrl)
      .catch((error) => {
        console.error('Error getting secure S3 URL:', error);
        setSecureUrl(url); // Fallback to original URL
      });
  }, [url]);

  return secureUrl;
}

