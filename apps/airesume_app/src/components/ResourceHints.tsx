'use client';

import { useEffect } from 'react';

/**
 * ResourceHints Component
 * Adds performance-critical resource hints to the document head
 * This component runs client-side to add preload, preconnect, and dns-prefetch hints
 */
export default function ResourceHints() {
  useEffect(() => {
    // DNS prefetch for external domains
    const s3Prefetch1 = document.createElement('link');
    s3Prefetch1.rel = 'dns-prefetch';
    s3Prefetch1.href = 'https://s3.amazonaws.com';
    document.head.appendChild(s3Prefetch1);

    const uiAvatarsPrefetch = document.createElement('link');
    uiAvatarsPrefetch.rel = 'dns-prefetch';
    uiAvatarsPrefetch.href = 'https://ui-avatars.com';
    document.head.appendChild(uiAvatarsPrefetch);

    const googleUserPrefetch = document.createElement('link');
    googleUserPrefetch.rel = 'dns-prefetch';
    googleUserPrefetch.href = 'https://lh3.googleusercontent.com';
    document.head.appendChild(googleUserPrefetch);

    // Cleanup function (though these are safe to leave)
    return () => {
      // Links are safe to leave in the DOM, but we can clean up if needed
    };
  }, []);

  return null;
}
