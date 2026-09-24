// Performance monitoring utilities for measuring dashboard improvements
'use client';

import React from 'react';

interface PerformanceMetrics {
  pageLoadTime: number;
  dataFetchTime: number;
  renderTime: number;
  cacheHitRate: number;
  bundleSize: number;
  memoryUsage: number;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceEntry> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    total: 0
  };

  // Start timing a performance entry
  startTiming(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now()
    });
  }

  // End timing a performance entry
  endTiming(name: string): number {
    const entry = this.metrics.get(name);
    if (!entry) {
      console.warn(`Performance entry "${name}" not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - entry.startTime;

    this.metrics.set(name, {
      ...entry,
      endTime,
      duration
    });

    return duration;
  }

  // Get timing for a specific entry
  getTiming(name: string): number {
    const entry = this.metrics.get(name);
    return entry?.duration || 0;
  }

  // Record cache hit
  recordCacheHit(): void {
    this.cacheStats.hits++;
    this.cacheStats.total++;
  }

  // Record cache miss
  recordCacheMiss(): void {
    this.cacheStats.misses++;
    this.cacheStats.total++;
  }

  // Get cache hit rate
  getCacheHitRate(): number {
    if (this.cacheStats.total === 0) return 0;
    return (this.cacheStats.hits / this.cacheStats.total) * 100;
  }

  // Measure page load performance
  measurePageLoad(pageName: string): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    
    return {
      pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
      dataFetchTime: this.getTiming(`${pageName}-data-fetch`),
      renderTime: firstContentfulPaint ? firstContentfulPaint.startTime : 0,
      cacheHitRate: this.getCacheHitRate(),
      bundleSize: this.estimateBundleSize(),
      memoryUsage: this.getMemoryUsage()
    };
  }

  // Estimate bundle size (approximate)
  private estimateBundleSize(): number {
    const scripts = document.querySelectorAll('script[src]');
    let totalSize = 0;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && src.includes('_next/static')) {
        // Estimate based on typical Next.js bundle sizes
        totalSize += 50000; // 50KB per script estimate
      }
    });
    
    return totalSize;
  }

  // Get memory usage (if available)
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize;
    }
    return 0;
  }

  // Get all metrics
  getAllMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};
    
    this.metrics.forEach((entry, name) => {
      metrics[name] = entry.duration || 0;
    });
    
    metrics.cacheHitRate = this.getCacheHitRate();
    metrics.cacheStats = this.cacheStats;
    
    return metrics;
  }

  // Clear all metrics
  clear(): void {
    this.metrics.clear();
    this.cacheStats = { hits: 0, misses: 0, total: 0 };
  }

  // Log performance report
  logReport(pageName: string): void {
    const metrics = this.measurePageLoad(pageName);
    
    console.group(`🚀 Performance Report - ${pageName}`);
    console.log(`📊 Page Load Time: ${metrics.pageLoadTime.toFixed(2)}ms`);
    console.log(`📡 Data Fetch Time: ${metrics.dataFetchTime.toFixed(2)}ms`);
    console.log(`🎨 Render Time: ${metrics.renderTime.toFixed(2)}ms`);
    console.log(`💾 Cache Hit Rate: ${metrics.cacheHitRate.toFixed(1)}%`);
    console.log(`📦 Bundle Size: ${(metrics.bundleSize / 1024).toFixed(1)}KB`);
    if (metrics.memoryUsage > 0) {
      console.log(`🧠 Memory Usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }
    console.groupEnd();
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor(pageName: string) {
  const startPageLoad = () => {
    performanceMonitor.startTiming(`${pageName}-page-load`);
  };

  const endPageLoad = () => {
    const duration = performanceMonitor.endTiming(`${pageName}-page-load`);
    performanceMonitor.logReport(pageName);
    return duration;
  };

  const startDataFetch = () => {
    performanceMonitor.startTiming(`${pageName}-data-fetch`);
  };

  const endDataFetch = () => {
    return performanceMonitor.endTiming(`${pageName}-data-fetch`);
  };

  const recordCacheHit = () => {
    performanceMonitor.recordCacheHit();
  };

  const recordCacheMiss = () => {
    performanceMonitor.recordCacheMiss();
  };

  return {
    startPageLoad,
    endPageLoad,
    startDataFetch,
    endDataFetch,
    recordCacheHit,
    recordCacheMiss,
    getMetrics: () => performanceMonitor.getAllMetrics()
  };
}

// Utility function to measure component render time
export function measureRenderTime<T extends React.ComponentType<any>>(
  Component: T,
  componentName: string
): T {
  const WrappedComponent = React.forwardRef<any, React.ComponentProps<T>>((props, ref) => {
    const startTime = performance.now();
    
    const result = React.createElement(Component, { ...props, ref });
    
    React.useEffect(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      console.log(`🎨 ${componentName} render time: ${renderTime.toFixed(2)}ms`);
    });
    
    return result;
  });

  // Display name for React DevTools / profiler output (also satisfies react/display-name).
  WrappedComponent.displayName = `measureRenderTime(${componentName})`;

  return WrappedComponent as unknown as T;
}

// Performance comparison utility
export function comparePerformance(before: PerformanceMetrics, after: PerformanceMetrics) {
  const improvements = {
    pageLoadTime: ((before.pageLoadTime - after.pageLoadTime) / before.pageLoadTime) * 100,
    dataFetchTime: ((before.dataFetchTime - after.dataFetchTime) / before.dataFetchTime) * 100,
    renderTime: ((before.renderTime - after.renderTime) / before.renderTime) * 100,
    cacheHitRate: after.cacheHitRate - before.cacheHitRate,
    bundleSize: ((before.bundleSize - after.bundleSize) / before.bundleSize) * 100
  };

  console.group('📈 Performance Improvements');
  console.log(`⚡ Page Load Time: ${improvements.pageLoadTime.toFixed(1)}% faster`);
  console.log(`📡 Data Fetch Time: ${improvements.dataFetchTime.toFixed(1)}% faster`);
  console.log(`🎨 Render Time: ${improvements.renderTime.toFixed(1)}% faster`);
  console.log(`💾 Cache Hit Rate: +${improvements.cacheHitRate.toFixed(1)}%`);
  console.log(`📦 Bundle Size: ${improvements.bundleSize.toFixed(1)}% smaller`);
  console.groupEnd();

  return improvements;
}

export default performanceMonitor;
