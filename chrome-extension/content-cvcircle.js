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
    
    // Use the current page's origin to avoid CORS issues
    // This ensures we're making a same-origin request
    const apiBaseUrl = window.location.origin;
    const currentDomain = window.location.hostname;
    
    // Verify we're on a CVCircle domain
    const isCvCircleDomain = currentDomain.includes('cvcircle.io') || 
                             currentDomain.includes('localhost') ||
                             currentDomain.includes('127.0.0.1') ||
                             currentDomain.includes('cvcircle.local');
    
    if (!isCvCircleDomain) {
      console.log('⚠️ Not on CVCircle domain, skipping session check');
      return;
    }
    
    console.log(`🔍 Current domain: ${currentDomain}, API base: ${apiBaseUrl}`);
    
    // Use background script to get session (avoids CORS issues)
    // This is the recommended approach for extensions
    if (isExtensionContextValid()) {
      try {
        // Wrap in Promise to properly handle both callback and Promise-based APIs
        const bgResponse = await new Promise((resolve, reject) => {
          try {
            chrome.runtime.sendMessage({
              type: 'GET_SESSION',
              action: 'getSession', // Support both formats
              source: 'cvcircle-website'
            }, (response) => {
              // Check for runtime errors
              if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message;
                
                // If context is invalidated, don't throw - just return null
                if (errorMessage.includes('Extension context invalidated') || 
                    errorMessage.includes('message port closed') ||
                    errorMessage.includes('Could not establish connection')) {
                  console.warn('⚠️ Extension context invalidated');
                  resolve(null);
                  return;
                }
                
                reject(new Error(errorMessage));
                return;
              }
              
              resolve(response);
            });
          } catch (error) {
            reject(error);
          }
        });
        
        if (!bgResponse) {
          // Context invalidated, skip this check
          return;
        }
        
        if (bgResponse && bgResponse.success && bgResponse.session) {
          const sessionData = bgResponse.session;
          const isAuthenticated = !!sessionData.user;
          
          const isLocalhost = currentDomain.includes('localhost') ||
                             currentDomain.includes('127.0.0.1') ||
                             currentDomain.includes('cvcircle.local');
          
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
            console.log('🔄 Session state changed (from background), notifying extension...');
            lastSessionState = currentSessionState;
            
            await notifyBackgroundScript({
              action: 'sessionUpdate',
              sessionData: currentSessionState,
              source: 'cvcircle-website'
            });
          }
          
          return; // Successfully got session from background
        } else if (bgResponse && !bgResponse.success) {
          // No valid session
          if (lastSessionState && lastSessionState.isAuthenticated) {
            console.log('🔄 User logged out, notifying extension...');
            lastSessionState = { isAuthenticated: false, timestamp: Date.now() };
            
            await notifyBackgroundScript({
              action: 'sessionUpdate',
              sessionData: lastSessionState,
              source: 'cvcircle-website'
            });
          }
          return;
        }
      } catch (bgError) {
        console.warn('⚠️ Background script failed:', bgError);
        // Fallback to direct fetch only if on same origin
        if (window.location.origin === apiBaseUrl) {
          try {
            const sessionResponse = await fetch(`${apiBaseUrl}/api/auth/session`, {
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
              
              const isLocalhost = currentDomain.includes('localhost') ||
                                 currentDomain.includes('127.0.0.1') ||
                                 currentDomain.includes('cvcircle.local');
              
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
                
                await notifyBackgroundScript({
                  action: 'sessionUpdate',
                  sessionData: currentSessionState,
                  source: 'cvcircle-website'
                });
              }
            }
          } catch (fetchError) {
            console.warn('⚠️ Direct fetch also failed:', fetchError);
          }
        }
      }
    }
    
  } catch (error) {
    // Handle different types of errors gracefully
    if (error.name === 'AbortError') {
      console.warn('⏱️ Session check timed out after 10 seconds');
    } else if (error.message?.includes('Failed to fetch')) {
      // This usually means CORS or network issue
      // Check if we're on the correct domain
      const currentDomain = window.location.hostname;
      const isCvCircleDomain = currentDomain.includes('cvcircle.io') || 
                               currentDomain.includes('localhost') ||
                               currentDomain.includes('127.0.0.1');
      
      if (!isCvCircleDomain) {
        console.warn('⚠️ Not on CVCircle domain, skipping session check');
        return; // Don't log as error if we're not on the right domain
      }
      
      console.error('❌ Failed to fetch session (CORS or network issue):', error.message);
      console.log('💡 Tip: Make sure you\'re on the correct CVCircle domain');
    } else {
      console.error('❌ Error checking session status:', error);
    }
    
    // Don't throw or break execution - just log and continue
    // The extension will retry on the next interval
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
// Check if extension context is still valid
function isExtensionContextValid() {
  try {
    // Try to access chrome.runtime.id - if it throws, context is invalid
    return chrome.runtime && chrome.runtime.id !== undefined;
  } catch (error) {
    return false;
  }
}

async function notifyBackgroundScript(message) {
  // Check if extension context is valid before sending
  if (!isExtensionContextValid()) {
    console.warn('⚠️ Extension context invalidated, skipping notification');
    return null;
  }

  try {
    // Wrap in Promise to properly handle both callback and Promise-based APIs
    const response = await new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            const errorMessage = chrome.runtime.lastError.message;
            
            // If context is invalidated, stop trying and clean up
            if (errorMessage.includes('Extension context invalidated') || 
                errorMessage.includes('message port closed') ||
                errorMessage.includes('Could not establish connection')) {
              console.warn('⚠️ Extension context invalidated, stopping session monitoring');
              stopSessionMonitoring();
              resolve(null);
              return;
            }
            
            // Log other errors but don't throw
            console.warn('⚠️ Runtime error:', errorMessage);
            resolve(null);
            return;
          }
          
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
    
    if (response) {
      console.log('✅ Background script notified:', response);
    }
    return response;
  } catch (error) {
    // Only log if it's not a context invalidation error (we already handled that)
    if (!error.message?.includes('Extension context invalidated') &&
        !error.message?.includes('message port closed') &&
        !error.message?.includes('Could not establish connection')) {
      console.error('❌ Error notifying background script:', error);
    }
    return null;
  }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('CVCircle content script received message:', request);
  
  // Handle session update broadcasts
  if (request.type === 'SESSION_UPDATED' || request.action === 'SESSION_UPDATED') {
    console.log('🔄 Received session update from background:', request.session);
    const session = request.session || request.sessionData;
    
    if (session) {
      const currentDomain = window.location.hostname;
      const isLocalhost = currentDomain.includes('localhost') ||
                         currentDomain.includes('127.0.0.1') ||
                         currentDomain.includes('cvcircle.local');
      
      const currentSessionState = {
        isAuthenticated: session.isAuthenticated || false,
        userId: session.user?.id,
        userEmail: session.user?.email,
        userName: session.user?.name || session.user?.email,
        timestamp: Date.now(),
        environment: isLocalhost ? 'development' : 'production',
        domain: currentDomain
      };
      
      if (JSON.stringify(currentSessionState) !== JSON.stringify(lastSessionState)) {
        console.log('🔄 Session state updated from broadcast');
        lastSessionState = currentSessionState;
      }
    }
    sendResponse({ success: true });
    return false;
  }
  
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
