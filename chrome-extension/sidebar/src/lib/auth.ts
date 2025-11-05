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

