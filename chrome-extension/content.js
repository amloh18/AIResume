// Content script for CVCircle Job Saver Extension
console.log('CVCircle Job Saver content script loaded');

// Job site configurations
const JOB_SITES = {
  'linkedin.com': {
    name: 'LinkedIn',
    selectors: {
      title: 'h1[data-test-id="job-title"], .jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title-link',
      company: '.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name a',
      location: '.jobs-unified-top-card__bullet, .job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__subtitle-item',
      description: '.jobs-description-content__text, .jobs-description, .jobs-box__html-content',
      url: window.location.href
    }
  },
  'indeed.com': {
    name: 'Indeed',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  },
  'glassdoor.com': {
    name: 'Glassdoor',
    selectors: {
      title: 'h1[data-test="job-title"]',
      company: '[data-test="company-name"]',
      location: '[data-test="job-location"]',
      description: '[data-test="job-description"]',
      url: window.location.href
    }
  },
  'ziprecruiter.com': {
    name: 'ZipRecruiter',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  },
  'monster.com': {
    name: 'Monster',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  },
  'careerbuilder.com': {
    name: 'CareerBuilder',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  },
  'simplyhired.com': {
    name: 'SimplyHired',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  },
  'flexjobs.com': {
    name: 'FlexJobs',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  },
  'dice.com': {
    name: 'Dice',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  },
  'angel.co': {
    name: 'AngelList',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  },
  'wellfound.com': {
    name: 'Wellfound',
    selectors: {
      title: 'h1[data-testid="job-title"]',
      company: '[data-testid="company-name"]',
      location: '[data-testid="job-location"]',
      description: '[data-testid="job-description"]',
      url: window.location.href
    }
  }
};

// Current job site configuration
let currentSite = null;
let saveButton = null;
let downloadButton = null;

// Initialize content script
function init() {
  console.log('Initializing CVCircle Job Saver content script');
  
  // Detect current job site
  currentSite = detectJobSite();
  
  if (currentSite) {
    console.log('Detected job site:', currentSite.name);
    
    // Debug LinkedIn-specific elements
    if (currentSite.name === 'LinkedIn') {
      console.log('🔍 LinkedIn Debug Info:');
      console.log('- URL:', window.location.href);
      console.log('- Job title elements:', document.querySelectorAll('.jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title'));
      console.log('- Company elements:', document.querySelectorAll('.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name'));
      console.log('- Job details container:', document.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card'));
      
      // Test job data extraction
      const testData = extractJobData();
      console.log('- Extracted job data:', testData);
    }
    
    createSaveButton();
    
    // Create LinkedIn-specific download button
    if (currentSite.name === 'LinkedIn') {
      createLinkedInDownloadButton();
    }
  } else {
    console.log('Not a supported job site');
  }
}

// Detect current job site
function detectJobSite() {
  const hostname = window.location.hostname.toLowerCase();
  
  for (const [domain, config] of Object.entries(JOB_SITES)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }
  
  return null;
}

// Create save button
function createSaveButton() {
  // Remove existing button if any
  if (saveButton) {
    saveButton.remove();
  }
  
  // LinkedIn-specific inline button
  if (currentSite && currentSite.name === 'LinkedIn') {
    createLinkedInSaveButton();
  } else {
    // Generic floating button for other sites
    createGenericSaveButton();
  }
}

// Create LinkedIn-specific save button
function createLinkedInSaveButton() {
  // Wait for LinkedIn's job actions to load
  setTimeout(() => {
    const jobActions = document.querySelector('.jobs-unified-top-card__actions, .job-details-jobs-unified-top-card__actions');
    
    if (jobActions) {
      // Create button element with LinkedIn styling
      saveButton = document.createElement('button');
      saveButton.className = 'artdeco-button artdeco-button--2 artdeco-button--secondary circle-cv-linkedin-save';
      saveButton.setAttribute('aria-label', 'Save job to CVCircle');
      saveButton.innerHTML = `
        <li-icon aria-hidden="true" type="download" size="20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-supported-dps="24x24" fill="currentColor" width="20" height="20" focusable="false">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </li-icon>
      `;
      
      // Add click handler
      saveButton.addEventListener('click', handleSaveClick);
      
      // Insert before the first action button (share button)
      const firstAction = jobActions.querySelector('button, .artdeco-button');
      if (firstAction) {
        jobActions.insertBefore(saveButton, firstAction);
        console.log('✅ LinkedIn save button inserted inline with actions');
      } else {
        // Fallback: append to actions container
        jobActions.appendChild(saveButton);
        console.log('✅ LinkedIn save button appended to actions');
      }
    } else {
      console.log('⚠️ LinkedIn job actions not found, retrying...');
      // Retry after a longer delay
      setTimeout(() => {
        createLinkedInSaveButton();
      }, 2000);
    }
  }, 1000);
}

// Create generic floating save button for other sites
function createGenericSaveButton() {
  // Create button element
  saveButton = document.createElement('button');
  saveButton.id = 'circle-cv-save-button';
  saveButton.className = 'circle-cv-save-button';
  saveButton.setAttribute('aria-label', 'Save job to CVCircle');
  saveButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  
  // Add click handler
  saveButton.addEventListener('click', handleSaveClick);
  
  // Position button
  positionSaveButton();
  
  // Add to page
  document.body.appendChild(saveButton);
}

// Create LinkedIn download button
function createLinkedInDownloadButton() {
  // Remove existing download button if any
  if (downloadButton) {
    downloadButton.remove();
  }
  
  // Wait for LinkedIn's job actions to load
  setTimeout(() => {
    const jobActions = document.querySelector('.jobs-unified-top-card__actions, .job-details-jobs-unified-top-card__actions');
    
    if (jobActions) {
      // Create download button element
      downloadButton = document.createElement('button');
      downloadButton.className = 'circle-cv-download-button';
      downloadButton.setAttribute('aria-label', 'Download job details');
      downloadButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      
      // Add click handler
      downloadButton.addEventListener('click', handleDownloadClick);
      
      // Insert before the first action button (share button)
      const firstAction = jobActions.querySelector('button, .artdeco-button');
      if (firstAction) {
        jobActions.insertBefore(downloadButton, firstAction);
        console.log('✅ LinkedIn download button inserted before share button');
      } else {
        // Fallback: append to actions container
        jobActions.appendChild(downloadButton);
        console.log('✅ LinkedIn download button appended to actions');
      }
    } else {
      console.log('⚠️ LinkedIn job actions not found, retrying...');
      // Retry after a longer delay
      setTimeout(() => {
        createLinkedInDownloadButton();
      }, 2000);
    }
  }, 1000);
}

// Position save button
function positionSaveButton() {
  if (!saveButton) return;
  
  // LinkedIn-specific positioning
  if (currentSite && currentSite.name === 'LinkedIn') {
    // Try to find LinkedIn job details container
    const jobDetails = document.querySelector('.jobs-unified-top-card, .job-details-jobs-unified-top-card, .jobs-details__main-content');
    
    if (jobDetails) {
      const rect = jobDetails.getBoundingClientRect();
      saveButton.style.position = 'fixed';
      saveButton.style.top = `${rect.top + window.scrollY + 10}px`;
      saveButton.style.right = '20px';
      saveButton.style.zIndex = '10000';
      console.log('✅ LinkedIn button positioned relative to job details');
      return;
    }
  }
  
  // Generic positioning for other sites
  const jobDetails = document.querySelector('[data-test-id="job-details"], [data-testid="job-details"], .job-details, .job-header');
  
  if (jobDetails) {
    const rect = jobDetails.getBoundingClientRect();
    saveButton.style.position = 'fixed';
    saveButton.style.top = `${rect.top + window.scrollY + 10}px`;
    saveButton.style.right = '20px';
    saveButton.style.zIndex = '10000';
  } else {
    // Fallback position
    saveButton.style.position = 'fixed';
    saveButton.style.top = '20px';
    saveButton.style.right = '20px';
    saveButton.style.zIndex = '10000';
  }
}

// Handle save button click
async function handleSaveClick() {
  try {
    console.log('Save button clicked');
    
    // Show loading state
    updateButtonState('loading');
    
    // Extract job data
    const jobData = extractJobData();
    
    if (!jobData.title || !jobData.company) {
      throw new Error('Could not extract job title or company');
    }
    
    // Send to background script
    const response = await chrome.runtime.sendMessage({
      action: 'saveJob',
      jobData: jobData
    });
    
    if (response.success) {
      updateButtonState('success');
      showSaveNotification('Job saved successfully!');
      setTimeout(() => {
        updateButtonState('normal');
      }, 2000);
    } else {
      throw new Error(response.message || 'Failed to save job');
    }
    
  } catch (error) {
    console.error('Error saving job:', error);
    updateButtonState('error');
    showSaveNotification(error.message || 'Failed to save job', 'error');
    setTimeout(() => {
      updateButtonState('normal');
    }, 3000);
  }
}

// Show save notification
function showSaveNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `circle-cv-notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${type === 'success' ? 
          '<path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' :
          '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        }
      </svg>
      <span>${message}</span>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#34C759' : '#FF3B30'};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    .circle-cv-notification {
      animation: slideIn 0.3s ease-out;
    }
    .circle-cv-notification.removing {
      animation: slideOut 0.3s ease-in;
    }
  `;
  document.head.appendChild(style);
  
  // Add to page
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('removing');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Handle download button click
async function handleDownloadClick(event) {
  event.preventDefault();
  event.stopPropagation();
  
  try {
    console.log('Download button clicked');
    
    // Show loading state
    updateDownloadButtonState('loading');
    
    // Extract job data
    const jobData = extractJobData();
    
    if (!jobData.title || !jobData.company) {
      throw new Error('Could not extract job title or company');
    }
    
    // Create downloadable content
    const downloadContent = createDownloadableContent(jobData);
    
    // Create and trigger download
    const blob = new Blob([downloadContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-${jobData.company.replace(/[^a-zA-Z0-9]/g, '-')}-${jobData.title.replace(/[^a-zA-Z0-9]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show success state
    updateDownloadButtonState('success');
    setTimeout(() => {
      updateDownloadButtonState('normal');
    }, 2000);
    
  } catch (error) {
    console.error('Error downloading job:', error);
    updateDownloadButtonState('error');
    setTimeout(() => {
      updateDownloadButtonState('normal');
    }, 3000);
  }
}

// Create downloadable content
function createDownloadableContent(jobData) {
  const content = `
JOB DETAILS
===========

Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location}
Source: ${jobData.source}
URL: ${jobData.url}
Extracted: ${new Date(jobData.extractedAt).toLocaleString()}

DESCRIPTION
===========
${jobData.description}

---
Downloaded via CVCircle Job Saver Extension
  `;
  
  return content.trim();
}

// Update download button state
function updateDownloadButtonState(state) {
  if (!downloadButton) return;
  
  // Remove existing state classes
  downloadButton.classList.remove('loading', 'success', 'error');
  
  // Add new state class
  if (state !== 'normal') {
    downloadButton.classList.add(state);
  }
  
  const svg = downloadButton.querySelector('svg');
  
  switch (state) {
    case 'loading':
      svg.style.animation = 'spin 1s linear infinite';
      break;
    case 'success':
      svg.style.animation = 'checkmark 0.5s ease-in-out';
      break;
    case 'error':
      svg.style.animation = 'shake 0.5s ease-in-out';
      break;
    default:
      svg.style.animation = 'none';
  }
}

// Extract job data from page
function extractJobData() {
  if (!currentSite) return {};
  
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    url: window.location.href,
    source: currentSite.name,
    extractedAt: new Date().toISOString()
  };
  
  // Extract using selectors (handle multiple selectors)
  for (const [field, selector] of Object.entries(currentSite.selectors)) {
    if (field === 'url') continue;
    
    // Split selectors by comma and try each one
    const selectors = selector.split(',').map(s => s.trim());
    let found = false;
    
    for (const sel of selectors) {
      const element = document.querySelector(sel);
      if (element && element.textContent.trim()) {
        data[field] = element.textContent.trim();
        found = true;
        break;
      }
    }
    
    // If not found with selectors, try fallback methods
    if (!found) {
      data[field] = getFallbackData(field);
    }
  }
  
  return data;
}

// Fallback extraction methods
function getFallbackData(field) {
  switch (field) {
    case 'title':
      // Try multiple title selectors
      const titleSelectors = [
        'h1',
        '[class*="job-title"]',
        '[class*="title"]',
        '.job-title',
        '.title'
      ];
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      return '';
      
    case 'company':
      // Try multiple company selectors
      const companySelectors = [
        '[class*="company"]',
        '[class*="employer"]',
        '.company',
        '.employer',
        '[data-testid*="company"]'
      ];
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      return '';
      
    case 'location':
      // Try multiple location selectors
      const locationSelectors = [
        '[class*="location"]',
        '[class*="address"]',
        '.location',
        '.address',
        '[data-testid*="location"]'
      ];
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      return '';
      
    case 'description':
      // Try multiple description selectors
      const descriptionSelectors = [
        '[class*="description"]',
        '[class*="content"]',
        '.description',
        '.content',
        '[data-testid*="description"]'
      ];
      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      return '';
      
    default:
      return '';
  }
}

// Update button state
function updateButtonState(state) {
  if (!saveButton) return;
  
  // Remove existing state classes
  saveButton.classList.remove('loading', 'success', 'error');
  
  // Add new state class
  if (state !== 'normal') {
    saveButton.classList.add(state);
  }
  
  const svg = saveButton.querySelector('svg');
  
  switch (state) {
    case 'loading':
      svg.style.animation = 'spin 1s linear infinite';
      break;
    case 'success':
      svg.style.animation = 'checkmark 0.5s ease-in-out';
      break;
    case 'error':
      svg.style.animation = 'shake 0.5s ease-in-out';
      break;
    default:
      svg.style.animation = 'none';
  }
}

// Handle page changes (for SPA sites)
let lastUrl = window.location.href;
let lastJobContent = '';

const observer = new MutationObserver(() => {
  // Check for URL changes
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    setTimeout(init, 1000); // Reinitialize after page change
    return;
  }
  
  // Check for LinkedIn job content changes (when clicking different jobs)
  if (currentSite && currentSite.name === 'LinkedIn') {
    const currentJobContent = getCurrentJobContent();
    if (currentJobContent && currentJobContent !== lastJobContent) {
      lastJobContent = currentJobContent;
      console.log('🔄 LinkedIn job content changed, updating button');
      setTimeout(() => {
        if (currentSite.name === 'LinkedIn') {
          // Recreate both buttons for new job
          createLinkedInSaveButton();
          createLinkedInDownloadButton();
        } else {
          // For other sites, just reposition the floating button
          if (saveButton) {
            positionSaveButton();
          }
        }
      }, 500);
    }
  }
});

// Get current job content identifier for LinkedIn
function getCurrentJobContent() {
  const titleElement = document.querySelector('.jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title');
  const companyElement = document.querySelector('.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name');
  
  if (titleElement && companyElement) {
    return `${titleElement.textContent.trim()}-${companyElement.textContent.trim()}`;
  }
  return '';
}

observer.observe(document.body, { childList: true, subtree: true });

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
