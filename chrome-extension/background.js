// Background script for CVCircle Job Saver Extension
const EXTENSION_ID = chrome.runtime.id;

// Environment detection and API configuration
let API_BASE_URL = 'https://www.cvcircle.io';
let IS_DEVELOPMENT = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('CVCircle Job Saver Extension installed');
  detectEnvironment();
});

// Detect environment and set API base URL
async function detectEnvironment() {
  try {
    console.log('🔍 Detecting environment...');
    
    // Check for localhost cookies (development)
    try {
      const localCookies = await chrome.cookies.getAll({
        domain: 'localhost'
      });
      console.log('🔍 Localhost cookies found:', localCookies.length);
      
      if (localCookies.length > 0) {
        API_BASE_URL = 'http://localhost:3000';
        IS_DEVELOPMENT = true;
        console.log('✅ Development environment detected');
        return;
      }
    } catch (error) {
      console.log('⚠️ Error checking localhost cookies:', error);
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
      safeHandler(() => handleGetSession(sendResponse));
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
      
    default:
      sendResponse({ success: false, message: 'Unknown action' });
      return false;
  }
});

// Get session from cookies
async function getSessionFromCookies() {
  try {
    console.log('🔍 Checking for session cookies...');
    console.log('🔍 Current API_BASE_URL:', API_BASE_URL);
    console.log('🔍 IS_DEVELOPMENT:', IS_DEVELOPMENT);
    
    // Check both domains for cookies
    const domains = IS_DEVELOPMENT ? ['localhost', '127.0.0.1'] : ['www.cvcircle.io', 'cvcircle.io'];
    let allCookies = [];
    
    for (const domain of domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        console.log(`🔍 Cookies for ${domain}:`, cookies.length);
        console.log(`🔍 Cookie names for ${domain}:`, cookies.map(c => c.name));
        allCookies = allCookies.concat(cookies);
      } catch (error) {
        console.log(`⚠️ Error getting cookies for ${domain}:`, error);
      }
    }
    
    console.log('🔍 Total cookies found:', allCookies.length);
    console.log('🔍 All cookie names:', allCookies.map(c => c.name));
    
    // Look for NextAuth session cookies (prioritize secure cookies for production)
    const sessionCookie = allCookies.find(cookie => 
      cookie.name === '__Secure-next-auth.session-token' ||
      cookie.name === 'next-auth.session-token' ||
      cookie.name === '__Secure-next-auth.csrf-token' ||
      cookie.name === 'next-auth.csrf-token' ||
      cookie.name.includes('next-auth') ||
      cookie.name.includes('session') ||
      cookie.name.includes('auth')
    );
    
    if (!sessionCookie) {
      console.log('❌ No session cookie found');
      console.log('🔍 Available cookies:', allCookies.map(c => ({ name: c.name, domain: c.domain, secure: c.secure })));
      return null;
    }
    
    console.log('✅ Found session cookie:', sessionCookie.name, 'from domain:', sessionCookie.domain);
    
    // Try to verify session with API
    try {
      console.log('🔍 Attempting to verify session with API...');
      console.log('🔍 Using cookie:', sessionCookie.name, 'from domain:', sessionCookie.domain);
      
      // Build cookie string with all relevant cookies
      const cookieString = allCookies
        .filter(cookie => 
          cookie.name.includes('next-auth') || 
          cookie.name.includes('session') || 
          cookie.name.includes('auth') ||
          cookie.domain === sessionCookie.domain
        )
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      console.log('🔍 Cookie string being sent:', cookieString);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cookie': cookieString,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('🔍 Session API response status:', response.status);
      console.log('🔍 Session API response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const sessionData = await response.json();
        console.log('✅ Session data received:', sessionData);
        return {
          cookie: sessionCookie,
          user: sessionData.user,
          isAuthenticated: !!sessionData.user
        };
      } else {
        console.log('❌ Session API failed:', response.status, response.statusText);
        // Try to get response text for debugging
        try {
          const errorText = await response.text();
          console.log('❌ Error response:', errorText);
        } catch (e) {
          console.log('❌ Could not read error response');
        }
      }
    } catch (apiError) {
      console.log('❌ Session API error:', apiError);
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
    console.log('🔍 Handling session request...');
    const session = await getSessionFromCookies();
    
    if (session && session.isAuthenticated) {
      // Store user data locally
      await chrome.storage.local.set({
        userData: session.user,
        isAuthenticated: true,
        lastSessionCheck: Date.now()
      });
      
      console.log('✅ Session found, user authenticated');
      sendResponse({ 
        success: true, 
        user: session.user,
        isAuthenticated: true 
      });
    } else {
      // Clear stored data
      await chrome.storage.local.remove(['userData', 'isAuthenticated']);
      console.log('❌ No valid session found');
      sendResponse({ 
        success: false, 
        message: 'No valid session found',
        isAuthenticated: false 
      });
    }
  } catch (error) {
    console.error('❌ Error handling session:', error);
    sendResponse({ 
      success: false, 
      message: 'Session check failed',
      isAuthenticated: false 
    });
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
          name: sessionData.userEmail // Fallback, will be updated from API
        },
        isAuthenticated: true,
        lastSessionCheck: Date.now(),
        sessionSource: 'cvcircle-website'
      });
      
      console.log('✅ Session updated from website, user authenticated');
      sendResponse({ 
        success: true, 
        message: 'Session updated from website',
        isAuthenticated: true 
      });
    } else {
      // Clear stored data on logout
      await chrome.storage.local.remove(['userData', 'isAuthenticated', 'sessionSource']);
      console.log('🔄 User logged out on website, clearing extension session');
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
    
    // Fetch jobs from API
    const response = await fetch(`${API_BASE_URL}/api/jobs?userId=${userId}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cookie': `${session.cookie.name}=${session.cookie.value}`
      }
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
    
    // Save to API
    const response = await fetch(`${API_BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `${session.cookie.name}=${session.cookie.value}`
      },
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

// Export functions for popup use
window.backgroundAPI = {
  storeAuthToken,
  clearAuthData,
  getStoredAuthToken
};
