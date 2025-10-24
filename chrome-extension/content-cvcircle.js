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
  
  // Check for existing session immediately
  checkSessionStatus();
  
  // Set up periodic session checks
  sessionCheckInterval = setInterval(checkSessionStatus, 5000); // Check every 5 seconds
  
  // Listen for storage changes (localStorage/sessionStorage)
  window.addEventListener('storage', handleStorageChange);
  
  // Listen for page visibility changes (user might have logged in/out in another tab)
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Listen for custom events that might indicate auth state changes
  window.addEventListener('message', handleWindowMessage);
  
  console.log('✅ CVCircle session monitoring initialized');
}

// Check current session status
async function checkSessionStatus() {
  try {
    console.log('🔍 Checking session status...');
    
    // Try to get session from NextAuth
    const sessionResponse = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      const isAuthenticated = !!sessionData.user;
      
      console.log('🔍 Session check result:', { 
        isAuthenticated, 
        user: sessionData.user ? { id: sessionData.user.id, email: sessionData.user.email } : null 
      });
      
      // Check if session state has changed
      const currentSessionState = {
        isAuthenticated,
        userId: sessionData.user?.id,
        userEmail: sessionData.user?.email,
        timestamp: Date.now()
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
