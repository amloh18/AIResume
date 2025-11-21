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
    const desktopOverrideContent =
      'width=1280, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';

    const ensureViewportMeta = () => {
      let viewportMeta = document.querySelector('meta[name="viewport"]');

      if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.setAttribute('name', 'viewport');
        document.head.appendChild(viewportMeta);
      }

      return viewportMeta;
    };

    const viewportMeta = ensureViewportMeta();

    const isDesktopDevice = () =>
      typeof navigator !== 'undefined' &&
      /Macintosh|Windows|Linux/.test(navigator.userAgent || '') &&
      !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '');

    const shouldForceDesktopViewport = () => {
      if (typeof window === 'undefined') return false;

      const standaloneMatch = window.matchMedia?.('(display-mode: standalone)');
      const isStandalone = standaloneMatch?.matches ?? false;
      const hasFinePointer = window.matchMedia?.('(pointer: fine)')?.matches ?? false;

      return (
        isStandalone &&
        hasFinePointer &&
        isDesktopDevice() &&
        window.innerWidth < 1024
      );
    };

    const updateViewport = () => {
      if (!viewportMeta) {
        return;
      }

      if (shouldForceDesktopViewport()) {
        viewportMeta.setAttribute('content', desktopOverrideContent);
      } else {
        viewportMeta.setAttribute('content', defaultContent);
      }
    };

    updateViewport();

    const resizeListener = () => updateViewport();
    window.addEventListener('resize', resizeListener);

    const standaloneMatch = window.matchMedia?.('(display-mode: standalone)');
    const standaloneListener = () => updateViewport();
    if (standaloneMatch) {
      if (typeof standaloneMatch.addEventListener === 'function') {
        standaloneMatch.addEventListener('change', standaloneListener);
      } else if (typeof standaloneMatch.addListener === 'function') {
        standaloneMatch.addListener(standaloneListener);
      }
    }

    return () => {
      window.removeEventListener('resize', resizeListener);
      if (standaloneMatch) {
        if (typeof standaloneMatch.removeEventListener === 'function') {
          standaloneMatch.removeEventListener('change', standaloneListener);
        } else if (typeof standaloneMatch.removeListener === 'function') {
          standaloneMatch.removeListener(standaloneListener);
        }
      }
    };
  }, []);

  return null;
}

