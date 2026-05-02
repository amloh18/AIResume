// @ts-nocheck
/**
 * ATS Layer Rendering Optimization
 * Lazy loading, virtualization, memoization
 */

import { useMemo, useCallback, useRef } from 'react';

/**
 * Lazy load layers (only render active)
 */
export function useLazyLayer<T>(
  isActive: boolean,
  factory: () => T,
  deps: any[]
): T | null {
  return useMemo(() => {
    if (!isActive) return null;
    return factory();
  }, [isActive, ...deps]);
}

/**
 * Virtualize long timelines
 */
export interface VirtualizedItem {
  index: number;
  start: number;
  end: number;
  height: number;
}

export function useVirtualizedTimeline(
  items: any[],
  containerHeight: number,
  itemHeight: number = 80
): {
  visibleItems: VirtualizedItem[];
  totalHeight: number;
  offsetY: number;
} {
  const scrollTop = useRef(0);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // Buffer
  const startIndex = Math.max(0, Math.floor(scrollTop.current / itemHeight) - 1);
  const endIndex = Math.min(items.length, startIndex + visibleCount);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, idx) => ({
      index: startIndex + idx,
      start: (startIndex + idx) * itemHeight,
      end: (startIndex + idx + 1) * itemHeight,
      height: itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  return {
    visibleItems,
    totalHeight,
    offsetY: startIndex * itemHeight,
  };
}

/**
 * Memoize coordinate calculations
 */
const coordinateCache = new Map<string, { x: number; y: number; width: number; height: number }>();

export function memoizeCoordinates(
  key: string,
  calculate: () => { x: number; y: number; width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  if (coordinateCache.has(key)) {
    return coordinateCache.get(key)!;
  }

  const result = calculate();
  coordinateCache.set(key, result);
  return result;
}

/**
 * Clear coordinate cache
 */
export function clearCoordinateCache(): void {
  coordinateCache.clear();
}

/**
 * Use requestAnimationFrame for smooth animations
 */
export function useSmoothAnimation(
  callback: () => void,
  deps: any[]
): void {
  const frameRef = useRef<number>();

  useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      callback();
    });

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, deps)();
}

