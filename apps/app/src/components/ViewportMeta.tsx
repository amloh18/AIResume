'use client';

import { useEffect } from 'react';

/**
 * ViewportMeta Component
 * 
 * Ensures viewport meta tag is properly set for all browsers,
 * especially Firefox and Safari which may not always respect Next.js viewport export.
 * This component runs client-side to add/update the viewport meta tag.
 */
export default function ViewportMeta() {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const defaultContent =
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';

    const ensureViewportMeta = () => {
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      // Always enforce standard viewport, overriding any previous dynamic values
      viewportMeta.setAttribute('content', defaultContent);
    };

    ensureViewportMeta();
  }, []);

  return null;
}

