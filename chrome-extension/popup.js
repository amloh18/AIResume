// CVCircle Job Tracker Extension - Simple Popup Script
console.log('CVCircle Job Tracker popup loaded');

// State management
let currentUser = null;
let currentJob = null;
let kpis = {};

// DOM elements
const sections = {
  loading: document.getElementById('loading-section'),
  login: document.getElementById('login-section'),
  dashboard: document.getElementById('dashboard-section')
};

const elements = {
  // Login
  loginBtn: document.getElementById('login-btn'),
  debugBtn: document.getElementById('debug-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  
  // User info
  userName: document.getElementById('user-name'),
  userEmail: document.getElementById('user-email'),
  userAvatarImg: document.getElementById('user-avatar-img'),
  userAvatarInitials: document.getElementById('user-avatar-initials'),
  
  // Stats
  totalJobs: document.getElementById('total-jobs'),
  appliedJobs: document.getElementById('applied-jobs'),
  interviewJobs: document.getElementById('interview-jobs'),
  
  // Current job
  currentJobCard: document.getElementById('current-job-card'),
  noJobState: document.getElementById('no-job-state'),
  jobTitle: document.getElementById('job-title'),
  jobCompany: document.getElementById('job-company'),
  jobLocation: document.getElementById('job-location'),
  jobCompanyLogo: document.getElementById('job-company-logo'),
  jobCompanyInitials: document.getElementById('job-company-initials'),
  jobDescriptionText: document.getElementById('job-description-text'),
  saveJobBtn: document.getElementById('save-job-btn'),
  
  // Footer
  dashboardLink: document.getElementById('dashboard-link'),
  helpLink: document.getElementById('help-link')
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing popup');
  setupEventListeners();
  
  // Add a fallback timeout to prevent infinite loading
  const fallbackTimeout = setTimeout(() => {
    console.log('⚠️ Fallback timeout reached, showing login');
    showView('login');
  }, 15000); // 15 second fallback
  
  try {
    await initializeApp();
    clearTimeout(fallbackTimeout);
    
    // Start periodic session check if not authenticated
    if (!currentUser) {
      startPeriodicSessionCheck();
    }
  } catch (error) {
    console.error('❌ Popup initialization failed:', error);
    clearTimeout(fallbackTimeout);
    showView('login');
  }
});

// Periodic session check for when user logs in
let sessionCheckInterval = null;

function startPeriodicSessionCheck() {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  
  console.log('🔄 Starting periodic session check...');
  sessionCheckInterval = setInterval(async () => {
    try {
      console.log('🔍 Periodic session check...');
      const sessionResponse = await chrome.runtime.sendMessage({ action: 'getSession' });
      
      if (sessionResponse && sessionResponse.success && sessionResponse.isAuthenticated) {
        console.log('✅ Session detected, stopping periodic check');
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
        
        currentUser = sessionResponse.user;
        await loadUserData();
      }
    } catch (error) {
      console.log('⚠️ Periodic session check failed:', error);
    }
  }, 3000); // Check every 3 seconds
}

// Set up event listeners
function setupEventListeners() {
  // Login
  elements.loginBtn.addEventListener('click', handleLogin);
  elements.debugBtn.addEventListener('click', handleDebug);
  elements.refreshBtn.addEventListener('click', handleRefresh);
  
  // Job saving
  elements.saveJobBtn.addEventListener('click', handleSaveJob);
  
  // Footer links
  elements.dashboardLink.addEventListener('click', handleDashboardLink);
  elements.helpLink.addEventListener('click', handleHelpLink);
}

// Initialize app
async function initializeApp() {
  try {
    showView('loading');
    
    console.log('🔍 Initializing app...');
    
    // First, test cookie access
    try {
      const cookieTest = await chrome.runtime.sendMessage({ action: 'testCookies' });
      console.log('🧪 Cookie test results:', cookieTest);
    } catch (error) {
      console.log('⚠️ Cookie test failed:', error);
    }
    
    // Check session with timeout and better error handling
    let sessionResponse;
    try {
      sessionResponse = await Promise.race([
        chrome.runtime.sendMessage({ action: 'getSession' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Session check timeout')), 10000)) // Increased timeout
      ]);
    } catch (error) {
      console.log('⚠️ Session check failed:', error.message);
      // If session check fails, show login after a brief delay
      setTimeout(() => {
        showView('login');
      }, 1000);
      return;
    }
    
    console.log('🔍 Session response:', sessionResponse);
    
    if (sessionResponse && sessionResponse.success && sessionResponse.isAuthenticated) {
      currentUser = sessionResponse.user;
      console.log('✅ User authenticated:', currentUser);
      await loadUserData();
    } else {
      console.log('❌ Not authenticated, showing login');
      showView('login');
    }
    
  } catch (error) {
    console.error('❌ Error initializing app:', error);
    console.log('🔍 Showing login due to error');
    // Add a small delay before showing login to prevent flickering
    setTimeout(() => {
      showView('login');
    }, 500);
  }
}

// Load user data and stats
async function loadUserData() {
  try {
    // Load jobs and KPIs
    const jobsResponse = await chrome.runtime.sendMessage({ action: 'fetchJobs' });
    
    if (jobsResponse.success) {
      kpis = jobsResponse.kpis || {};
      updateUserInfo();
      updateStats();
    }
    
    // Load current job from active tab
    await loadCurrentJob();
    
    showView('dashboard');
    
  } catch (error) {
    console.error('Error loading user data:', error);
    showView('dashboard');
  }
}

// Update user info display
function updateUserInfo() {
  if (!currentUser) return;
  
  elements.userName.textContent = currentUser.name || 'User';
  elements.userEmail.textContent = currentUser.email || '';
  
  // Set avatar
  if (currentUser.image) {
    elements.userAvatarImg.src = currentUser.image;
    elements.userAvatarImg.style.display = 'block';
    elements.userAvatarInitials.style.display = 'none';
  } else {
    const initials = getInitials(currentUser.name || currentUser.email);
    elements.userAvatarInitials.textContent = initials;
    elements.userAvatarInitials.style.display = 'flex';
    elements.userAvatarImg.style.display = 'none';
  }
}

// Update stats display
function updateStats() {
  elements.totalJobs.textContent = kpis.totalJobs || 0;
  elements.appliedJobs.textContent = kpis.appliedJobs || 0;
  elements.interviewJobs.textContent = kpis.interviewJobs || 0;
}

// Load current job from active tab
async function loadCurrentJob() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      showNoJobState();
      return;
    }
    
    // Check if it's a supported job site
    const supportedSites = [
      'linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
      'monster.com', 'careerbuilder.com', 'simplyhired.com', 'flexjobs.com',
      'dice.com', 'angel.co', 'wellfound.com'
    ];
    
    const isJobSite = supportedSites.some(site => tab.url.includes(site));
    
    if (isJobSite) {
      // Extract job data from page
      const jobData = await extractJobDataFromPage(tab.id);
      if (jobData && jobData.title && jobData.company) {
        currentJob = jobData;
        showCurrentJob(jobData);
      } else {
        showNoJobState();
      }
    } else {
      showNoJobState();
    }
    
  } catch (error) {
    console.error('Error loading current job:', error);
    showNoJobState();
  }
}

// Extract job data from page
async function extractJobDataFromPage(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: extractJobData
    });
    
    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    
    return null;
    
  } catch (error) {
    console.error('Error extracting job data:', error);
    return null;
  }
}

// Function to extract job data (injected into page)
function extractJobData() {
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    url: window.location.href,
    source: '',
    extractedAt: new Date().toISOString()
  };
  
  const hostname = window.location.hostname.toLowerCase();
  
  // LinkedIn-specific selectors
  if (hostname.includes('linkedin')) {
    data.source = 'LinkedIn';
    
    const titleSelectors = [
      '.jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title-link',
      'h1[data-test-id="job-title"]',
      'h1'
    ];
    
    const companySelectors = [
      '.jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a'
    ];
    
    const locationSelectors = [
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__subtitle-item'
    ];
    
    const descriptionSelectors = [
      '.jobs-description-content__text',
      '.jobs-description',
      '.jobs-box__html-content'
    ];
    
    // Extract data
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.title = element.textContent.trim();
        break;
      }
    }
    
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.company = element.textContent.trim();
        break;
      }
    }
    
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.location = element.textContent.trim();
        break;
      }
    }
    
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.description = element.textContent.trim();
        break;
      }
    }
    
  } else {
    // Generic selectors for other sites
    const titleSelectors = ['h1[data-test-id="job-title"]', 'h1[data-testid="job-title"]', 'h1'];
    const companySelectors = ['[data-test-id="company-name"]', '[data-testid="company-name"]', '[class*="company"]'];
    const locationSelectors = ['[data-test-id="job-location"]', '[data-testid="job-location"]', '[class*="location"]'];
    const descriptionSelectors = ['[data-test-id="job-description"]', '[data-testid="job-description"]', '[class*="description"]'];
    
    // Extract data
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.title = element.textContent.trim();
        break;
      }
    }
    
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.company = element.textContent.trim();
        break;
      }
    }
    
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.location = element.textContent.trim();
        break;
      }
    }
    
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.description = element.textContent.trim();
        break;
      }
    }
    
    // Determine source
    if (hostname.includes('indeed')) data.source = 'Indeed';
    else if (hostname.includes('glassdoor')) data.source = 'Glassdoor';
    else if (hostname.includes('ziprecruiter')) data.source = 'ZipRecruiter';
    else if (hostname.includes('monster')) data.source = 'Monster';
    else if (hostname.includes('careerbuilder')) data.source = 'CareerBuilder';
    else if (hostname.includes('simplyhired')) data.source = 'SimplyHired';
    else if (hostname.includes('flexjobs')) data.source = 'FlexJobs';
    else if (hostname.includes('dice')) data.source = 'Dice';
    else if (hostname.includes('angel')) data.source = 'AngelList';
    else if (hostname.includes('wellfound')) data.source = 'Wellfound';
    else data.source = hostname;
  }
  
  return data;
}

// Show current job
function showCurrentJob(jobData) {
  elements.jobTitle.textContent = jobData.title;
  elements.jobCompany.textContent = jobData.company;
  elements.jobLocation.textContent = jobData.location || 'Not specified';
  
  const companyInitials = getCompanyInitials(jobData.company);
  const logoClass = getCompanyLogoClass(jobData.company);
  elements.jobCompanyInitials.textContent = companyInitials;
  elements.jobCompanyLogo.className = `company-logo ${logoClass}`;
  
  elements.jobDescriptionText.textContent = jobData.description || 'No description available.';
  
  elements.currentJobCard.classList.remove('hidden');
  elements.noJobState.classList.add('hidden');
}

// Show no job state
function showNoJobState() {
  elements.currentJobCard.classList.add('hidden');
  elements.noJobState.classList.remove('hidden');
}

// Show different views
function showView(viewName) {
  Object.values(sections).forEach(section => {
    section.classList.add('hidden');
  });
  
  if (sections[viewName]) {
    sections[viewName].classList.remove('hidden');
  }
}

// Event handlers
function handleLogin() {
  chrome.tabs.create({ url: 'https://www.cvcircle.io/sign-in' });
  window.close();
}

async function handleRefresh() {
  try {
    console.log('🔄 Refreshing session...');
    elements.refreshBtn.disabled = true;
    elements.refreshBtn.innerHTML = 'Refreshing...';
    
    // Force reinitialize the app
    await initializeApp();
    
  } catch (error) {
    console.error('❌ Error refreshing session:', error);
    elements.refreshBtn.innerHTML = 'Error';
    setTimeout(() => {
      elements.refreshBtn.disabled = false;
      elements.refreshBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M21 3v5h-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 21v-5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Refresh Session
      `;
    }, 2000);
  }
}

async function handleDebug() {
  try {
    console.log('🔍 Running debug...');
    
    const debugResults = {
      timestamp: new Date().toISOString(),
      popupLoaded: true,
      currentUser: currentUser,
      currentJob: currentJob,
      kpis: kpis
    };
    
    // Test cookie access
    try {
      const cookieTest = await chrome.runtime.sendMessage({ action: 'testCookies' });
      debugResults.cookieTest = cookieTest;
      console.log('🧪 Cookie test results:', cookieTest);
    } catch (error) {
      debugResults.cookieTestError = error.message;
      console.log('⚠️ Cookie test failed:', error);
    }
    
    // Test session
    try {
      const sessionTest = await chrome.runtime.sendMessage({ action: 'getSession' });
      debugResults.sessionTest = sessionTest;
      console.log('🔍 Session test results:', sessionTest);
    } catch (error) {
      debugResults.sessionTestError = error.message;
      console.log('⚠️ Session test failed:', error);
    }
    
    // Test environment
    try {
      const envTest = await chrome.runtime.sendMessage({ action: 'getEnvironment' });
      debugResults.environmentTest = envTest;
      console.log('🌍 Environment test results:', envTest);
    } catch (error) {
      debugResults.environmentTestError = error.message;
      console.log('⚠️ Environment test failed:', error);
    }
    
    // Show results in alert
    const debugInfo = `
CVCircle Extension Debug Results:
================================

Timestamp: ${debugResults.timestamp}
Popup Loaded: ${debugResults.popupLoaded}
Current User: ${debugResults.currentUser ? 'Yes' : 'No'}
Current Job: ${debugResults.currentJob ? 'Yes' : 'No'}

Cookie Test: ${debugResults.cookieTest ? 'Success' : 'Failed'}
${debugResults.cookieTestError ? `Error: ${debugResults.cookieTestError}` : ''}

Session Test: ${debugResults.sessionTest ? 'Success' : 'Failed'}
${debugResults.sessionTestError ? `Error: ${debugResults.sessionTestError}` : ''}

Environment Test: ${debugResults.environmentTest ? 'Success' : 'Failed'}
${debugResults.environmentTestError ? `Error: ${debugResults.environmentTestError}` : ''}

Full Results:
${JSON.stringify(debugResults, null, 2)}
    `;
    
    alert(debugInfo);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    alert(`Debug Error: ${error.message}`);
  }
}

async function handleSaveJob() {
  if (!currentJob) return;
  
  try {
    elements.saveJobBtn.disabled = true;
    elements.saveJobBtn.classList.add('loading');
    elements.saveJobBtn.innerHTML = 'Saving...';
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveJob',
      jobData: currentJob
    });
    
    if (response.success) {
      elements.saveJobBtn.classList.remove('loading');
      elements.saveJobBtn.classList.add('success');
      elements.saveJobBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Saved!
      `;
      
      // Update stats
      await loadUserData();
      
    } else {
      throw new Error(response.message || 'Failed to save job');
    }
    
  } catch (error) {
    console.error('Error saving job:', error);
    elements.saveJobBtn.classList.remove('loading');
    elements.saveJobBtn.classList.add('error');
    elements.saveJobBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Error
    `;
  } finally {
    elements.saveJobBtn.disabled = false;
  }
}

function handleDashboardLink(e) {
  e.preventDefault();
  chrome.runtime.sendMessage({ action: 'getEnvironment' }).then(env => {
    const baseUrl = env.apiBaseUrl;
    chrome.tabs.create({ url: `${baseUrl}/dashboard` });
    window.close();
  });
}

function handleHelpLink(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://www.cvcircle.io/help' });
  window.close();
}

// Utility functions
function getInitials(name) {
  if (!name) return 'U';
  const words = name.trim().split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
}

function getCompanyInitials(companyName) {
  if (!companyName) return 'CO';
  const words = companyName.trim().split(' ');
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
}

function getCompanyLogoClass(companyName) {
  if (!companyName) return 'default';
  const name = companyName.toLowerCase();
  
  if (name.includes('tech') || name.includes('software') || name.includes('ai') || name.includes('data')) {
    return 'tech';
  } else if (name.includes('bank') || name.includes('finance') || name.includes('capital') || name.includes('investment')) {
    return 'finance';
  } else if (name.includes('health') || name.includes('medical') || name.includes('pharma') || name.includes('care')) {
    return 'healthcare';
  } else if (name.includes('retail') || name.includes('store') || name.includes('shop') || name.includes('commerce')) {
    return 'retail';
  }
  
  return 'default';
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup received message:', request);
  
  switch (request.action) {
    case 'jobSaved':
      // Refresh data when a job is saved
      if (currentUser) {
        loadUserData();
      }
      break;
      
    case 'sessionUpdated':
      // Handle session updates
      if (request.isAuthenticated) {
        currentUser = request.user;
        loadUserData();
      } else {
        currentUser = null;
        showView('login');
      }
      break;
  }
});

console.log('CVCircle Job Tracker popup script loaded');


