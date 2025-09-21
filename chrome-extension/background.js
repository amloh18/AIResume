// Background script for CVCircle Job Saver Extension
const API_BASE_URL = 'http://localhost:3000'; // Change to https://cvcircle.io for production
const EXTENSION_ID = chrome.runtime.id;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('CVCircle Job Saver Extension installed');
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'saveJob':
      handleSaveJob(request.jobData, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'getAuthToken':
      handleGetAuthToken(sendResponse);
      return true;
      
    case 'checkAuthStatus':
      handleCheckAuthStatus(sendResponse);
      return true;
      
    default:
      sendResponse({ success: false, message: 'Unknown action' });
  }
});

// Handle job saving (without authentication for now)
async function handleSaveJob(jobData, sendResponse) {
  try {
    console.log('Saving job:', jobData);
    
    // For now, save to local storage instead of API
    const savedJobs = await chrome.storage.local.get(['savedJobs']) || { savedJobs: [] };
    const jobs = savedJobs.savedJobs || [];
    
    // Add timestamp and unique ID
    const jobWithMetadata = {
      ...jobData,
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      source: 'extension'
    };
    
    jobs.push(jobWithMetadata);
    
    // Save to local storage
    await chrome.storage.local.set({ savedJobs: jobs });
    
    console.log('✅ Job saved locally:', jobWithMetadata);
    sendResponse({ 
      success: true, 
      message: 'Job saved successfully!',
      data: jobWithMetadata 
    });
    
  } catch (error) {
    console.error('Error saving job:', error);
    sendResponse({ success: false, message: 'Failed to save job locally' });
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
