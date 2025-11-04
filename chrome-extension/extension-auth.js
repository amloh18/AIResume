/**
 * Simplified 4-Digit PIN Authentication System for Chrome Extension
 * Eliminates complex session management and uses simple PIN-based authentication
 */

class ExtensionAuth {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.authToken = null;
    this.apiBaseUrl = 'https://www.cvcircle.io';
    this.isDevelopment = false;
    
    this.init();
  }

  async init() {
    console.log('🔐 Extension Auth: Initializing 4-digit PIN authentication...');
    await this.detectEnvironment();
    await this.loadStoredAuth();
  }

  async detectEnvironment() {
    try {
      // Simple environment detection
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url) {
        if (tab.url.includes('localhost:3000') || tab.url.includes('127.0.0.1:3000')) {
          this.apiBaseUrl = 'http://localhost:3000';
          this.isDevelopment = true;
        } else if (tab.url.includes('cvcircle.io')) {
          this.apiBaseUrl = 'https://www.cvcircle.io';
          this.isDevelopment = false;
        }
      }
      
      // Fallback: check cookies for localhost
      if (!this.isDevelopment) {
        const localhostCookies = await chrome.cookies.getAll({
          domain: 'localhost'
        });
        
        if (localhostCookies.length > 0) {
          this.apiBaseUrl = 'http://localhost:3000';
          this.isDevelopment = true;
        }
      }
      
      console.log('🔍 Extension Auth: Environment detected:', this.apiBaseUrl);
    } catch (error) {
      console.log('⚠️ Extension Auth: Environment detection failed, using production');
      this.apiBaseUrl = 'https://www.cvcircle.io';
      this.isDevelopment = false;
    }
  }

  async loadStoredAuth() {
    try {
      const result = await chrome.storage.local.get(['authToken', 'currentUser', 'isAuthenticated', 'userEmail']);
      
      if (result.authToken && result.currentUser && result.isAuthenticated) {
        this.authToken = result.authToken;
        this.currentUser = result.currentUser;
        this.userEmail = result.userEmail;
        this.isAuthenticated = true;
        
        console.log('✅ Extension Auth: Loaded stored authentication');
        
        // Verify token is still valid
        const isValid = await this.verifyToken();
        if (isValid) {
          console.log('✅ Extension Auth: Token verified');
        } else {
          console.log('❌ Extension Auth: Token invalid, clearing auth');
          await this.clearAuth();
        }
      }
    } catch (error) {
      console.error('❌ Extension Auth: Error loading stored auth:', error);
    }
  }

  async saveAuth(token, user, userEmail = null) {
    try {
      this.authToken = token;
      this.currentUser = user;
      this.userEmail = userEmail;
      this.isAuthenticated = true;
      
      await chrome.storage.local.set({
        authToken: token,
        currentUser: user,
        userEmail: userEmail,
        isAuthenticated: true,
        authTimestamp: Date.now()
      });
      
      console.log('✅ Extension Auth: Authentication saved');
      
      // Notify background script of successful authentication
      try {
        await chrome.runtime.sendMessage({
          action: 'authStateChanged',
          isAuthenticated: true,
          user: user
        });
      } catch (error) {
        console.log('⚠️ Could not send auth state to background:', error);
      }
      
    } catch (error) {
      console.error('❌ Extension Auth: Error saving auth:', error);
      throw error;
    }
  }

  async clearAuth() {
    try {
      this.authToken = null;
      this.currentUser = null;
      this.userEmail = null;
      this.isAuthenticated = false;
      
      await chrome.storage.local.remove(['authToken', 'currentUser', 'isAuthenticated', 'authTimestamp', 'userEmail']);
      
      console.log('🔄 Extension Auth: Authentication cleared');
      
      // Notify background script
      try {
        await chrome.runtime.sendMessage({
          action: 'authStateChanged',
          isAuthenticated: false
        });
      } catch (error) {
        console.log('⚠️ Could not send logout to background:', error);
      }
      
    } catch (error) {
      console.error('❌ Extension Auth: Error clearing auth:', error);
    }
  }

  async verifyToken() {
    if (!this.authToken) return false;
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({ token: this.authToken })
      });
      
      return response.ok;
    } catch (error) {
      console.error('❌ Extension Auth: Token verification failed:', error);
      return false;
    }
  }

  // 4-Digit PIN Authentication
  async authenticateWithPIN(userEmail, pin) {
    try {
      console.log('🔐 Extension Auth: Attempting 4-digit PIN authentication...');
      
      // Validate inputs
      if (!userEmail || !userEmail.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        throw new Error('Please enter a valid 4-digit PIN');
      }
      
      const response = await fetch(`${this.apiBaseUrl}/api/auth/pin-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userEmail,
          pin: pin,
          extension: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const result = await response.json();
      
      if (result.user && result.token) {
        await this.saveAuth(result.token, result.user, userEmail);
        console.log('✅ Extension Auth: PIN authentication successful');
        return { success: true, user: result.user };
      } else {
        throw new Error('Invalid response from server');
      }
      
    } catch (error) {
      console.error('❌ Extension Auth: PIN authentication failed:', error);
      throw error;
    }
  }

  // Send PIN to email
  async sendPINToEmail(userEmail) {
    try {
      console.log('🔐 Extension Auth: Sending 4-digit PIN to email...');
      
      if (!userEmail || !userEmail.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      const response = await fetch(`${this.apiBaseUrl}/api/auth/send-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userEmail,
          extension: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send PIN');
      }

      console.log('✅ Extension Auth: PIN sent to email');
      return { success: true, message: '4-digit PIN sent to your email' };
      
    } catch (error) {
      console.error('❌ Extension Auth: Send PIN failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      if (this.authToken) {
        await fetch(`${this.apiBaseUrl}/api/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
      
      await this.clearAuth();
      console.log('✅ Extension Auth: Logout successful');
      
    } catch (error) {
      console.error('❌ Extension Auth: Logout error:', error);
      // Still clear local auth even if API call fails
      await this.clearAuth();
    }
  }

  async saveJob(jobData) {
    if (!this.isAuthenticated || !this.authToken) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(jobData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save job');
      }

      const result = await response.json();
      console.log('✅ Extension Auth: Job saved successfully');
      return result;
      
    } catch (error) {
      console.error('❌ Extension Auth: Job save failed:', error);
      throw error;
    }
  }

  async getUserJobs() {
    if (!this.isAuthenticated || !this.authToken) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/jobs?userId=${this.currentUser.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch jobs');
      }

      const result = await response.json();
      return result.data || { jobs: [] };
      
    } catch (error) {
      console.error('❌ Extension Auth: Get jobs failed:', error);
      throw error;
    }
  }

  getAuthState() {
    return {
      isAuthenticated: this.isAuthenticated,
      currentUser: this.currentUser,
      authToken: this.authToken,
      userEmail: this.userEmail,
      isDevelopment: this.isDevelopment,
      apiBaseUrl: this.apiBaseUrl
    };
  }

  isLoggedIn() {
    return this.isAuthenticated && this.currentUser;
  }

  // Get session info for background script
  getSessionInfo() {
    return {
      isAuthenticated: this.isAuthenticated,
      user: this.currentUser,
      token: this.authToken,
      email: this.userEmail,
      timestamp: Date.now()
    };
  }
}

// Export for use in other extension scripts
window.ExtensionAuth = ExtensionAuth;