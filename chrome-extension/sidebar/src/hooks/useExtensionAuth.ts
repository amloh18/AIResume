import { useState, useEffect } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
  } | null;
  token: string | null;
}

export function useExtensionAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
  });

  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth updates from background script
    const handleMessage = (message: any) => {
      if (message.type === 'AUTH_UPDATE') {
        checkAuthStatus();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handleMessage);
      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    }
  }, []);

  const checkAuthStatus = () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(
          ['isAuthenticated', 'userData', 'authToken'],
          (result: { isAuthenticated?: boolean; userData?: any; authToken?: string }) => {
            if (result.isAuthenticated && result.userData && result.authToken) {
              setAuthState({
                isAuthenticated: true,
                isLoading: false,
                user: result.userData,
                token: result.authToken,
              });
            } else {
              setAuthState({
                isAuthenticated: false,
                isLoading: false,
                user: null,
                token: null,
              });
            }
          }
        );
      } else {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          token: null,
        });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
      });
    }
  };

  const login = (userData: any, token: string) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set(
        {
          isAuthenticated: true,
          userData,
          authToken: token,
        },
        () => {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: userData,
            token,
          });
        }
      );
    }
  };

  const logout = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(
        ['isAuthenticated', 'userData', 'authToken'],
        () => {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            user: null,
            token: null,
          });
        }
      );
    }
  };

  return {
    ...authState,
    login,
    logout,
    refreshAuth: checkAuthStatus,
  };
}

