'use client';

import { useEffect } from 'react';

/**
 * ZoomGuard
 *
 * Blocks native browser/page pinch-zoom and Ctrl/Cmd+wheel zoom while the
 * editor canvas steps (2 Template, 3 CV Builder, 4 Cover Letter, 5 Review)
 * are active. Zooming the whole page breaks the fixed-height editor shell,
 * the WYSIWYG canvas and the floating toolbars.
 *
 * Canvas zoom is NOT affected: each canvas container owns its own zoom
 * controls (useCanvasFit / per-step zoom state) and listens for wheel/touch
 * gestures scoped to that container. This component only stops gestures that
 * reach the document/window level, so wheel + pinch events inside a canvas
 * container are handled by the container first and never trigger page zoom.
 *
 * Implementation notes:
 * - Touch: `touch-action: none` on the guarded root prevents the browser's
 *   pinch-zoom gesture recognizer from acting on editor touches. Panning and
 *   scrolling inside scrollable editor areas is restored by re-enabling
 *   pan-x/pan-y on those elements.
 * - Wheel: Ctrl/Cmd+wheel (the standard desktop zoom gesture) is prevented
 *   at the document level when it is not already handled by a canvas
 *   container. Plain wheel scrolling is untouched.
 * - Gesture: Safari's proprietary Gesture* events are prevented to stop
 *   pinch-zoom on iOS Safari.
 */
export default function ZoomGuard({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const wheelZoomBlocker = (e: WheelEvent) => {
      // Ctrl/Cmd+wheel is the browser page-zoom shortcut. Only block it when
      // it has bubbled past every handler that had a chance to use it
      // (canvas containers stopPropagation for their own zoom).
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    const gestureBlocker = (e: Event) => e.preventDefault();

    const touchMoveBlocker = (e: TouchEvent) => {
      // Multi-touch (pinch) → always page zoom, block it. Single-touch
      // scrolling is left to the browser / scrollable containers.
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Allow vertical/horizontal panning on scrollable containers inside the
    // editor even though the guarded root sets `touch-action: none`.
    const allowScrollTouch = () => {
      const root = document.querySelector<HTMLElement>('[data-zoom-guard-root]');
      if (!root) return;
      root.querySelectorAll<HTMLElement>(
        '.overflow-y-auto, .overflow-x-auto, .overflow-auto, input[type="range"], input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea, select, [contenteditable="true"]'
      ).forEach((el) => {
        el.style.touchAction = 'pan-x pan-y';
      });
    };

    document.addEventListener('wheel', wheelZoomBlocker, { passive: false, capture: true });
    document.addEventListener('gesturestart', gestureBlocker as EventListener);
    document.addEventListener('gesturechange', gestureBlocker as EventListener);
    document.addEventListener('gestureend', gestureBlocker as EventListener);
    document.addEventListener('touchmove', touchMoveBlocker, { passive: false, capture: true });
    // Patch the viewport meta so mobile browsers refuse to scale the page
    // while the editor canvas steps are open (restored on cleanup).
    const viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const originalViewportContent = viewportMeta?.getAttribute('content') ?? null;
    if (viewportMeta) {
      viewportMeta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }

    // Run once on mount and again shortly after step content renders.
    allowScrollTouch();
    const raf = window.requestAnimationFrame(allowScrollTouch);
    const timeout = window.setTimeout(allowScrollTouch, 400);

    // Step content mounts/unmounts inside the guarded root (switching between
    // steps 3-5 never toggles `enabled`), so watch for new DOM and re-apply
    // scroll-friendly touch-action to any freshly mounted containers/fields.
    let mutationScheduled = false;
    const observer = new MutationObserver(() => {
      if (mutationScheduled) return;
      mutationScheduled = true;
      window.requestAnimationFrame(() => {
        mutationScheduled = false;
        allowScrollTouch();
      });
    });
    const root = document.querySelector('[data-zoom-guard-root]');
    if (root) {
      observer.observe(root, { childList: true, subtree: true });
    }

    return () => {
      document.removeEventListener('wheel', wheelZoomBlocker, { capture: true } as EventListenerOptions);
      document.removeEventListener('gesturestart', gestureBlocker as EventListener);
      document.removeEventListener('gesturechange', gestureBlocker as EventListener);
      document.removeEventListener('gestureend', gestureBlocker as EventListener);
      document.removeEventListener('touchmove', touchMoveBlocker, { capture: true } as EventListenerOptions);
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
      observer.disconnect();
      if (viewportMeta && originalViewportContent !== null) {
        viewportMeta.setAttribute('content', originalViewportContent);
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <style jsx global>{`
      [data-zoom-guard-root] {
        touch-action: none;
      }
    `}</style>
  );
}
