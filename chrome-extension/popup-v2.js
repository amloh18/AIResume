// Enhanced Popup script for CVCircle Job Saver Extension
console.log('CVCircle Job Saver popup loaded');

// DOM elements
const loadingSection = document.getElementById('loading-section');
const authSection = document.getElementById('auth-section');
const userSection = document.getElementById('user-section');
const jobSection = document.getElementById('job-section');
const statusSection = document.getElementById('status-section');
const offlineSection = document.getElementById('offline-section');

const authStatusText = document.getElementById('auth-status-text');
const authStatusDot = document.querySelector('.status-dot');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const syncJobsBtn = document.getElementById('sync-jobs-btn');

const userName = document.getElementById('user-name');
const userEmail = document.getElementById('user-email');
const dashboardBtn = document.getElementById('dashboard-btn');

const jobTitle = document.getElementById('job-title');
const jobCompany = document.getElementById('job-company');
const jobLocation = document.getElementById('job-location');
const jobSource = document.getElementById('job-source');
const saveJobBtn = document.getElementById('save-job-btn');

const statusText = document.getElementById('status-text');
const savedJobsCount = document.getElementById('saved-jobs-count');
const syncedJobsCount = document.getElementById('synced-jobs-count');
const offlineJobsCount = document.getElementById('offline-jobs-count');

// State
let currentUser = null;
let currentJob = null;
let isAuthenticated = false;
let isOnline = navigator.onLine;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing popup');
  
  // Set up event listeners
  setupEventListeners();
  
  // Check online status
  updateOnlineStatus();
  
  // Set a timeout to prevent infinite loading
  const loadingTimeout = setTimeout(() => {
    console.log('Loading timeout reached, showing auth section');
    currentUser = null;
    isAuthenticated = false;
    updateUI();
  }, 5000); // 5 second timeout
  
  try {
    // Check authentication status
    await checkAuthStatus();
    
    // Load current job data
    await loadCurrentJob();
    
    // Update saved jobs count
    await updateSavedJobsCount();
    
    // Clear timeout since we completed successfully
    clearTimeout(loadingTimeout);
    
    // Show appropriate section
    updateUI();
  } catch (error) {
    console.error('Error during initialization:', error);
    clearTimeout(loadingTimeout);
    currentUser = null;
    isAuthenticated = false;
    updateUI();
  }
});

// Set up event listeners
function setupEventListeners() {
  // Auth buttons
  loginBtn.addEventListener('click', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  syncJobsBtn.addEventListener('click', handleSyncJobs);
  
  // User buttons
  dashboardBtn.addEventListener('click', handleOpenDashboard);
  
  // Job buttons
  saveJobBtn.addEventListener('click', handleSaveJob);
  
  // Footer links
  document.getElementById('help-link').addEventListener('click', handleHelp);
  document.getElementById('settings-link').addEventListener('click', handleSettings);
  document.getElementById('about-link').addEventListener('click', handleAbout);
  
  // Online/offline status
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

// Update online status
function updateOnlineStatus() {
  isOnline = navigator.onLine;
  console.log('Online status:', isOnline);
}

// Check authentication status
async function checkAuthStatus() {
  try {
    console.log('Checking authentication status');
    
    const response = await chrome.runtime.sendMessage({
      action: 'checkAuthStatus'
    });
    
    console.log('Auth status response:', response);
    
    if (response && response.success) {
      currentUser = response.user;
      isAuthenticated = true;
      updateAuthStatus('connected', `Connected as ${response.user.name || response.user.email}`);
    } else {
      currentUser = null;
      isAuthenticated = false;
      updateAuthStatus('error', 'Not authenticated - Click Login to connect your account');
    }
    
  } catch (error) {
    console.error('Error checking auth status:', error);
    currentUser = null;
    isAuthenticated = false;
    updateAuthStatus('error', 'Authentication check failed');
  }
}

// Update auth status display
function updateAuthStatus(status, text) {
  authStatusText.textContent = text;
  authStatusDot.className = `status-dot ${status}`;
}

// Handle login
async function handleLogin() {
  try {
    console.log('Opening login page');
    
    const response = await chrome.runtime.sendMessage({
      action: 'login'
    });
    
    if (response.success) {
      showStatus('success', 'Login page opened. Please complete authentication.');
      // Close popup after a short delay
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      showStatus('error', response.message || 'Failed to open login page');
    }
    
  } catch (error) {
    console.error('Error opening login page:', error);
    showStatus('error', 'Failed to open login page');
  }
}

// Handle logout
async function handleLogout() {
  try {
    console.log('Logging out');
    
    const response = await chrome.runtime.sendMessage({
      action: 'logout'
    });
    
    if (response.success) {
      // Update state
      currentUser = null;
      isAuthenticated = false;
      
      // Update UI
      updateUI();
      updateAuthStatus('error', 'Not authenticated');
      showStatus('success', 'Logged out successfully');
    } else {
      showStatus('error', response.message || 'Failed to logout');
    }
    
  } catch (error) {
    console.error('Error logging out:', error);
    showStatus('error', 'Failed to logout');
  }
}

// Handle sync jobs
async function handleSyncJobs() {
  try {
    console.log('Syncing jobs');
    
    // Show loading state
    syncJobsBtn.disabled = true;
    syncJobsBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Syncing...
    `;
    
    const response = await chrome.runtime.sendMessage({
      action: 'syncJobs'
    });
    
    if (response.success) {
      showStatus('success', response.message || 'Jobs synced successfully');
      await updateSavedJobsCount();
    } else {
      showStatus('error', response.message || 'Failed to sync jobs');
    }
    
  } catch (error) {
    console.error('Error syncing jobs:', error);
    showStatus('error', 'Failed to sync jobs');
  } finally {
    // Reset button state
    syncJobsBtn.disabled = false;
    syncJobsBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M23 4V10H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M20.49 15A9 9 0 1 1 5.64 5.64L23 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Sync Jobs
    `;
  }
}

// Handle open dashboard
async function handleOpenDashboard() {
  try {
    console.log('Opening dashboard');
    
    const dashboardUrl = 'https://cvcircle.io/dashboard';
    await chrome.tabs.create({ url: dashboardUrl });
    
    // Close popup
    window.close();
    
  } catch (error) {
    console.error('Error opening dashboard:', error);
    showStatus('error', 'Failed to open dashboard');
  }
}

// Load current job data
async function loadCurrentJob() {
  try {
    console.log('Loading current job data');
    
    // Get current tab with timeout
    const tabs = await Promise.race([
      chrome.tabs.query({ active: true, currentWindow: true }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tab query timeout')), 3000))
    ]);
    
    if (!tabs || tabs.length === 0) {
      console.log('No active tab found');
      return;
    }
    
    const tab = tabs[0];
    
    // Check if it's a supported job site
    const supportedSites = [
      'linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
      'monster.com', 'careerbuilder.com', 'simplyhired.com', 'flexjobs.com',
      'dice.com', 'angel.co', 'wellfound.com', 'seek.com.au', 'jobstreet.com',
      'totaljobs.com', 'reed.co.uk', 'stepstone.de', 'xing.com'
    ];
    
    const isJobSite = supportedSites.some(site => tab.url.includes(site));
    
    if (isJobSite) {
      console.log('Job site detected, extracting job data...');
      // Extract job data from page with timeout
      const jobData = await Promise.race([
        extractJobDataFromPage(tab.id),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Job extraction timeout')), 5000))
      ]);
      
      if (jobData) {
        currentJob = jobData;
        updateJobDisplay(jobData);
        console.log('Job data loaded successfully:', jobData);
      }
    } else {
      console.log('Not a supported job site');
    }
    
  } catch (error) {
    console.error('Error loading current job:', error);
    // Don't throw error, just log it and continue
  }
}

// Extract job data from page
async function extractJobDataFromPage(tabId) {
  try {
    // Inject content script to extract job data
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
    salary: '',
    url: window.location.href,
    source: '',
    extractedAt: new Date().toISOString()
  };
  
  // LinkedIn-specific selectors
  const hostname = window.location.hostname.toLowerCase();
  
  if (hostname.includes('linkedin')) {
    data.source = 'LinkedIn';
    
    // LinkedIn job title selectors
    const titleSelectors = [
      '.jobs-unified-top-card__job-title',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title-link',
      'h1[data-test-id="job-title"]',
      'h1'
    ];
    
    // LinkedIn company selectors
    const companySelectors = [
      '.jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '[data-test-id="job-details-job-title"] + div span'
    ];
    
    // LinkedIn location selectors
    const locationSelectors = [
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__subtitle-item',
      '[data-test-id="job-details-location"]'
    ];
    
    // LinkedIn description selectors
    const descriptionSelectors = [
      '.jobs-description-content__text',
      '.jobs-description',
      '.jobs-box__html-content',
      '[data-test-id="job-details-description"]'
    ];
    
    // Extract title
    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.title = element.textContent.trim();
        break;
      }
    }
    
    // Extract company
    for (const selector of companySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.company = element.textContent.trim();
        break;
      }
    }
    
    // Extract location
    for (const selector of locationSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.location = element.textContent.trim();
        break;
      }
    }
    
    // Extract description
    for (const selector of descriptionSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.description = element.textContent.trim();
        break;
      }
    }
    
  } else if (hostname.includes('indeed')) {
    data.source = 'Indeed';
    
    // Indeed-specific selectors
    const titleSelectors = [
      'h1[data-testid="job-title"]',
      '.jobsearch-JobInfoHeader-title',
      '.jobsearch-JobInfoHeader-title-container h1'
    ];
    
    const companySelectors = [
      '[data-testid="company-name"]',
      '.jobsearch-CompanyInfoContainer',
      '.jobsearch-CompanyInfoContainer a'
    ];
    
    const locationSelectors = [
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle',
      '.jobsearch-JobInfoHeader-subtitle .jobsearch-JobInfoHeader-subtitle-item'
    ];
    
    const descriptionSelectors = [
      '[data-testid="job-description"]',
      '.jobsearch-JobComponent-description',
      '.jobsearch-JobComponent-description .jobsearch-jobDescriptionText'
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
    const titleSelectors = [
      'h1[data-test-id="job-title"]',
      'h1[data-testid="job-title"]',
      'h1[data-test="job-title"]',
      'h1.job-title',
      'h1'
    ];
    
    const companySelectors = [
      '[data-test-id="company-name"]',
      '[data-testid="company-name"]',
      '[data-test="company-name"]',
      '.company-name',
      '[class*="company"]'
    ];
    
    const locationSelectors = [
      '[data-test-id="job-location"]',
      '[data-testid="job-location"]',
      '[data-test="job-location"]',
      '.job-location',
      '[class*="location"]'
    ];
    
    const descriptionSelectors = [
      '[data-test-id="job-description"]',
      '[data-testid="job-description"]',
      '[data-test="job-description"]',
      '.job-description',
      '[class*="description"]'
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
    
    // Determine source
    if (hostname.includes('glassdoor')) data.source = 'Glassdoor';
    else if (hostname.includes('ziprecruiter')) data.source = 'ZipRecruiter';
    else if (hostname.includes('monster')) data.source = 'Monster';
    else if (hostname.includes('careerbuilder')) data.source = 'CareerBuilder';
    else if (hostname.includes('simplyhired')) data.source = 'SimplyHired';
    else if (hostname.includes('flexjobs')) data.source = 'FlexJobs';
    else if (hostname.includes('dice')) data.source = 'Dice';
    else if (hostname.includes('angel')) data.source = 'AngelList';
    else if (hostname.includes('wellfound')) data.source = 'Wellfound';
    else if (hostname.includes('seek')) data.source = 'Seek';
    else if (hostname.includes('jobstreet')) data.source = 'JobStreet';
    else if (hostname.includes('totaljobs')) data.source = 'TotalJobs';
    else if (hostname.includes('reed')) data.source = 'Reed';
    else if (hostname.includes('stepstone')) data.source = 'StepStone';
    else if (hostname.includes('xing')) data.source = 'Xing';
    else data.source = hostname;
  }
  
  return data;
}

// Update job display
function updateJobDisplay(jobData) {
  jobTitle.textContent = jobData.title || '-';
  jobCompany.textContent = jobData.company || '-';
  jobLocation.textContent = jobData.location || '-';
  jobSource.textContent = jobData.source || '-';
}

// Handle save job
async function handleSaveJob() {
  try {
    console.log('Saving job:', currentJob);
    
    if (!currentJob) {
      showStatus('error', 'No job data to save');
      return;
    }
    
    // Show loading state
    saveJobBtn.disabled = true;
    saveJobBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Saving...
    `;
    
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'saveJob',
      jobData: currentJob
    });
    
    if (response.success) {
      showStatus('success', response.message || 'Job saved successfully!');
      saveJobBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Saved!
      `;
      
      // Update saved jobs count
      await updateSavedJobsCount();
    } else {
      throw new Error(response.message || 'Failed to save job');
    }
    
  } catch (error) {
    console.error('Error saving job:', error);
    showStatus('error', error.message || 'Failed to save job');
    saveJobBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M17 21V13H7V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M7 3V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Save Job
    `;
  } finally {
    saveJobBtn.disabled = false;
  }
}

// Show status message
function showStatus(type, message) {
  statusText.textContent = message;
  
  // Show status section
  hideAllSections();
  statusSection.classList.remove('hidden');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    statusSection.classList.add('hidden');
    updateUI();
  }, 3000);
}

// Update UI based on current state
function updateUI() {
  console.log('Updating UI - isOnline:', isOnline, 'isAuthenticated:', isAuthenticated, 'currentUser:', currentUser);
  
  hideAllSections();
  
  if (!isOnline) {
    // Show offline section
    console.log('Showing offline section');
    offlineSection.classList.remove('hidden');
    updateOfflineStats();
  } else if (isAuthenticated && currentUser) {
    // Show user section
    console.log('Showing user section');
    userSection.classList.remove('hidden');
    
    // Update user info
    userName.textContent = currentUser.name || 'User';
    userEmail.textContent = currentUser.email || '';
    
    // Show job section if we have job data
    if (currentJob) {
      console.log('Showing job section');
      jobSection.classList.remove('hidden');
    }
  } else {
    // Show auth section
    console.log('Showing auth section');
    authSection.classList.remove('hidden');
  }
}

// Hide all sections
function hideAllSections() {
  loadingSection.classList.add('hidden');
  authSection.classList.add('hidden');
  userSection.classList.add('hidden');
  jobSection.classList.add('hidden');
  statusSection.classList.add('hidden');
  offlineSection.classList.add('hidden');
}

// Update saved jobs count
async function updateSavedJobsCount() {
  try {
    const result = await chrome.storage.local.get(['savedJobs']);
    const savedJobs = result.savedJobs || [];
    const syncedJobs = savedJobs.filter(job => job.synced);
    
    if (savedJobsCount) {
      savedJobsCount.textContent = savedJobs.length.toString();
    }
    
    if (syncedJobsCount) {
      syncedJobsCount.textContent = syncedJobs.length.toString();
    }
    
    if (offlineJobsCount) {
      offlineJobsCount.textContent = savedJobs.length.toString();
    }
  } catch (error) {
    console.error('Error updating saved jobs count:', error);
  }
}

// Update offline stats
async function updateOfflineStats() {
  try {
    const result = await chrome.storage.local.get(['savedJobs']);
    const savedJobs = result.savedJobs || [];
    
    if (offlineJobsCount) {
      offlineJobsCount.textContent = savedJobs.length.toString();
    }
  } catch (error) {
    console.error('Error updating offline stats:', error);
  }
}

// Handle footer links
function handleHelp(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://cvcircle.io/help' });
  window.close();
}

function handleSettings(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://cvcircle.io/settings' });
  window.close();
}

function handleAbout(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://cvcircle.io/about' });
  window.close();
}
