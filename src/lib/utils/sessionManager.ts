import { useRouter } from 'next/navigation';

export interface SessionState {
  lastActivity: number;
  lastRoute: string;
  isActive: boolean;
}

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

class SessionManager {
  private static instance: SessionManager;
  private timeoutId: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private lastRoute: string = '/dashboard';
  private isActive: boolean = true;
  private onLogout: (() => void) | null = null;

  private constructor() {
    this.setupActivityListeners();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public setLogoutCallback(callback: () => void) {
    this.onLogout = callback;
  }

  public updateActivity() {
    this.lastActivity = Date.now();
    this.isActive = true;
    this.resetTimeout();
  }

  public updateRoute(route: string) {
    this.lastRoute = route;
    this.updateActivity();
  }

  public getLastRoute(): string {
    return this.lastRoute;
  }

  public getLastActivity(): number {
    return this.lastActivity;
  }

  public isSessionValid(): boolean {
    return Date.now() - this.lastActivity < SESSION_TIMEOUT;
  }

  public forceLogout() {
    this.isActive = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    if (this.onLogout) {
      this.onLogout();
    }
  }

  private setupActivityListeners() {
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateActivity();
      }
    });
  }

  private resetTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.handleSessionTimeout();
    }, SESSION_TIMEOUT);
  }

  private handleSessionTimeout() {
    console.log('Session timeout - logging out user');
    this.forceLogout();
  }
}

export default SessionManager;
