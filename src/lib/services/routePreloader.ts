/**
 * Route Preloader Service
 * 
 * This service preloads components and data for faster page switching.
 * It uses intelligent caching and priority-based loading.
 */

interface PreloadConfig {
  priority: number;
  preloadOnHover: boolean;
  preloadOnIdle: boolean;
  cacheDuration: number;
}

interface RouteConfig {
  [key: string]: {
    component: () => Promise<any>;
    data?: () => Promise<any>;
    config: PreloadConfig;
  };
}

class RoutePreloader {
  private cache = new Map<string, any>();
  private preloadQueue = new Set<string>();
  private isIdle = false;

  constructor() {
    this.setupIdleDetection();
  }

  private setupIdleDetection() {
    if (typeof window === 'undefined') return;

    let idleTimer: NodeJS.Timeout;
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      this.isIdle = false;
      idleTimer = setTimeout(() => {
        this.isIdle = true;
        this.preloadIdleRoutes();
      }, 2000); // 2 seconds of inactivity
    };

    // Reset timer on user activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdleTimer, true);
    });

    resetIdleTimer();
  }

  private async preloadIdleRoutes() {
    if (!this.isIdle) return;

    const routes = [
      'analytics',
      'application-tracker', 
      'canvas',
      'application-journey',
      'settings'
    ];

    for (const route of routes) {
      if (!this.cache.has(route) && !this.preloadQueue.has(route)) {
        this.preloadRoute(route);
      }
    }
  }

  private async preloadRoute(route: string) {
    if (this.preloadQueue.has(route)) return;
    
    this.preloadQueue.add(route);

    try {
      let component;
      
      switch (route) {
        case 'analytics':
          component = await import('@/components/dashboard/Analytics');
          break;
        case 'application-tracker':
          component = await import('@/components/dashboard/ApplicationTracker');
          break;
        case 'canvas':
          component = await import('@/components/dashboard/Canvas');
          break;
        case 'application-journey':
          component = await import('@/app/dashboard/application-journey/page');
          break;
        case 'settings':
          component = await import('@/app/dashboard/settings/page');
          break;
        default:
          return;
      }

      this.cache.set(route, {
        component,
        timestamp: Date.now()
      });

    } catch (error) {
      console.warn(`Failed to preload ${route}:`, error);
    } finally {
      this.preloadQueue.delete(route);
    }
  }

  public async preloadOnHover(route: string) {
    if (this.cache.has(route)) return;
    await this.preloadRoute(route);
  }

  public getCachedComponent(route: string) {
    const cached = this.cache.get(route);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes
      return cached.component;
    }
    return null;
  }

  public clearCache() {
    this.cache.clear();
  }

  public getCacheStats() {
    return {
      cachedRoutes: Array.from(this.cache.keys()),
      cacheSize: this.cache.size,
      preloadQueue: Array.from(this.preloadQueue)
    };
  }
}

// Singleton instance
export const routePreloader = new RoutePreloader();

// Hook for using the preloader
export const useRoutePreloader = () => {
  return {
    preloadOnHover: (route: string) => routePreloader.preloadOnHover(route),
    getCachedComponent: (route: string) => routePreloader.getCachedComponent(route),
    clearCache: () => routePreloader.clearCache(),
    getCacheStats: () => routePreloader.getCacheStats()
  };
};

export default routePreloader;
