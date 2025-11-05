// Background script for CVCircle Job Saver Extension
const EXTENSION_ID = chrome.runtime.id;

// Environment detection and API configuration
let API_BASE_URL = 'https://www.cvcircle.io';
let IS_DEVELOPMENT = false;

// Constants for session API
const TARGET_DOMAIN = "cvcircle.io";
const SESSION_API_PATHS = [
  "/api/auth/session",
  "/api/auth/custom-session"
];

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('CVCircle Job Saver Extension installed');
  detectEnvironment();
  setupWebRequestHandler();
});

// Helper functions for cookie management (used directly in fetch requests)
// Note: In MV3, blocking webRequest listeners require special permissions that aren't available
// So we'll manually inject cookies when making fetch requests from the background script

// Helper: get all cookies for a domain (including HttpOnly)
async function getAllCookiesForDomain(domain) {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ domain: domain }, (cookies) => {
      resolve(cookies || []);
    });
  });
}

// Build Cookie header string from chrome.cookies array
function buildCookieHeader(cookies) {
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

// Get cookies for URL (more reliable for cross-subdomain scenarios)
async function getAllCookiesForUrl(url) {
  return new Promise((resolve) => {
    chrome.cookies.getAll({ url: url }, (cookies) => {
      resolve(cookies || []);
    });
  });
}

// Get cookies for a given URL - tries multiple methods
async function getCookiesForRequest(url) {
  try {
    // Try URL-based first (more reliable)
    let cookies = await getAllCookiesForUrl(url);
    
    if (cookies && cookies.length > 0) {
      return cookies;
    }
    
    // If URL-based didn't work, try domain-based
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    cookies = await getAllCookiesForDomain(domain);
    
    if (cookies && cookies.length > 0) {
      return cookies;
    }
    
    // Also try with leading dot
    cookies = await getAllCookiesForDomain(`.${domain}`);
    
    return cookies || [];
  } catch (error) {
    console.error('❌ Error getting cookies for URL:', url, error);
    return [];
  }
}

// Setup webRequest handler (non-blocking, for monitoring only)
function setupWebRequestHandler() {
  // In MV3, we can't use blocking listeners without special permissions
  // Instead, we'll manually inject cookies in fetch requests
  // This listener is kept for potential future use or monitoring
  console.log('✅ Cookie helper functions configured (using manual injection)');
}

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Try to send message to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'toggleSidebar',
      show: true
    }).catch(async error => {
      console.log('⚠️ Could not send message to tab, injecting content script:', error);
      // Tab might not have content script, try to inject
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-sidebar.js']
        });
        // Wait a bit for script to initialize, then toggle sidebar
        setTimeout(() => {
          chrome.tabs.sendMessage(tab.id, {
            action: 'toggleSidebar',
            show: true
          }).catch(err => console.log('Still could not toggle:', err));
        }, 500);
      } catch (injectError) {
        console.error('❌ Could not inject content script:', injectError);
      }
    });
  } catch (error) {
    console.error('❌ Error handling icon click:', error);
  }
});

// Detect environment and set API base URL
async function detectEnvironment() {
  try {
    console.log('🔍 Detecting environment...');
    
    // Check for localhost cookies (development) - multiple variants
    const devDomains = ['localhost', '127.0.0.1'];
    
    for (const domain of devDomains) {
      try {
        const devCookies = await chrome.cookies.getAll({
          domain: domain
        });
        console.log(`🔍 ${domain} cookies found:`, devCookies.length);
        
        if (devCookies.length > 0) {
          API_BASE_URL = domain === '127.0.0.1' ? 'http://127.0.0.1:3000' : 'http://localhost:3000';
          IS_DEVELOPMENT = true;
          console.log(`✅ Development environment detected (${domain})`);
          return;
        }
      } catch (error) {
        console.log(`⚠️ Error checking ${domain} cookies:`, error);
      }
    }
    
    // Also check for .local domains
    try {
      const localCookies = await chrome.cookies.getAll({
        domain: 'cvcircle.local'
      });
      if (localCookies.length > 0) {
        API_BASE_URL = 'http://cvcircle.local:3000';
        IS_DEVELOPMENT = true;
        console.log('✅ Development environment detected (cvcircle.local)');
        return;
      }
    } catch (error) {
      console.log('⚠️ Error checking cvcircle.local cookies:', error);
    }
    
    // Default to production
    API_BASE_URL = 'https://www.cvcircle.io';
    IS_DEVELOPMENT = false;
    console.log('✅ Using production environment (www.cvcircle.io)');
    
  } catch (error) {
    console.log('⚠️ Environment detection failed, using default production');
    API_BASE_URL = 'https://www.cvcircle.io';
    IS_DEVELOPMENT = false;
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  // Wrap all handlers in try-catch to ensure responses are always sent
  const safeHandler = async (handler) => {
    try {
      await handler();
    } catch (error) {
      console.error('Error in message handler:', error);
      sendResponse({ success: false, message: error.message || 'Handler error' });
    }
  };
  
  switch (request.action) {
    case 'saveJob':
      safeHandler(() => handleSaveJob(request.jobData, sendResponse));
      return true; // Keep message channel open for async response
      
    case 'getAuthToken':
      safeHandler(() => handleGetAuthToken(sendResponse));
      return true;
      
    case 'checkAuthStatus':
      safeHandler(() => handleCheckAuthStatus(sendResponse));
      return true;
      
    case 'getSession':
    case 'GET_SESSION':
      safeHandler(() => handleGetSession(sendResponse));
      return true;
      
    case 'forceSessionCheck':
    case 'REFRESH_SESSION':
      safeHandler(() => handleForceSessionCheck(sendResponse));
      return true;
      
    case 'sessionUpdate':
      safeHandler(() => handleSessionUpdate(request, sendResponse));
      return true;
      
    case 'fetchJobs':
      safeHandler(() => handleFetchJobs(sendResponse));
      return true;
      
    case 'getEnvironment':
      sendResponse({
        success: true,
        apiBaseUrl: API_BASE_URL,
        isDevelopment: IS_DEVELOPMENT
      });
      return false;
      
    case 'testCookies':
      safeHandler(() => handleTestCookies(sendResponse));
      return true;
      
    case 'broadcastSessionUpdate':
      // Handle broadcast to other extension components
      console.log('📢 Broadcasting session update:', request.sessionData);
      safeHandler(async () => {
        await broadcastSessionUpdate(request.sessionData);
      });
      return false; // No response needed for broadcast
      
    case 'generateJWT':
      safeHandler(() => handleGenerateJWT(request.userId, sendResponse));
      return true;
      
    case 'toggleSidebar':
      safeHandler(() => handleToggleSidebar(request, sendResponse));
      return true;
      
    case 'openSidePanel':
      safeHandler(async () => {
        try {
          // Try to open side panel for current window
          const windows = await chrome.windows.getAll({ populate: false });
          const currentWindow = windows.find(w => w.focused) || windows[0];
          
          if (currentWindow && chrome.sidePanel && chrome.sidePanel.open) {
            await chrome.sidePanel.open({ windowId: currentWindow.id });
            sendResponse({ success: true });
          } else {
            // Fallback: send message to content script to show fallback UI
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'showFallbackPanel'
              }).catch(() => {});
            }
            sendResponse({ success: false, message: 'Side panel API not available' });
          }
        } catch (error) {
          console.error('Error opening side panel:', error);
          sendResponse({ success: false, message: error.message });
        }
      });
      return true;
      
    case 'loginWithPassword':
      safeHandler(() => handleLoginWithPassword(request, sendResponse));
      return true;
      
    case 'loginWithCode':
      safeHandler(() => handleLoginWithCode(request, sendResponse));
      return true;
      
    case 'sendCode':
      safeHandler(() => handleSendCode(request, sendResponse));
      return true;
      
    default:
      sendResponse({ success: false, message: 'Unknown action' });
      return false;
  }
});

/**
 * Force a session check with improved error handling and retry logic
 */
async function handleForceSessionCheck(sendResponse) {
  try {
    console.log('🔄 Force session check initiated...');
    
    // Clear any existing session data first
    await chrome.storage.local.remove(['userData', 'isAuthenticated', 'lastSessionCheck', 'session', 'sessionRetrievedAt']);
    
    // Try to get session from server using webRequest-injected cookies (with retry)
    const session = await fetchWithBackoff(5);
    
    if (session && session.isAuthenticated) {
      // Store user data locally
      await chrome.storage.local.set({
        userData: session.user,
        isAuthenticated: true,
        lastSessionCheck: Date.now(),
        sessionSource: 'extension-check'
      });
      
      // Broadcast update to all tabs
      await broadcastSessionUpdate(session);
      
      console.log('✅ Force session check successful - user authenticated');
      sendResponse({
        success: true,
        user: session.user,
        isAuthenticated: true,
        message: 'Session verified successfully'
      });
    } else {
      console.log('❌ Force session check failed - no valid session');
      
      // Broadcast logout to all tabs
      await broadcastSessionUpdate({ isAuthenticated: false });
      
      sendResponse({
        success: false,
        message: 'No valid session found',
        isAuthenticated: false
      });
    }
  } catch (error) {
    console.error('❌ Force session check error:', error);
    sendResponse({
      success: false,
      message: 'Session check failed',
      error: error.message,
      isAuthenticated: false
    });
  }
}

// Enhanced session retrieval with retry logic and exponential backoff
async function fetchWithBackoff(attempts = 5) {
  let delay = 500; // ms
  for (let i = 0; i < attempts; i++) {
    console.log(`🔍 Session fetch attempt ${i + 1}/${attempts}`);
    const session = await getSessionFromServer();
    if (session) {
      return session;
    }
    if (i < attempts - 1) {
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(res => setTimeout(res, delay));
      delay *= 2; // Exponential backoff
    }
  }
  return null;
}

// Enhanced session retrieval with retry logic (kept for compatibility)
async function getSessionFromCookiesWithRetry(maxRetries = 3) {
  // First try the new webRequest-based method
  const session = await fetchWithBackoff(maxRetries);
  if (session) {
    return session;
  }
  
  // Fallback to old method
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Session check attempt ${attempt}/${maxRetries} (fallback)`);
      
      const result = await getSessionFromCookies();
      if (result) {
        return result;
      }
      
      if (attempt < maxRetries) {
        console.log(`⏳ Waiting before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    } catch (error) {
      console.log(`❌ Session check attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
  
  return null;
}

// Get session from server using manually injected cookies
// In MV3, we can't use blocking webRequest, so we manually get cookies and inject them
async function getSessionFromServer() {
  try {
    // Determine API base URL
    const apiBaseUrl = API_BASE_URL;
    const sessionUrl = `${apiBaseUrl}/api/auth/session`;
    
    console.log('🔍 Fetching session from server:', sessionUrl);
    
    // Get cookies for this URL
    const cookies = await getCookiesForRequest(sessionUrl);
    
    if (!cookies || cookies.length === 0) {
      console.log('⚠️ No cookies found for session URL');
      // Still try the request without cookies (might work if session is in URL params or headers)
    }
    
    // Build Cookie header
    const cookieHeader = cookies && cookies.length > 0 ? buildCookieHeader(cookies) : '';
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add Cookie header if we have cookies
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
      console.log('🔍 Injecting cookies into request (length:', cookieHeader.length, ')');
    }
    
    // Fetch with manually injected cookies
    const resp = await fetch(sessionUrl, {
      method: 'GET',
      credentials: 'include', // Still include for same-origin requests
      mode: 'cors',
      headers: headers
    });
    
    if (!resp.ok) {
      console.warn('⚠️ Session API returned non-OK', resp.status);
      return null;
    }
    
    const json = await resp.json();
    console.log('✅ Session data received from server:', JSON.stringify(json).substring(0, 200));
    
    // Save session to storage for quick lookup
    await chrome.storage.local.set({ 
      session: json, 
      sessionRetrievedAt: Date.now() 
    });
    
    return {
      user: json.user,
      isAuthenticated: !!json.user,
      apiBaseUrl: apiBaseUrl
    };
  } catch (err) {
    console.error('❌ getSessionFromServer error:', err);
    return null;
  }
}

// Get session from cookies (fallback method - kept for compatibility)
async function getSessionFromCookies() {
  try {
    console.log('🔍 Checking for session cookies (fallback method)...');
    console.log('🔍 Current API_BASE_URL:', API_BASE_URL);
    console.log('🔍 IS_DEVELOPMENT:', IS_DEVELOPMENT);
    
    // Use URL-based cookie retrieval which is more reliable
    // Try multiple URLs to catch all possible cookie storage scenarios
    const urls = IS_DEVELOPMENT ? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://cvcircle.local:3000'
    ] : [
      'https://cvcircle.io',
      'https://www.cvcircle.io',
      'https://cvcircle.io/dashboard',
      'https://www.cvcircle.io/dashboard'
    ];
    
    let allCookies = [];
    
    // Method 1: Get cookies by URL (more reliable)
    for (const url of urls) {
      try {
        const cookies = await chrome.cookies.getAll({ url });
        console.log(`🔍 Cookies for URL ${url}:`, cookies.length);
        if (cookies.length > 0) {
          console.log(`🔍 Cookie names for ${url}:`, cookies.map(c => c.name));
        }
        allCookies = allCookies.concat(cookies);
      } catch (error) {
        console.log(`⚠️ Error getting cookies for URL ${url}:`, error.message);
      }
    }
    
    // Method 2: Also try domain-based retrieval (fallback)
    const domains = IS_DEVELOPMENT 
      ? ['localhost', '127.0.0.1', 'cvcircle.local', '.localhost', '.127.0.0.1']
      : ['cvcircle.io', '.cvcircle.io', 'www.cvcircle.io', '.www.cvcircle.io'];
    
    for (const domain of domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        if (cookies.length > 0) {
          console.log(`🔍 Cookies for domain ${domain}:`, cookies.length);
          console.log(`🔍 Cookie names for ${domain}:`, cookies.map(c => c.name));
          allCookies = allCookies.concat(cookies);
        }
      } catch (error) {
        console.log(`⚠️ Error getting cookies for domain ${domain}:`, error.message);
      }
    }
    
    // Remove duplicates based on name and domain
    const uniqueCookies = [];
    const seen = new Set();
    for (const cookie of allCookies) {
      const key = `${cookie.name}::${cookie.domain}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCookies.push(cookie);
      }
    }
    
    console.log('🔍 Total unique cookies found:', uniqueCookies.length);
    
    // Look for NextAuth session cookies
    const sessionCookie = uniqueCookies.find(cookie =>
      cookie.name === '__Secure-next-auth.session-token' ||
      cookie.name === 'next-auth.session-token' ||
      cookie.name === '__Secure-next-auth.csrf-token' ||
      cookie.name === 'next-auth.csrf-token' ||
      cookie.name.includes('next-auth.session') ||
      cookie.name.includes('next-auth.csrf')
    );
    
    if (!sessionCookie) {
      console.log('❌ No NextAuth session cookie found');
      return null;
    }
    
    console.log('✅ Found session cookie:', sessionCookie.name);
    
    // Determine correct API URL based on cookie domain
    let apiBaseUrl = API_BASE_URL;
    const cookieDomain = sessionCookie.domain.replace(/^\./, '');
    
    if (cookieDomain.includes('localhost') ||
        cookieDomain.includes('127.0.0.1') ||
        cookieDomain.includes('cvcircle.local')) {
      apiBaseUrl = cookieDomain.includes('127.0.0.1') ?
        'http://127.0.0.1:3000' :
        cookieDomain.includes('cvcircle.local') ?
        'http://cvcircle.local:3000' :
        'http://localhost:3000';
    } else {
      apiBaseUrl = cookieDomain.includes('www.') ? 
        'https://www.cvcircle.io' : 
        'https://cvcircle.io';
    }
    
    // Try to verify session with API (webRequest will inject cookies)
    const session = await getSessionFromServer();
    if (session) {
      return {
        ...session,
        cookie: sessionCookie
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting session from cookies:', error);
    return null;
  }
}

// Handle session retrieval
async function handleGetSession(sendResponse) {
  try {
    // Try return cached session first (if fresh)
    const store = await chrome.storage.local.get(['session', 'sessionRetrievedAt', 'isAuthenticated', 'userData']);
    
    // If we have stored auth from extension login, return it
    if (store.isAuthenticated && store.userData && store.userData.id) {
      sendResponse({
        success: true,
        session: {
          user: store.userData,
          isAuthenticated: true
        },
        user: store.userData,
        isAuthenticated: true,
        cached: true
      });
      return;
    }
    
    // Check cached server session (if fresh)
    if (store.session && store.session.user && ((Date.now() - (store.sessionRetrievedAt || 0)) < 5 * 60 * 1000)) {
      const session = store.session;
      sendResponse({
        success: true,
        session: {
          user: session.user,
          isAuthenticated: !!session.user
        },
        user: session.user,
        isAuthenticated: !!session.user,
        cached: true
      });
      return;
    }
    
    // Otherwise fetch from server (website session)
    const session = await getSessionFromServer();
    
    if (session && session.isAuthenticated && session.user) {
      // Store user data locally
      await chrome.storage.local.set({
        userData: session.user,
        isAuthenticated: true,
        lastSessionCheck: Date.now()
      });
      
      sendResponse({
        success: true,
        session: {
          user: session.user,
          isAuthenticated: true
        },
        user: session.user,
        isAuthenticated: true,
        cached: false
      });
    } else {
      // No session found - this is normal for logged-out users
      // Don't spam the console
      sendResponse({
        success: false,
        session: null,
        message: 'Not authenticated',
        isAuthenticated: false,
        cached: false
      });
    }
  } catch (error) {
    console.error('❌ Error handling session:', error);
    sendResponse({
      success: false,
      session: null,
      message: 'Session check failed',
      isAuthenticated: false,
      cached: false
    });
  }
}

// Broadcast session update to all open tabs
async function broadcastSessionUpdate(session) {
  try {
    console.log('📢 Broadcasting session update to all tabs...');
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      try {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SESSION_UPDATED',
          session: session
        }).catch(err => {
          // Ignore errors for tabs that don't have content scripts
          if (!err.message?.includes('Could not establish connection')) {
            console.warn(`⚠️ Could not send to tab ${tab.id}:`, err.message);
          }
        });
      } catch (error) {
        // Tab might not accept messages, ignore
      }
    }
    
    console.log('✅ Session update broadcasted to', tabs.length, 'tabs');
  } catch (error) {
    console.error('❌ Error broadcasting session update:', error);
  }
}

// Handle session updates from CVCircle website
async function handleSessionUpdate(request, sendResponse) {
  try {
    console.log('🔄 Handling session update from CVCircle website:', request.sessionData);
    
    const { sessionData } = request;
    
    if (sessionData.isAuthenticated) {
      // Store user data from website session
      await chrome.storage.local.set({
        userData: {
          id: sessionData.userId,
          email: sessionData.userEmail,
          name: sessionData.userEmail || 'User', // Fallback
        },
        isAuthenticated: true,
        lastSessionCheck: Date.now(),
        sessionSource: 'cvcircle-website',
        sessionTimestamp: sessionData.timestamp
      });
      
      console.log('✅ Session updated from website, user authenticated');
      
      // Broadcast to all tabs
      await broadcastSessionUpdate({
        user: {
          id: sessionData.userId,
          email: sessionData.userEmail,
          name: sessionData.userEmail || 'User'
        },
        isAuthenticated: true
      });
      
      sendResponse({
        success: true,
        message: 'Session updated from website',
        isAuthenticated: true
      });
    } else {
      // Clear stored data on logout
      await chrome.storage.local.remove([
        'userData',
        'isAuthenticated',
        'sessionSource',
        'sessionTimestamp',
        'authToken',
        'session',
        'sessionRetrievedAt'
      ]);
      console.log('🔄 User logged out on website, clearing extension session');
      
      // Broadcast logout to all tabs
      await broadcastSessionUpdate({ isAuthenticated: false });
      
      sendResponse({
        success: true,
        message: 'Session cleared due to website logout',
        isAuthenticated: false
      });
    }
  } catch (error) {
    console.error('❌ Error handling session update:', error);
    sendResponse({
      success: false,
      message: 'Session update failed',
      isAuthenticated: false
    });
  }
}

// Test cookies access
async function handleTestCookies(sendResponse) {
  try {
    console.log('🧪 Testing cookie access...');
    
    const allDomains = ['www.cvcircle.io', 'cvcircle.io', 'localhost', '127.0.0.1'];
    const results = {};
    
    for (const domain of allDomains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        results[domain] = {
          count: cookies.length,
          cookies: cookies.map(c => ({ name: c.name, domain: c.domain }))
        };
        console.log(`🧪 ${domain}: ${cookies.length} cookies`);
      } catch (error) {
        results[domain] = { error: error.message };
        console.log(`🧪 ${domain}: Error - ${error.message}`);
      }
    }
    
    sendResponse({ 
      success: true, 
      results,
      apiBaseUrl: API_BASE_URL,
      isDevelopment: IS_DEVELOPMENT
    });
    
  } catch (error) {
    console.error('❌ Cookie test error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle job fetching
async function handleFetchJobs(sendResponse) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session || !session.isAuthenticated) {
      sendResponse({ 
        success: false, 
        message: 'Not authenticated',
        jobs: [] 
      });
      return;
    }
    
    // Get user ID from session
    const userId = session.user.id || session.user.email;
    
    if (!userId) {
      sendResponse({ 
        success: false, 
        message: 'No user ID found',
        jobs: [] 
      });
      return;
    }
    
    // Get cookies for API request
    const apiUrl = `${API_BASE_URL}/api/jobs?userId=${userId}`;
    const cookies = await getCookiesForRequest(apiUrl);
    const cookieHeader = cookies && cookies.length > 0 ? buildCookieHeader(cookies) : '';
    
    // Prepare headers
    const headers = {};
    
    // Add Cookie header if we have cookies
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    // Fetch jobs from API
    const response = await fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',
      headers: headers
    });
    
    if (response.ok) {
      const result = await response.json();
      sendResponse({ 
        success: true, 
        jobs: result.data?.jobs || [],
        kpis: calculateKPIs(result.data?.jobs || [])
      });
    } else {
      throw new Error(`API request failed: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error fetching jobs:', error);
    sendResponse({ 
      success: false, 
      message: 'Failed to fetch jobs',
      jobs: [] 
    });
  }
}

// Calculate KPIs from job data
function calculateKPIs(jobs) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const totalJobs = jobs.length;
  const appliedJobs = jobs.filter(job => job.status === 'applied' || job.status === 'screening' || job.status === 'interview' || job.status === 'offer' || job.status === 'accepted').length;
  const interviewJobs = jobs.filter(job => job.status === 'interview' || job.status === 'offer' || job.status === 'accepted').length;
  const offerJobs = jobs.filter(job => job.status === 'offer' || job.status === 'accepted').length;
  
  const recentJobs = jobs.filter(job => new Date(job.createdAt) >= oneWeekAgo).length;
  const monthlyJobs = jobs.filter(job => new Date(job.createdAt) >= oneMonthAgo).length;
  
  return {
    totalJobs,
    appliedJobs,
    interviewJobs,
    offerJobs,
    recentJobs,
    monthlyJobs,
    successRate: totalJobs > 0 ? Math.round((offerJobs / totalJobs) * 100) : 0,
    responseRate: totalJobs > 0 ? Math.round((appliedJobs / totalJobs) * 100) : 0
  };
}

// Handle job saving with authentication
async function handleSaveJob(jobData, sendResponse) {
  try {
    console.log('Saving job:', jobData);
    
    const session = await getSessionFromCookies();
    
    if (!session || !session.isAuthenticated) {
      sendResponse({ 
        success: false, 
        message: 'Not authenticated. Please log in to CVCircle first.' 
      });
      return;
    }
    
    // Prepare job data for API
    const apiJobData = {
      jobTitle: jobData.title,
      company: jobData.company,
      location: jobData.location,
      jobDescription: jobData.description,
      jobUrl: jobData.url,
      status: 'created',
      priority: 'medium',
      source: 'extension',
      tags: ['extension-saved']
    };
    
    // Get cookies for API request
    const apiUrl = `${API_BASE_URL}/api/jobs`;
    const cookies = await getCookiesForRequest(apiUrl);
    const cookieHeader = cookies && cookies.length > 0 ? buildCookieHeader(cookies) : '';
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add Cookie header if we have cookies
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    // Save to API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(apiJobData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Job saved to API:', result);
    sendResponse({ 
      success: true, 
      message: 'Job saved successfully!',
        data: result.data 
    });
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || `API request failed: ${response.status}`);
    }
    
  } catch (error) {
    console.error('Error saving job:', error);
    sendResponse({ success: false, message: error.message || 'Failed to save job' });
  }
}

// Handle auth token retrieval
async function handleGetAuthToken(sendResponse) {
  try {
    const result = await getStoredAuthToken();
    sendResponse(result);
  } catch (error) {
    console.error('Error getting auth token:', error);
    sendResponse({ success: false, message: 'Failed to get auth token' });
  }
}

// Handle auth status check
async function handleCheckAuthStatus(sendResponse) {
  try {
    const result = await getStoredAuthToken();
    if (!result.success) {
      sendResponse({ success: false, message: 'Not authenticated' });
      return;
    }
    
    // Verify token with API
    const response = await fetch(`${API_BASE_URL}/api/auth/extension-verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${result.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const verifyResult = await response.json();
    
    if (response.ok) {
      sendResponse({ success: true, user: verifyResult.user });
    } else {
      // Token invalid, clear storage
      await chrome.storage.local.remove(['authToken', 'userData']);
      sendResponse({ success: false, message: 'Token expired' });
    }
    
  } catch (error) {
    console.error('Error checking auth status:', error);
    sendResponse({ success: false, message: 'Auth check failed' });
  }
}

// Get stored auth token
async function getStoredAuthToken() {
  try {
    const result = await chrome.storage.local.get(['authToken']);
    if (result.authToken) {
      return { success: true, token: result.authToken };
    } else {
      return { success: false, message: 'No auth token found' };
    }
  } catch (error) {
    console.error('Error getting stored auth token:', error);
    return { success: false, message: 'Storage error' };
  }
}

// Store auth token
async function storeAuthToken(token, userData) {
  try {
    await chrome.storage.local.set({
      authToken: token,
      userData: userData
    });
    return { success: true };
  } catch (error) {
    console.error('Error storing auth token:', error);
    return { success: false, message: 'Storage error' };
  }
}

// Clear auth data
async function clearAuthData() {
  try {
    await chrome.storage.local.remove(['authToken', 'userData']);
    return { success: true };
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return { success: false, message: 'Storage error' };
  }
}

// Generate JWT token (returns a promise, doesn't use sendResponse)
async function generateJWTToken(userId) {
  try {
    console.log('🔐 Generating JWT token for user:', userId);
    
    // Get user data from storage
    const result = await chrome.storage.local.get(['userData', 'authToken']);
    
    if (result.authToken) {
      // Token already exists, return it
      return {
        success: true,
        token: result.authToken
      };
    }
    
    // Get cookies for API request
    const apiUrl = `${API_BASE_URL}/api/auth/extension-token`;
    const cookies = await getCookiesForRequest(apiUrl);
    const cookieHeader = cookies && cookies.length > 0 ? buildCookieHeader(cookies) : '';
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add Cookie header if we have cookies
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    // Call API to generate extension token
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ userId }),
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.token) {
        // Store token
        await chrome.storage.local.set({
          authToken: data.token,
          userData: data.user
        });
        
        return {
          success: true,
          token: data.token,
          user: data.user
        };
      } else {
        throw new Error(data.error || 'Failed to generate token');
      }
    } else {
      throw new Error(`API request failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Error generating JWT:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate token'
    };
  }
}

// Handle JWT token generation (for message handler)
async function handleGenerateJWT(userId, sendResponse) {
  const result = await generateJWTToken(userId);
  sendResponse(result);
}

// Handle sidebar toggle
async function handleToggleSidebar(request, sendResponse) {
  try {
    // Send message to content script to toggle sidebar
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleSidebar',
        show: request.show !== false
      });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No active tab' });
    }
  } catch (error) {
    console.error('Error toggling sidebar:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle login with password
async function handleLoginWithPassword(request, sendResponse) {
  try {
    const { email, password } = request;
    
    if (!email || !password) {
      console.error('❌ Missing email or password');
      sendResponse({ success: false, error: 'Email and password are required' });
      return;
    }
    
    console.log('🔐 Extension login attempt for:', email);
    console.log('🔐 Using API URL:', API_BASE_URL);
    
    // Use the new extension-signin endpoint
    const signinUrl = `${API_BASE_URL}/api/auth/extension-signin`;
    console.log('🔐 Signin URL:', signinUrl);
    
    const signinResponse = await fetch(signinUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
    });
    
    console.log('🔐 Signin response status:', signinResponse.status);
    
    const result = await signinResponse.json();
    console.log('🔐 Signin response data:', result);
    
    if (result.success && result.user) {
      const userId = result.user.id;
      const userEmail = result.user.email;
      const userName = result.user.name;
      
      console.log('✅ User authenticated, generating token for:', userId);
      
      // Generate extension token
      const tokenResult = await generateJWTToken(userId);
      console.log('🔐 Token generation result:', tokenResult?.success ? 'SUCCESS' : 'FAILED');
      
      if (tokenResult && tokenResult.success) {
        // Store auth data
        await chrome.storage.local.set({
          isAuthenticated: true,
          userData: {
            id: userId,
            email: userEmail,
            name: userName,
          },
          authToken: tokenResult.token
        });
        
        console.log('✅ Auth data stored in chrome.storage');
        
        // Broadcast session update
        await broadcastSessionUpdate({
          user: {
            id: userId,
            email: userEmail,
            name: userName,
          },
          isAuthenticated: true
        });
        
        console.log('✅ Extension login successful - broadcasting to tabs');
        
        sendResponse({
          success: true,
          user: {
            id: userId,
            email: userEmail,
            name: userName,
          },
          token: tokenResult.token
        });
      } else {
        console.error('❌ Failed to generate token:', tokenResult?.error);
        sendResponse({ success: false, error: tokenResult?.error || 'Failed to generate authentication token' });
      }
    } else {
      console.error('❌ Login failed - API returned:', result);
      sendResponse({ success: false, error: result.error || 'Invalid credentials. Please check your email and password.' });
    }
  } catch (error) {
    console.error('❌ Login exception:', error);
    sendResponse({ success: false, error: error.message || 'Login failed. Please check your internet connection and try again.' });
  }
}

// Handle login with code
async function handleLoginWithCode(request, sendResponse) {
  try {
    const { email, code } = request;
    
    if (!email || !code) {
      sendResponse({ success: false, error: 'Email and code are required' });
      return;
    }
    
    console.log('🔐 Handling login with code for:', email);
    
    // Get cookies for API request
    const apiUrl = `${API_BASE_URL}/api/auth/verify-and-signin`;
    const cookies = await getCookiesForRequest(apiUrl);
    const cookieHeader = cookies && cookies.length > 0 ? buildCookieHeader(cookies) : '';
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add Cookie header if we have cookies
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        email,
        code,
        type: 'passwordless-login',
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.userId) {
      // Get user data and generate extension token
      const userId = data.userId;
      const tokenResult = await generateJWTToken(userId);
      
      if (tokenResult && tokenResult.success) {
        // Store auth data
        await chrome.storage.local.set({
          isAuthenticated: true,
          userData: {
            id: userId,
            email: data.email || email,
            name: data.name || email,
          },
          authToken: tokenResult.token
        });
        
        // Broadcast session update
        await broadcastSessionUpdate({
          user: {
            id: userId,
            email: data.email || email,
            name: data.name || email,
          },
          isAuthenticated: true
        });
        
        sendResponse({
          success: true,
          user: {
            id: userId,
            email: data.email || email,
            name: data.name || email,
          },
          token: tokenResult.token
        });
      } else {
        sendResponse({ success: false, error: 'Failed to generate token' });
      }
    } else {
      sendResponse({ success: false, error: data.message || data.error || 'Invalid code' });
    }
  } catch (error) {
    console.error('❌ Login with code error:', error);
    sendResponse({ success: false, error: error.message || 'Verification failed' });
  }
}

// Handle send code
async function handleSendCode(request, sendResponse) {
  try {
    const { email, type } = request;
    
    if (!email || !type) {
      sendResponse({ success: false, error: 'Email and type are required' });
      return;
    }
    
    console.log('📧 Sending code to:', email);
    
    // Get cookies for API request
    const apiUrl = `${API_BASE_URL}/api/auth/send-code`;
    const cookies = await getCookiesForRequest(apiUrl);
    const cookieHeader = cookies && cookies.length > 0 ? buildCookieHeader(cookies) : '';
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add Cookie header if we have cookies
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        email,
        type: type || 'passwordless-login',
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: data.message || data.error || 'Failed to send code' });
    }
  } catch (error) {
    console.error('❌ Send code error:', error);
    sendResponse({ success: false, error: error.message || 'Failed to send code' });
  }
}

// Note: Service workers don't have window object
// Functions are available via chrome.runtime.sendMessage
// If needed for popup, expose via chrome.runtime.getBackgroundPage() or use messaging
