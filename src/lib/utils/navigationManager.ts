class NavigationManager {
  private static instance: NavigationManager;
  private isAuthenticated: boolean = false;
  private protectedRoutes: string[] = ['/dashboard', '/studio'];
  private publicRoutes: string[] = ['/', '/auth/signin', '/auth/signup'];

  private constructor() {
    this.setupHistoryListener();
  }

  public static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  public setAuthenticationStatus(isAuth: boolean) {
    this.isAuthenticated = isAuth;
  }

  public isProtectedRoute(pathname: string): boolean {
    return this.protectedRoutes.some(route => pathname.startsWith(route));
  }

  public isPublicRoute(pathname: string): boolean {
    return this.publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  }

  public shouldPreventNavigation(fromPath: string, toPath: string): boolean {
    // If authenticated and trying to navigate to public route, prevent it
    if (this.isAuthenticated && this.isPublicRoute(toPath)) {
      return true;
    }

    // If not authenticated and trying to navigate to protected route, allow it (will be handled by route guard)
    if (!this.isAuthenticated && this.isProtectedRoute(toPath)) {
      return false;
    }

    return false;
  }

  public navigateToRoute(router: any, pathname: string, replace: boolean = false) {
    if (this.shouldPreventNavigation(window.location.pathname, pathname)) {
      console.log('Navigation prevented to:', pathname);
      return false;
    }

    if (replace) {
      router.replace(pathname);
    } else {
      router.push(pathname);
    }
    return true;
  }

  private setupHistoryListener() {
    // Listen for popstate events (back/forward button)
    window.addEventListener('popstate', (event) => {
      if (this.isAuthenticated) {
        const currentPath = window.location.pathname;
        
        // If trying to navigate to a public route while authenticated, prevent it
        if (this.isPublicRoute(currentPath)) {
          console.log('Preventing back navigation to public route:', currentPath);
          
          // Push the current authenticated route back to history
          const sessionManager = SessionManager.getInstance();
          const lastRoute = sessionManager.getLastRoute();
          
          // Replace the current history entry with the last authenticated route
          window.history.replaceState(null, '', lastRoute || '/dashboard');
          
          // Prevent the navigation
          event.preventDefault();
          return;
        }
      }
    });
  }

  public cleanHistory(router: any, currentPath: string) {
    // Remove any public routes from history if authenticated
    if (this.isAuthenticated) {
      const history = window.history;
      const currentIndex = history.length - 1;
      
      // This is a simplified approach - in a real implementation,
      // you might want to track history entries more carefully
      if (this.isPublicRoute(currentPath)) {
        // Replace current entry with dashboard
        history.replaceState(null, '', '/dashboard');
      }
    }
  }
}

// Import SessionManager at the top
import SessionManager from './sessionManager';

export default NavigationManager;
