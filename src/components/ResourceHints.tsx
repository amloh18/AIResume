'use client';

import { useEffect } from 'react';

/**
 * ResourceHints Component
 * Adds performance-critical resource hints to the document head
 * This component runs client-side to add preload, preconnect, and dns-prefetch hints
 */
export default function ResourceHints() {
  useEffect(() => {
    // Preload critical fonts
    const fontPreload = document.createElement('link');
    fontPreload.rel = 'preload';
    fontPreload.href = 'https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@300;400;500;600;700;800;900&display=swap';
    fontPreload.as = 'style';
    document.head.appendChild(fontPreload);

    // Preconnect to Google Fonts
    const fontPreconnect = document.createElement('link');
    fontPreconnect.rel = 'preconnect';
    fontPreconnect.href = 'https://fonts.googleapis.com';
    document.head.appendChild(fontPreconnect);

    const fontDnsPrefetch = document.createElement('link');
    fontDnsPrefetch.rel = 'dns-prefetch';
    fontDnsPrefetch.href = 'https://fonts.gstatic.com';
    document.head.appendChild(fontDnsPrefetch);

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

    // Preload critical images for better performance
    const logoPreload = document.createElement('link');
    logoPreload.rel = 'preload';
    logoPreload.as = 'image';
    logoPreload.href = '/images/logo.png';
    logoPreload.fetchPriority = 'high';
    document.head.appendChild(logoPreload);

    const heroBannerPreload = document.createElement('link');
    heroBannerPreload.rel = 'preload';
    heroBannerPreload.as = 'image';
    heroBannerPreload.href = '/images/herobanner.png';
    heroBannerPreload.fetchPriority = 'high';
    document.head.appendChild(heroBannerPreload);

    // Cleanup function (though these are safe to leave)
    return () => {
      // Links are safe to leave in the DOM, but we can clean up if needed
    };
  }, []);

  return null;
}

