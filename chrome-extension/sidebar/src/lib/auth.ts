interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  token?: string;
  error?: string;
}

class AuthService {
  private async getApiBaseUrl(): Promise<string> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          chrome.runtime.sendMessage(
            { action: 'getEnvironment' },
            (response: any) => {
              // Check for runtime errors (context invalidation)
              if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message;
                if (errorMessage?.includes('Extension context invalidated')) {
                  console.warn('⚠️ Extension context invalidated, using default API URL');
                  resolve('https://www.cvcircle.io');
                  return;
                }
              }
              
              if (response && response.apiBaseUrl) {
                resolve(response.apiBaseUrl);
              } else {
                resolve('https://www.cvcircle.io');
              }
            }
          );
        } catch (error: any) {
          console.warn('⚠️ Error getting API URL, using default:', error);
          resolve('https://www.cvcircle.io');
        }
      } else {
        resolve('http://localhost:3000');
      }
    });
  }

  private async getAuthToken(userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          chrome.runtime.sendMessage(
            { action: 'generateJWT', userId },
            (response: any) => {
              // Check for runtime errors (context invalidation)
              if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message;
                if (errorMessage?.includes('Extension context invalidated')) {
                  reject(new Error('Extension context invalidated. Please reload the extension.'));
                  return;
                }
                reject(new Error(errorMessage || 'Unknown error'));
                return;
              }
              
              if (response?.success && response?.token) {
                resolve(response.token);
              } else {
                reject(new Error(response?.error || 'Failed to generate token'));
              }
            }
          );
        } catch (error: any) {
          reject(new Error(error.message || 'Failed to send message to background script'));
        }
      } else {
        reject(new Error('Chrome runtime not available'));
      }
    });
  }

  async loginWithPassword(email: string, password: string): Promise<AuthResult> {
    try {
      // Route through background script to handle cookies properly
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(
            {
              action: 'loginWithPassword',
              email,
              password,
            },
            (response: any) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Failed to communicate with extension',
                });
                return;
              }
              
              if (response && response.success) {
                resolve({
                  success: true,
                  user: response.user,
                  token: response.token,
                });
              } else {
                resolve({
                  success: false,
                  error: response?.error || 'Login failed',
                });
              }
            }
          );
        } else {
          resolve({
            success: false,
            error: 'Chrome runtime not available',
          });
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'An error occurred' };
    }
  }

  private async loginWithCredentials(email: string, password: string): Promise<AuthResult> {
    // This is now handled by loginWithPassword via background script
    return this.loginWithPassword(email, password);
  }

  async sendCode(email: string): Promise<AuthResult> {
    try {
      // Route through background script to handle cookies properly
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(
            {
              action: 'sendCode',
              email,
              type: 'passwordless-login',
            },
            (response: any) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Failed to communicate with extension',
                });
                return;
              }
              
              if (response && response.success) {
                resolve({ success: true });
              } else {
                resolve({
                  success: false,
                  error: response?.error || 'Failed to send code',
                });
              }
            }
          );
        } else {
          resolve({
            success: false,
            error: 'Chrome runtime not available',
          });
        }
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'An error occurred' };
    }
  }

  async loginWithCode(email: string, code: string): Promise<AuthResult> {
    try {
      // Route through background script to handle cookies properly
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          chrome.runtime.sendMessage(
            {
              action: 'loginWithCode',
              email,
              code,
            },
            (response: any) => {
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Failed to communicate with extension',
                });
                return;
              }
              
              if (response && response.success) {
                resolve({
                  success: true,
                  user: response.user,
                  token: response.token,
                });
              } else {
                resolve({
                  success: false,
                  error: response?.error || 'Invalid code',
                });
              }
            }
          );
        } else {
          resolve({
            success: false,
            error: 'Chrome runtime not available',
          });
        }
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Verification failed' };
    }
  }
}

export const authService = new AuthService();

