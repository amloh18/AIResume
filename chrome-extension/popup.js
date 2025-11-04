// CVCircle Job Tracker Extension - Main App Authentication Design
console.log('CVCircle Job Tracker popup loaded with main app authentication design');

let extensionAuth = null;
let currentUser = null;
let currentJob = null;
let kpis = {};

// Authentication state
let authMode = 'signin'; // 'signin', 'verify-code'
let email = '';
let verificationType = 'passwordless-login'; // 'passwordless-login', 'password-reset', 'email-verification'
let remainingAttempts = 5;
let cooldownSeconds = 0;
let canResend = true;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Initializing popup with main app authentication design');
  setupEventListeners();
  initializeExtension();
});

// Safe DOM element getter
function getElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`⚠️ Element not found: ${id}`);
  }
  return element;
}

// Set up event listeners
function setupEventListeners() {
  console.log('🔧 Setting up event listeners...');
  
  // Authentication forms
  const signinBtn = getElement('signin-btn');
  const sendCodeBtn = getElement('send-code-btn');
  const passwordToggle = getElement('password-toggle');
  const resendCodeBtn = getElement('resend-code-btn');
  const resetPasswordLink = getElement('reset-password-link');
  
  // Code verification inputs
  const codeInputs = [
    getElement('code-input-1'),
    getElement('code-input-2'),
    getElement('code-input-3'),
    getElement('code-input-4')
  ];
  
  // Sign in button
  if (signinBtn) signinBtn.addEventListener('click', handleSignIn);
  
  // Send code button
  if (sendCodeBtn) sendCodeBtn.addEventListener('click', handleSendCode);
  
  // Password toggle
  if (passwordToggle) passwordToggle.addEventListener('click', togglePasswordVisibility);
  
  // Reset password link
  if (resetPasswordLink) resetPasswordLink.addEventListener('click', () => switchToResetPassword());
  
  // Code input handlers
  codeInputs.forEach((input, index) => {
    if (input) {
      input.addEventListener('input', (e) => handleCodeInput(e, index));
      input.addEventListener('keydown', (e) => handleCodeKeyDown(e, index));
    }
  });
  
  // Job actions
  const saveJobBtn = getElement('save-job-btn');
  const editJobBtn = getElement('edit-job-btn');
  if (saveJobBtn) saveJobBtn.addEventListener('click', handleSaveJob);
  if (editJobBtn) editJobBtn.addEventListener('click', handleEditJob);
  
  // Footer links
  const dashboardLink = getElement('dashboard-link');
  const helpLink = getElement('help-link');
  if (dashboardLink) dashboardLink.addEventListener('click', handleDashboardLink);
  if (helpLink) helpLink.addEventListener('click', handleHelpLink);
  
  // Debug
  const debugBtn = getElement('debug-btn');
  if (debugBtn) debugBtn.addEventListener('click', handleDebug);
  
  console.log('✅ Event listeners set up');
}

// Initialize extension authentication
function initializeExtension() {
  console.log('🔐 Initializing extension...');
  
  // Show loading state first
  showView('loading');
  
  // Check if ExtensionAuth is available
  if (typeof ExtensionAuth === 'undefined') {
    console.error('❌ ExtensionAuth class not found');
    showMessage('Authentication system failed to load. Please refresh.', 'error');
    showView('login');
    return;
  }
  
  try {
    extensionAuth = new ExtensionAuth();
    console.log('✅ ExtensionAuth initialized');
    
    // Quick authentication check
    setTimeout(() => {
      try {
        checkAuthState();
      } catch (error) {
        console.error('❌ Auth state check failed:', error);
        showView('login');
      }
    }, 500);
    
  } catch (error) {
    console.error('❌ Extension initialization failed:', error);
    showMessage('Extension initialization failed. Please try again.', 'error');
    showView('login');
  }
}

// Check current authentication state
function checkAuthState() {
  try {
    if (extensionAuth && extensionAuth.isLoggedIn()) {
      console.log('✅ User already authenticated');
      currentUser = extensionAuth.currentUser;
      loadUserData();
    } else {
      console.log('❌ User not authenticated, showing login');
      showView('login');
    }
  } catch (error) {
    console.error('❌ Auth state check error:', error);
    showView('login');
  }
}

// Show/hide sections
function showView(viewName) {
  try {
    const sections = {
      loading: getElement('loading-section'),
      login: getElement('login-section'),
      dashboard: getElement('dashboard-section')
    };
    
    // Hide all sections
    Object.values(sections).forEach(section => {
      if (section) section.classList.add('hidden');
    });
    
    // Show requested section
    if (sections[viewName]) {
      sections[viewName].classList.remove('hidden');
      console.log(`✅ Showing view: ${viewName}`);
    } else {
      console.warn(`⚠️ View not found: ${viewName}`);
    }
  } catch (error) {
    console.error('❌ Error showing view:', error);
  }
}

// Switch between authentication forms
function showAuthForm(formName) {
  const signinForm = getElement('signin-form');
  const codeForm = getElement('code-verification-form');
  
  if (signinForm) signinForm.classList.add('hidden');
  if (codeForm) codeForm.classList.add('hidden');
  
  if (formName === 'signin' && signinForm) {
    signinForm.classList.remove('hidden');
  } else if (formName === 'code' && codeForm) {
    codeForm.classList.remove('hidden');
  }
}

// Show message to user
function showMessage(message, type = 'info') {
  const authMessage = getElement('auth-message');
  if (!authMessage) {
    console.warn('⚠️ Cannot show message: auth-message element not found');
    return;
  }
  
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
  authMessage.classList.remove('hidden');
  
  console.log(`📢 ${type.toUpperCase()}: ${message}`);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    authMessage.classList.add('hidden');
  }, 5000);
}

// Handle Sign In
async function handleSignIn() {
  try {
    const emailInput = getElement('email-input');
    const passwordInput = getElement('password-input');
    const signinBtn = getElement('signin-btn');
    
    const userEmail = emailInput?.value.trim();
    const password = passwordInput?.value;
    
    if (!userEmail || !userEmail.includes('@')) {
      showMessage('Please enter a valid email address', 'error');
      return;
    }
    
    if (!password) {
      showMessage('Please enter your password', 'error');
      return;
    }
    
    if (signinBtn) {
      signinBtn.disabled = true;
      const btnText = signinBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Signing in...';
    }
    
    // Use extensionAuth to sign in with credentials
    const result = await extensionAuth.loginWithPassword(userEmail, password);
    
    if (result.success) {
      currentUser = result.user;
      showMessage('Successfully signed in!', 'success');
      
      // Load user data and show dashboard
      setTimeout(async () => {
        await loadUserData();
      }, 500);
    }
    
  } catch (error) {
    console.error('Error with sign in:', error);
    showMessage(error.message || 'Sign in failed', 'error');
  } finally {
    const signinBtn = getElement('signin-btn');
    if (signinBtn) {
      signinBtn.disabled = false;
      const btnText = signinBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Sign In';
    }
  }
}

// Handle Send Code (for passwordless login)
async function handleSendCode() {
  try {
    const emailInput = getElement('email-input');
    const sendCodeBtn = getElement('send-code-btn');
    
    const userEmail = emailInput?.value.trim();
    
    if (!userEmail || !userEmail.includes('@')) {
      showMessage('Please enter a valid email address', 'error');
      return;
    }
    
    if (sendCodeBtn) {
      sendCodeBtn.disabled = true;
      const btnText = sendCodeBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Sending code...';
    }
    
    // Use extensionAuth to send PIN
    await extensionAuth.sendPINToEmail(userEmail);
    
    // Switch to code verification
    email = userEmail;
    verificationType = 'passwordless-login';
    showAuthForm('code');
    focusFirstCodeInput();
    
    showMessage('4-digit code sent to your email!', 'success');
    
  } catch (error) {
    console.error('Error sending code:', error);
    showMessage(error.message || 'Failed to send code', 'error');
  } finally {
    const sendCodeBtn = getElement('send-code-btn');
    if (sendCodeBtn) {
      sendCodeBtn.disabled = false;
      const btnText = sendCodeBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Send me a code';
    }
  }
}

// Handle code input
function handleCodeInput(event, index) {
  const input = event.target;
  const value = input.value.replace(/[^0-9]/g, '');
  
  input.value = value;
  
  // Auto-focus next input
  if (value && index < 3) {
    const nextInput = getElement(`code-input-${index + 2}`);
    nextInput?.focus();
  }
  
  // Check if all digits are filled
  const code = getEnteredCode();
  if (code.length === 4) {
    handleCodeVerification(code);
  }
}

// Handle code key down
function handleCodeKeyDown(event, index) {
  if (event.key === 'Backspace') {
    if (!event.target.value && index > 0) {
      const prevInput = getElement(`code-input-${index}`);
      prevInput?.focus();
    }
  }
}

// Get entered code
function getEnteredCode() {
  let code = '';
  for (let i = 1; i <= 4; i++) {
    const input = getElement(`code-input-${i}`);
    code += input?.value || '';
  }
  return code;
}

// Focus first code input
function focusFirstCodeInput() {
  const firstInput = getElement('code-input-1');
  firstInput?.focus();
}

// Handle code verification
async function handleCodeVerification(code) {
  try {
    if (!email) {
      showMessage('Email not found. Please try again.', 'error');
      showAuthForm('signin');
      return;
    }
    
    // Use extensionAuth to verify PIN
    const result = await extensionAuth.authenticateWithPIN(email, code);
    
    if (result.success) {
      currentUser = result.user;
      showMessage('Authentication successful!', 'success');
      
      // Load user data and show dashboard
      setTimeout(async () => {
        await loadUserData();
      }, 500);
    } else {
      remainingAttempts--;
      if (remainingAttempts <= 0) {
        showMessage('Too many attempts. Please request a new code.', 'error');
        showAuthForm('signin');
        resetCodeInputs();
      } else {
        showMessage(`Invalid code. ${remainingAttempts} attempts remaining.`, 'error');
        resetCodeInputs();
      }
    }
    
  } catch (error) {
    console.error('Error verifying code:', error);
    showMessage(error.message || 'Code verification failed', 'error');
    resetCodeInputs();
  }
}

// Reset code inputs
function resetCodeInputs() {
  for (let i = 1; i <= 4; i++) {
    const input = getElement(`code-input-${i}`);
    if (input) input.value = '';
  }
  focusFirstCodeInput();
}

// Switch to reset password
function switchToResetPassword() {
  showMessage('Password reset functionality coming soon!', 'info');
}

// Toggle password visibility
function togglePasswordVisibility() {
  const passwordInput = getElement('password-input');
  const eyeIcon = document.querySelector('.eye-icon');
  
  if (passwordInput && eyeIcon) {
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      eyeIcon.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    } else {
      passwordInput.type = 'password';
      eyeIcon.innerHTML = `
        <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      `;
    }
  }
}

// Load user data and stats
async function loadUserData() {
  try {
    showView('loading');
    
    // Load jobs and KPIs
    const jobsResponse = await chrome.runtime.sendMessage({ action: 'fetchJobs' });
    
    if (jobsResponse && jobsResponse.success) {
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
  
  const userName = getElement('user-name');
  const userEmail = getElement('user-email');
  const userAvatarImg = getElement('user-avatar-img');
  const userAvatarInitials = getElement('user-avatar-initials');
  
  if (userName) userName.textContent = currentUser.name || 'User';
  if (userEmail) userEmail.textContent = currentUser.email || '';
  
  // Set avatar
  if (userAvatarImg && currentUser.image) {
    userAvatarImg.src = currentUser.image;
    userAvatarImg.style.display = 'block';
    if (userAvatarInitials) userAvatarInitials.style.display = 'none';
  } else {
    const initials = getInitials(currentUser.name || currentUser.email);
    if (userAvatarInitials) {
      userAvatarInitials.textContent = initials;
      userAvatarInitials.style.display = 'flex';
    }
    if (userAvatarImg) userAvatarImg.style.display = 'none';
  }
}

// Update stats display
function updateStats() {
  const totalJobs = getElement('total-jobs');
  const appliedJobs = getElement('applied-jobs');
  const interviewJobs = getElement('interview-jobs');
  
  if (totalJobs) totalJobs.textContent = kpis.totalJobs || 0;
  if (appliedJobs) appliedJobs.textContent = kpis.appliedJobs || 0;
  if (interviewJobs) interviewJobs.textContent = kpis.interviewJobs || 0;
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
  const jobTitle = getElement('job-title');
  const jobCompany = getElement('job-company');
  const jobLocation = getElement('job-location');
  const jobSource = getElement('job-source');
  const jobCompanyLogo = getElement('job-company-logo');
  const jobCompanyInitials = getElement('job-company-initials');
  const jobDescriptionText = getElement('job-description-text');
  
  if (jobTitle) jobTitle.textContent = jobData.title;
  if (jobCompany) jobCompany.textContent = jobData.company;
  if (jobLocation) jobLocation.textContent = jobData.location || 'Not specified';
  if (jobSource) jobSource.textContent = jobData.source || 'Unknown';
  
  const companyInitials = getCompanyInitials(jobData.company);
  const logoClass = getCompanyLogoClass(jobData.company);
  if (jobCompanyInitials) jobCompanyInitials.textContent = companyInitials;
  if (jobCompanyLogo) jobCompanyLogo.className = `company-logo ${logoClass}`;
  
  if (jobDescriptionText) jobDescriptionText.textContent = jobData.description || 'No description available.';
  
  // Update captured fields
  updateCapturedFields(jobData);
  
  // Update missing fields checklist
  updateMissingFieldsList(jobData);
  
  const currentJobCard = getElement('current-job-card');
  const noJobState = getElement('no-job-state');
  
  if (currentJobCard) currentJobCard.classList.remove('hidden');
  if (noJobState) noJobState.classList.add('hidden');
}

// Update captured fields display
function updateCapturedFields(jobData) {
  const jobSalary = getElement('job-salary');
  const jobType = getElement('job-type');
  const jobRemote = getElement('job-remote');
  const jobSponsorship = getElement('job-sponsorship');
  
  // Salary information (often missing from job sites)
  if (jobSalary) {
    if (jobData.salary) {
      jobSalary.textContent = jobData.salary;
      jobSalary.classList.remove('missing-field');
    } else {
      jobSalary.textContent = 'Not captured';
      jobSalary.classList.add('missing-field');
    }
  }
  
  // Job type
  if (jobType) {
    if (jobData.type) {
      jobType.textContent = jobData.type;
      jobType.classList.remove('missing-field');
    } else {
      jobType.textContent = 'Not captured';
      jobType.classList.add('missing-field');
    }
  }
  
  // Remote work
  if (jobRemote) {
    if (jobData.remote !== undefined) {
      jobRemote.textContent = jobData.remote ? 'Yes' : 'No';
      jobRemote.classList.remove('missing-field');
    } else {
      jobRemote.textContent = 'Not captured';
      jobRemote.classList.add('missing-field');
    }
  }
  
  // Sponsorship (often not explicitly stated)
  if (jobSponsorship) {
    if (jobData.sponsorship) {
      jobSponsorship.textContent = jobData.sponsorship;
      jobSponsorship.classList.remove('missing-field');
    } else {
      jobSponsorship.textContent = 'Unknown';
      jobSponsorship.classList.add('missing-field');
    }
  }
}

// Update missing fields checklist
function updateMissingFieldsList(jobData) {
  const missingFieldsList = getElement('missing-fields-list');
  if (!missingFieldsList) return;
  
  const missingFields = [];
  
  // Check what information is missing
  if (!jobData.salary) missingFields.push('salary');
  if (!jobData.type) missingFields.push('job-type');
  if (jobData.remote === undefined) missingFields.push('remote');
  if (!jobData.sponsorship) missingFields.push('sponsorship');
  
  // Add other common missing fields
  missingFields.push('priority', 'notes', 'contacts', 'deadline', 'interview-dates');
  
  // Update the list
  const missingItems = missingFieldsList.querySelectorAll('.missing-item');
  missingItems.forEach(item => {
    const field = item.getAttribute('data-field');
    if (missingFields.includes(field)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// Show no job state
function showNoJobState() {
  const currentJobCard = getElement('current-job-card');
  const noJobState = getElement('no-job-state');
  
  if (currentJobCard) currentJobCard.classList.add('hidden');
  if (noJobState) noJobState.classList.remove('hidden');
}

// Event handlers
async function handleSaveJob() {
  if (!currentJob) return;
  
  try {
    const saveJobBtn = getElement('save-job-btn');
    if (saveJobBtn) {
      saveJobBtn.disabled = true;
      saveJobBtn.classList.add('loading');
      saveJobBtn.innerHTML = 'Saving...';
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'saveJob',
      jobData: currentJob
    });
    
    if (response.success) {
      if (saveJobBtn) {
        saveJobBtn.classList.remove('loading');
        saveJobBtn.classList.add('success');
        saveJobBtn.innerHTML = 'Saved!';
      }
      
      // Update stats
      await loadUserData();
      
    } else {
      throw new Error(response.message || 'Failed to save job');
    }
    
  } catch (error) {
    console.error('Error saving job:', error);
    const saveJobBtn = getElement('save-job-btn');
    if (saveJobBtn) {
      saveJobBtn.classList.remove('loading');
      saveJobBtn.classList.add('error');
      saveJobBtn.innerHTML = 'Error';
    }
  } finally {
    const saveJobBtn = getElement('save-job-btn');
    if (saveJobBtn) saveJobBtn.disabled = false;
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

function handleEditJob() {
  chrome.runtime.sendMessage({ action: 'getEnvironment' }).then(env => {
    const baseUrl = env.apiBaseUrl;
    chrome.tabs.create({ url: `${baseUrl}/dashboard?section=jobs&action=create&jobTitle=${encodeURIComponent(currentJob.title)}&company=${encodeURIComponent(currentJob.company)}` });
    window.close();
  });
}

async function handleDebug() {
  try {
    console.log('🔍 Running debug...');
    
    const debugResults = {
      timestamp: new Date().toISOString(),
      popupLoaded: true,
      extensionAuthLoaded: typeof ExtensionAuth !== 'undefined',
      currentUser: currentUser,
      currentJob: currentJob,
      kpis: kpis,
      authMode: authMode,
      email: email,
      verificationType: verificationType
    };
    
    // Test environment
    try {
      const envTest = await chrome.runtime.sendMessage({ action: 'getEnvironment' });
      debugResults.environmentTest = envTest;
      console.log('🌍 Environment test results:', envTest);
    } catch (error) {
      debugResults.environmentTestError = error.message;
      console.log('⚠️ Environment test failed:', error);
    }
    
    // Test DOM elements
    const elementTests = {};
    const testElements = ['email-input', 'password-input', 'signin-btn', 'send-code-btn', 'code-input-1'];
    testElements.forEach(id => {
      elementTests[id] = !!getElement(id);
    });
    debugResults.elementTests = elementTests;
    
    // Show results in alert
    const debugInfo = `
CVCircle Extension Debug Results:
================================

Timestamp: ${debugResults.timestamp}
Popup Loaded: ${debugResults.popupLoaded}
Extension Auth Loaded: ${debugResults.extensionAuthLoaded}
Current User: ${debugResults.currentUser ? 'Yes' : 'No'}
Current Job: ${debugResults.currentJob ? 'Yes' : 'No'}
Auth Mode: ${debugResults.authMode}
Email: ${debugResults.email || 'Not set'}
Verification Type: ${debugResults.verificationType}

Environment Test: ${debugResults.environmentTest ? 'Success' : 'Failed'}
${debugResults.environmentTestError ? `Error: ${debugResults.environmentTestError}` : ''}

Element Tests:
${Object.entries(elementTests).map(([key, value]) => `${key}: ${value ? '✅' : '❌'}`).join('\n')}

Full Results:
${JSON.stringify(debugResults, null, 2)}
    `;
    
    alert(debugInfo);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    alert(`Debug Error: ${error.message}`);
  }
}

// Handle messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Popup received message:', request);
  
  switch (request.action) {
    case 'jobSaved':
      if (currentUser) {
        loadUserData();
      }
      break;
      
    case 'authStateChanged':
    case 'broadcastSessionUpdate':
      console.log('🔄 Auth state update received:', request);
      if (request.isAuthenticated && request.user) {
        currentUser = request.user;
        loadUserData();
      } else {
        currentUser = null;
        showView('login');
      }
      break;
  }
});

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

console.log('CVCircle Job Tracker popup script loaded with main app authentication design');
