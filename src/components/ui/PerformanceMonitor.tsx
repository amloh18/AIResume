'use client';

import React, { useEffect, useState } from 'react';
import { performanceMonitor } from '@/lib/utils/performance';

interface PerformanceMetrics {
  fps: number;
  memory: number;
  loadTime: number;
  renderTime: number;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    memory: 0,
    loadTime: 0,
    renderTime: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Toggle visibility with Ctrl+Shift+P
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setMetrics(prev => ({ ...prev, fps }));
        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    // Measure memory usage
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
        setMetrics(prev => ({ ...prev, memory: Math.round(memory) }));
      }
    };

    // Measure page load time
    const measureLoadTime = () => {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      setMetrics(prev => ({ ...prev, loadTime }));
    };

    // Measure render time
    const measureRenderTime = () => {
      performanceMonitor.start('render');
      setTimeout(() => {
        performanceMonitor.end('render');
        setMetrics(prev => ({ ...prev, renderTime: performance.now() }));
      }, 0);
    };

    measureFPS();
    const memoryInterval = setInterval(measureMemory, 1000);
    const renderInterval = setInterval(measureRenderTime, 5000);

    // Initial measurements
    measureLoadTime();
    measureRenderTime();

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(memoryInterval);
      clearInterval(renderInterval);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const getPerformanceColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 45) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryColor = (memory: number) => {
    if (memory < 50) return 'text-green-400';
    if (memory < 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-white text-sm font-mono">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span>FPS:</span>
          <span className={getPerformanceColor(metrics.fps)}>{metrics.fps}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Memory:</span>
          <span className={getMemoryColor(metrics.memory)}>{metrics.memory}MB</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Load:</span>
          <span>{Math.round(metrics.loadTime)}ms</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Render:</span>
          <span>{Math.round(metrics.renderTime)}ms</span>
        </div>
      </div>
      <div className="mt-2 text-xs text-white/60">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

export default PerformanceMonitor; 