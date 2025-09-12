import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface SecureAuthState {
  isAuthenticated: boolean;
  user: any;
  accessToken: string | null;
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseSecureAuthReturn extends SecureAuthState {
  refreshToken: () => Promise<boolean>;
  logout: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

export function useSecureAuth(): UseSecureAuthReturn {
  const { data: session } = useSession();
  const [state, setState] = useState<SecureAuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    csrfToken: null,
    isLoading: true,
    error: null
  });

  // Get CSRF token from cookie
  const getCSRFToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(/csrf-token=([^;]+)/);
    return match ? match[1] : null;
  }, []);

  // Get auth headers for API requests
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
    
    if (state.accessToken) {
      headers['Authorization'] = `Bearer ${state.accessToken}`;
    }
    
    return headers;
  }, [state.accessToken, getCSRFToken]);

  // Refresh access token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setState(prev => ({
            ...prev,
            accessToken: data.data.accessToken,
            csrfToken: data.data.csrfToken,
            error: null
          }));
          return true;
        }
      }
      
      // If refresh fails, clear auth state
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        csrfToken: null,
        error: 'Session expired'
      }));
      
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      setState(prev => ({
        ...prev,
        error: 'Network error during token refresh'
      }));
      return false;
    }
  }, [getAuthHeaders]);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear client-side state regardless of API response
      setState({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        csrfToken: null,
        isLoading: false,
        error: null
      });
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-session');
        sessionStorage.removeItem('user');
      }
    }
  }, [getAuthHeaders]);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check NextAuth session first
        if (session?.user) {
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            user: session.user,
            accessToken: null, // NextAuth handles tokens internally
            csrfToken: getCSRFToken(),
            isLoading: false,
            error: null
          }));
          return;
        }

        // Check localStorage for custom auth
        const authSession = localStorage.getItem('auth-session');
        if (authSession) {
          try {
            const sessionData = JSON.parse(authSession);
            if (sessionData.user && sessionData.tokens && Date.now() < sessionData.expiresAt) {
              setState(prev => ({
                ...prev,
                isAuthenticated: true,
                user: sessionData.user,
                accessToken: sessionData.tokens.accessToken,
                csrfToken: sessionData.csrfToken,
                isLoading: false,
                error: null
              }));
              return;
            }
          } catch (error) {
            console.error('Error parsing auth session:', error);
            localStorage.removeItem('auth-session');
          }
        }

        // No authentication found
        setState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          accessToken: null,
          csrfToken: getCSRFToken(),
          isLoading: false,
          error: null
        }));

      } catch (error) {
        console.error('Auth check error:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication check failed'
        }));
      }
    };

    checkAuth();
  }, [session, getCSRFToken]);

  // Set up automatic token refresh
  useEffect(() => {
    if (!state.isAuthenticated || !state.accessToken) return;

    const checkTokenExpiry = () => {
      try {
        // Decode token to check expiry (simple base64 decode)
        const payload = JSON.parse(atob(state.accessToken!.split('.')[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeToExpiry = expiryTime - currentTime;

        // Refresh if token expires within 5 minutes
        if (timeToExpiry < 5 * 60 * 1000) {
          refreshToken();
        }
      } catch (error) {
        console.error('Error checking token expiry:', error);
      }
    };

    // Check immediately and then every minute
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60 * 1000);

    return () => clearInterval(interval);
  }, [state.isAuthenticated, state.accessToken, refreshToken]);

  // Listen for token refresh signals from middleware
  useEffect(() => {
    const handleResponse = (event: Event) => {
      const response = (event as any).detail;
      if (response?.headers?.get('X-Token-Refresh-Required') === 'true') {
        refreshToken();
      }
    };

    window.addEventListener('api-response', handleResponse);
    return () => window.removeEventListener('api-response', handleResponse);
  }, [refreshToken]);

  return {
    ...state,
    refreshToken,
    logout,
    getAuthHeaders
  };
}

// Interceptor for fetch requests to handle token refresh
export function createAuthenticatedFetch() {
  const originalFetch = window.fetch;

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const response = await originalFetch(input, init);
      
      // Dispatch custom event for middleware signals
      if (response.headers.get('X-Token-Refresh-Required') === 'true') {
        const event = new CustomEvent('api-response', { detail: response });
        window.dispatchEvent(event);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  };
}
