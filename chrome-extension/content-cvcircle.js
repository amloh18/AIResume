// Content script for CVCircle website - Session synchronization
console.log('CVCircle session sync content script loaded');

// Session monitoring state
let isMonitoring = false;
let lastSessionState = null;
let sessionCheckInterval = null;

// Initialize session monitoring
function initSessionMonitoring() {
  if (isMonitoring) return;
  
  console.log('🔍 Starting CVCircle session monitoring...');
  isMonitoring = true;
  
  // Check for existing session immediately and after a delay
  checkSessionStatus();
  setTimeout(checkSessionStatus, 2000); // Double-check after 2 seconds
  
  // Set up more frequent session checks
  sessionCheckInterval = setInterval(checkSessionStatus, 3000); // Check every 3 seconds
  
  // Listen for storage changes (localStorage/sessionStorage)
  window.addEventListener('storage', handleStorageChange);
  
  // Listen for page visibility changes (user might have logged in/out in another tab)
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Listen for custom events that might indicate auth state changes
  window.addEventListener('message', handleWindowMessage);
  
  // Listen for navigation events (user might have navigated to sign-in page)
  window.addEventListener('popstate', handleNavigation);
  window.addEventListener('hashchange', handleNavigation);
  
  // Listen for custom events that NextAuth might dispatch
  document.addEventListener('nextauth-session-update', handleCustomAuthEvent);
  
  console.log('✅ CVCircle session monitoring initialized');
}

// Check current session status with enhanced error handling
async function checkSessionStatus() {
  try {
    console.log('🔍 Checking session status...');
    
    // Determine the correct API base URL based on current domain
    const currentDomain = window.location.hostname;
    const isLocalhost = currentDomain.includes('localhost') ||
                       currentDomain.includes('127.0.0.1') ||
                       currentDomain.includes('cvcircle.local');
    
    const apiBaseUrl = isLocalhost ?
      (currentDomain.includes('127.0.0.1') ? 'http://127.0.0.1:3000' : 'http://localhost:3000') :
      'https://www.cvcircle.io';
    
    console.log(`🔍 Current domain: ${currentDomain}, API base: ${apiBaseUrl}`);
    
    // Try to get session from NextAuth with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const sessionResponse = await fetch(`${apiBaseUrl}/api/auth/session`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      const isAuthenticated = !!sessionData.user;
      
      console.log('🔍 Session check result:', {
        isAuthenticated,
        user: sessionData.user ? { id: sessionData.user.id, email: sessionData.user.email } : null,
        environment: isLocalhost ? 'development' : 'production'
      });
      
      // Check if session state has changed
      const currentSessionState = {
        isAuthenticated,
        userId: sessionData.user?.id,
        userEmail: sessionData.user?.email,
        userName: sessionData.user?.name || sessionData.user?.email,
        timestamp: Date.now(),
        environment: isLocalhost ? 'development' : 'production',
        domain: currentDomain
      };
      
      if (JSON.stringify(currentSessionState) !== JSON.stringify(lastSessionState)) {
        console.log('🔄 Session state changed, notifying extension...');
        lastSessionState = currentSessionState;
        
        // Notify background script
        await notifyBackgroundScript({
          action: 'sessionUpdate',
          sessionData: currentSessionState,
          source: 'cvcircle-website'
        });
      }
    } else {
      console.log('❌ Session check failed:', sessionResponse.status);
      
      // If we had a session before but now we don't, notify logout
      if (lastSessionState && lastSessionState.isAuthenticated) {
        console.log('🔄 User logged out, notifying extension...');
        lastSessionState = { isAuthenticated: false, timestamp: Date.now() };
        
        await notifyBackgroundScript({
          action: 'sessionUpdate',
          sessionData: lastSessionState,
          source: 'cvcircle-website'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking session status:', error);
  }
}

// Handle storage changes (might indicate auth state changes)
function handleStorageChange(event) {
  if (event.key && event.key.includes('next-auth')) {
    console.log('🔄 NextAuth storage changed, rechecking session...');
    setTimeout(checkSessionStatus, 1000); // Delay to allow NextAuth to update
  }
}

// Handle page visibility changes
function handleVisibilityChange() {
  if (!document.hidden) {
    console.log('🔄 Page became visible, rechecking session...');
    setTimeout(checkSessionStatus, 1000);
  }
}

// Handle window messages (from other scripts or auth flows)
function handleWindowMessage(event) {
  // Only handle messages from same origin
  if (event.origin !== window.location.origin) return;
  
  if (event.data && event.data.type === 'nextauth-session-update') {
    console.log('🔄 NextAuth session update message received');
    setTimeout(checkSessionStatus, 500);
  }
}

// Handle navigation events (user might have navigated to sign-in page)
function handleNavigation() {
  console.log('🔄 Page navigation detected, checking session...');
  setTimeout(checkSessionStatus, 1000);
}

// Handle custom auth events
function handleCustomAuthEvent(event) {
  console.log('🔄 Custom auth event received:', event.detail);
  setTimeout(checkSessionStatus, 500);
}

// Notify background script of session changes
async function notifyBackgroundScript(message) {
  try {
    const response = await chrome.runtime.sendMessage(message);
    console.log('✅ Background script notified:', response);
  } catch (error) {
    console.error('❌ Error notifying background script:', error);
  }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('CVCircle content script received message:', request);
  
  switch (request.action) {
    case 'checkSession':
      checkSessionStatus().then(() => {
        sendResponse({ success: true });
      });
      return true; // Keep message channel open
      
    case 'syncSession':
      checkSessionStatus().then(() => {
        sendResponse({ success: true, sessionState: lastSessionState });
      });
      return true;
      
    case 'stopMonitoring':
      stopSessionMonitoring();
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ success: false, message: 'Unknown action' });
  }
});

// Stop session monitoring
function stopSessionMonitoring() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
  
  isMonitoring = false;
  console.log('🛑 CVCircle session monitoring stopped');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSessionMonitoring);
} else {
  initSessionMonitoring();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  stopSessionMonitoring();
});

console.log('CVCircle session sync content script ready');
