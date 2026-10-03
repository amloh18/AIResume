import { useEffect, useRef } from 'react';

interface UseCanvasPinchZoomOptions {
  /** Ref to the scrollable canvas workspace container that owns zoom. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Current zoom value in the container's own units (see `scaleFor`). */
  zoomRef: React.MutableRefObject<number>;
  /** Apply a new zoom value (clamped) — typically the container's setZoom. */
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  /** Convert a raw two-finger distance (px) into container zoom units. */
  scaleFor: (pinchDistancePx: number) => number;
  /** Minimum two-finger distance (px) before a pinch is recognized. */
  minPinchDistancePx?: number;
  /** Lower bound for zoom values (clamped). */
  minZoom?: number;
  /** Upper bound for zoom values (clamped). */
  maxZoom?: number;
}

/**
 * Pinch-to-zoom for canvas containers.
 *
 * The editor blocks page-level pinch zoom (ZoomGuard) on steps 2-5; this hook
 * re-enables zooming *inside* the canvas container by tracking two-finger
 * touch distances on the workspace and feeding the delta into the container's
 * own zoom state. Wheel/trackpad zoom remains handled by each container.
 */
export function useCanvasPinchZoom({
  containerRef,
  zoomRef,
  setZoom,
  scaleFor,
  minPinchDistancePx = 40,
  minZoom,
  maxZoom,
}: UseCanvasPinchZoomOptions) {
  const initialDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number | null>(null);
  const setZoomRef = useRef(setZoom);
  setZoomRef.current = setZoom;
  const scaleForRef = useRef(scaleFor);
  scaleForRef.current = scaleFor;
  const clampRef = useRef<(z: number) => number>((z) => z);
  clampRef.current =
    minZoom !== undefined || maxZoom !== undefined
      ? (z) => {
          if (minZoom !== undefined) z = Math.max(minZoom, z);
          if (maxZoom !== undefined) z = Math.min(maxZoom, z);
          return z;
        }
      : (z) => z;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const getPinchDistance = (touches: TouchList): number | null => {
      if (touches.length < 2) return null;
      const [a, b] = [touches[0], touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const distance = getPinchDistance(e.touches);
      if (distance === null || distance < minPinchDistancePx) return;
      initialDistanceRef.current = distance;
      initialZoomRef.current = zoomRef.current;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (initialDistanceRef.current === null || initialZoomRef.current === null) return;
      const distance = getPinchDistance(e.touches);
      if (distance === null) return;
      // Page-level pinch is already blocked; canvas owns this gesture.
      e.preventDefault();
      const targetZoom = scaleForRef.current(distance);
      const delta = targetZoom - scaleForRef.current(initialDistanceRef.current);
      setZoomRef.current(clampRef.current(initialZoomRef.current + delta));
    };

    const handleTouchEnd = () => {
      initialDistanceRef.current = null;
      initialZoomRef.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, zoomRef, minPinchDistancePx]);
}
