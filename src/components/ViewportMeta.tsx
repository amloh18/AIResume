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
    // Ensure viewport meta tag exists and is correct
    if (typeof document !== 'undefined') {
      let viewportMeta = document.querySelector('meta[name="viewport"]');
      
      if (!viewportMeta) {
        // Create viewport meta tag if it doesn't exist
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }
      
      // Set viewport content for maximum compatibility
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover'
      );
    }
  }, []);

  return null;
}

