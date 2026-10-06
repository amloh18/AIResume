// Performance optimization utilities
export const optimizedTransitions = {
  fast: {
    duration: 0.15,
    ease: [0.4, 0, 0.2, 1] as const
  },
  normal: {
    duration: 0.2,
    ease: [0.4, 0, 0.2, 1] as const
  },
  slow: {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1] as const
  }
};

export const optimizedVariants = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  },
  slideUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  },
  slideDown: {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  },
  slideLeft: {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 }
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  },
  scale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  },
  modal: {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 }
  }
};

export const optimizedHoverEffects = {
  subtle: {
    scale: 1.008,
    transition: optimizedTransitions.fast
  },
  normal: {
    scale: 1.01,
    transition: optimizedTransitions.fast
  },
  card: {
    scale: 1.01,
    transition: optimizedTransitions.fast
  }
};

export const optimizedTapEffects = {
  subtle: {
    scale: 0.99,
    transition: optimizedTransitions.fast
  },
  normal: {
    scale: 0.98,
    transition: optimizedTransitions.fast
  }
};

// Performance optimization styles
export const performanceStyles = {
  gpuAccelerated: {
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    perspective: '1000px'
  },
  willChange: {
    transform: { willChange: 'transform' },
    opacity: { willChange: 'opacity' },
    transformOpacity: { willChange: 'transform, opacity' },
    auto: { willChange: 'auto' }
  }
};

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver(callback, {
    threshold: 0.1,
    rootMargin: '50px',
    ...options
  });
}

// Performance monitoring
export const performanceMonitor = {
  start: (label: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-start`);
    }
  },
  end: (label: string) => {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      const measure = performance.getEntriesByName(label)[0];
      console.log(`${label}: ${measure.duration.toFixed(2)}ms`);
    }
  }
};

// Memory optimization
export const memoryOptimizer = {
  // Clear unused event listeners
  clearEventListeners: (element: Element, eventType: string) => {
    const clone = element.cloneNode(true);
    element.parentNode?.replaceChild(clone, element);
  },
  
  // Optimize images
  optimizeImage: (src: string, width: number, height: number) => {
    // Add image optimization parameters
    return `${src}?w=${width}&h=${height}&fit=crop&auto=format`;
  }
};

// Animation performance helpers
export const animationHelpers = {
  // Check if user prefers reduced motion
  prefersReducedMotion: () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  },
  
  // Get optimized animation duration based on user preference
  getOptimizedDuration: (duration: number) => {
    return animationHelpers.prefersReducedMotion() ? 0.01 : duration;
  },
  
  // Create optimized spring animation
  createSpring: (stiffness: number = 100, damping: number = 10) => ({
    type: 'spring',
    stiffness,
    damping,
    mass: 1
  })
};

// Component performance optimization
export const componentOptimizer = {
  // Memoization helper
  memoize: <T extends (...args: any[]) => any>(fn: T): T => {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },
  
  // Lazy loading helper
  lazyLoad: <T>(importFn: () => Promise<{ default: T }>) => {
    return importFn().then(module => module.default);
  }
};

// CSS performance optimizations
export const cssOptimizations = {
  // Hardware acceleration
  gpuAccelerated: 'transform: translateZ(0); backface-visibility: hidden;',
  
  // Smooth scrolling
  smoothScroll: 'scroll-behavior: smooth;',
  
  // Optimized transitions
  fastTransition: 'transition: transform 120ms ease-out, background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease;',
  normalTransition: 'transition: transform 160ms ease-out, box-shadow 160ms ease-out, border-color 160ms ease-out, background-color 160ms ease-out;',
  slowTransition: 'transition: transform 200ms ease-out, box-shadow 200ms ease-out, border-color 200ms ease-out, background-color 200ms ease-out;'
};

// Export all optimizations
export default {
  optimizedTransitions,
  optimizedVariants,
  optimizedHoverEffects,
  optimizedTapEffects,
  performanceStyles,
  debounce,
  throttle,
  createIntersectionObserver,
  performanceMonitor,
  memoryOptimizer,
  animationHelpers,
  componentOptimizer,
  cssOptimizations
}; 