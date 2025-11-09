// Content script for sidebar injection
console.log('CVCircle Sidebar content script loaded');

let sidebarContainer = null;
let sidebarIframe = null;
let isSidebarVisible = false;
let hasHandledCvCircleDomain = false; // Track if we've already handled cvcircle.io domain

// Initialize sidebar system
function initSidebar() {
  // Check if Chrome extension APIs are available
  if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) {
    console.warn('Chrome extension APIs not available');
    return;
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleSidebar') {
      toggleSidebar(request.show !== false);
      sendResponse({ success: true });
    } else if (request.action === 'extractJobData') {
      extractJobData().then(data => {
        sendResponse({ success: true, jobData: data });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Keep channel open for async
    }
    return false;
  });

  // Listen for extension icon click (via action)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSidebar') {
      toggleSidebar(true);
      sendResponse({ success: true });
    } else if (request.action === 'showFallbackPanel') {
      if (isCvCircleDomain() && !hasHandledCvCircleDomain) {
        showFallbackOpenPanelButton();
        hasHandledCvCircleDomain = true;
      }
      sendResponse({ success: true });
    }
  });

  // Create sidebar on page load for job board sites
  // For cvcircle.io domain, use side panel instead of iframe (iframe is blocked)
  if (isJobBoardPage()) {
    createSidebar();
    // Don't auto-show, wait for user click
    console.log('✅ CVCircle sidebar ready on job board. Click extension icon to open.');
  } else if (isCvCircleDomain()) {
    // On cvcircle.io domain, iframe is blocked - use side panel or show fallback
    if (!hasHandledCvCircleDomain) {
      console.log('⚠️ On cvcircle.io domain - iframe blocked, using side panel');
      hasHandledCvCircleDomain = true;
      showFallbackOpenPanelButton();
    }
  } else if (isCvCirclePage()) {
    // Localhost/dev - iframe should work
    createSidebar();
    console.log('✅ CVCircle sidebar ready (dev mode). Click extension icon to open.');
  }
}

// Check if current page is a job board
function isJobBoardPage() {
  const hostname = window.location.hostname.toLowerCase();
  const jobBoards = [
    'linkedin.com',
    'indeed.com',
    'glassdoor.com',
    'ziprecruiter.com',
    'monster.com',
    'careerbuilder.com',
    'simplyhired.com',
    'flexjobs.com',
    'dice.com',
    'angel.co',
    'wellfound.com',
    'jobs.lever.co',
    'jobs.greenhouse.io',
    'boards.greenhouse.io',
    'jobs.smartrecruiters.com',
  ];
  
  return jobBoards.some(board => hostname.includes(board));
}

// Check if current page is CVCircle website
function isCvCirclePage() {
  const hostname = window.location.hostname.toLowerCase();
  return hostname.includes('cvcircle.io') || 
         hostname.includes('localhost') ||
         hostname.includes('127.0.0.1') ||
         hostname.includes('cvcircle.local');
}

// Check if we're on cvcircle.io domain (where iframe is blocked)
function isCvCircleDomain() {
  const hostname = window.location.hostname.toLowerCase();
  return hostname.includes('cvcircle.io') && !hostname.includes('localhost') && 
         !hostname.includes('127.0.0.1') && !hostname.includes('cvcircle.local');
}

// Show fallback UI for cvcircle.io domain (where iframe is blocked)
function showFallbackOpenPanelButton() {
  // Remove any existing fallback
  const existing = document.getElementById('cvcircle-fallback-panel');
  if (existing) {
    return;
  }

  const fallbackContainer = document.createElement('div');
  fallbackContainer.id = 'cvcircle-fallback-panel';
  fallbackContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 999999;
    background: white;
    border: 2px solid #80FF00;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 300px;
  `;

  fallbackContainer.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
      <div style="width: 32px; height: 32px; background: #80FF00; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L8 4V6C8 7.1 8.9 8 10 8H14C15.1 8 16 7.1 16 6V4L12 2Z" fill="white"/>
          <rect x="6" y="6" width="12" height="14" rx="2" fill="white"/>
        </svg>
      </div>
      <h3 style="margin: 0; color: #1a1a1a; font-size: 16px; font-weight: 600;">CVCircle Extension</h3>
    </div>
    <p style="margin: 0 0 12px 0; color: #666; font-size: 14px; line-height: 1.4;">
      Click the extension icon in your browser toolbar to open the side panel.
    </p>
    <button id="cvcircle-open-sidepanel-btn" style="
      width: 100%;
      padding: 10px 16px;
      background: #80FF00;
      color: #1a1a1a;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    " onmouseover="this.style.background='#73E600'" onmouseout="this.style.background='#80FF00'">
      Open Extension Panel
    </button>
    <button id="cvcircle-close-fallback" style="
      width: 100%;
      padding: 8px 16px;
      margin-top: 8px;
      background: transparent;
      color: #666;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
    ">Dismiss</button>
  `;

  document.body.appendChild(fallbackContainer);

  // Handle button click
  const openBtn = document.getElementById('cvcircle-open-sidepanel-btn');
  openBtn.addEventListener('click', async () => {
    try {
      // Try to open side panel
      if (chrome.sidePanel && chrome.sidePanel.open) {
        await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
      } else {
        // Fallback: send message to background to open popup
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
      }
    } catch (error) {
      console.error('Error opening side panel:', error);
      // Fallback: open extension page in new tab
      chrome.runtime.sendMessage({ action: 'openExtensionPage' });
    }
  });

  // Handle dismiss
  const closeBtn = document.getElementById('cvcircle-close-fallback');
  closeBtn.addEventListener('click', () => {
    fallbackContainer.remove();
  });
}

// Create sidebar container and iframe
function createSidebar() {
  // Don't create iframe on cvcircle.io domain (it's blocked)
  if (isCvCircleDomain()) {
    // Only log once to avoid spam
    if (!hasHandledCvCircleDomain) {
      console.log('⚠️ Skipping iframe creation on cvcircle.io domain (blocked) - use side panel instead');
      hasHandledCvCircleDomain = true;
      showFallbackOpenPanelButton();
    }
    return;
  }

  if (sidebarContainer) {
    return; // Already created
  }

  // Create container
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'cvcircle-sidebar-container';
  sidebarContainer.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 450px;
    height: 100vh;
    z-index: 999999;
    background: white;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    border-left: 1px solid #e5e7eb;
    display: block;
  `;

  // Create iframe for React app
  sidebarIframe = document.createElement('iframe');
  sidebarIframe.id = 'cvcircle-sidebar-iframe';
  sidebarIframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
    isolation: isolate;
  `;
  // Since we're loading extension content (sidebar.html from our extension origin),
  // we don't need sandbox restrictions. Removing sandbox eliminates the security warning
  // about allow-same-origin + allow-scripts combination while maintaining security
  // because the content is already from our extension origin.
  //
  // The sandbox warning appears when using both allow-same-origin and allow-scripts together,
  // which can allow the iframe to escape its sandbox. Since we control the extension content,
  // we don't need this sandbox restriction.
  // sidebarIframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-same-origin');
  
  // Load sidebar HTML
  const sidebarPath = chrome.runtime.getURL('sidebar.html');
  
    // Check if user is authenticated to determine initial route
    // Use background script to get session (avoids CORS issues)
    async function askBackgroundForSession() {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('⚠️ Could not get session from background:', chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      });
    }

    (async function() {
      try {
        const resp = await askBackgroundForSession();
        let isAuthenticated = false;
        
        if (resp && resp.success && resp.session && resp.session.user) {
          isAuthenticated = true;
          // Update storage with latest session
          await chrome.storage.local.set({
            isAuthenticated: true,
            userData: {
              id: resp.session.user.id,
              email: resp.session.user.email,
              name: resp.session.user.name
            }
          });
          console.log('✅ Session synced from background script');
        } else {
          // Check storage as fallback
          const stored = await chrome.storage.local.get(['isAuthenticated']);
          isAuthenticated = stored.isAuthenticated || false;
        }
        
        const initialRoute = isAuthenticated ? '/extension/dashboard' : '/extension/auth';
        sidebarIframe.src = sidebarPath + '#' + initialRoute;
      } catch (error) {
        console.warn('⚠️ Error checking session:', error);
        // Fallback to storage check
        chrome.storage.local.get(['isAuthenticated'], (result) => {
          const isAuthenticated = result.isAuthenticated || false;
          const initialRoute = isAuthenticated ? '/extension/dashboard' : '/extension/auth';
          sidebarIframe.src = sidebarPath + '#' + initialRoute;
        });
      }
    })();
  
  sidebarContainer.appendChild(sidebarIframe);
  document.body.appendChild(sidebarContainer);
  
  // Add CSS isolation
  sidebarContainer.style.isolation = 'isolate';

  // Listen for messages from iframe
  window.addEventListener('message', handleIframeMessage);

  // Listen for session updates from background
  if (chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'SESSION_UPDATED' || request.action === 'SESSION_UPDATED') {
        console.log('🔄 Sidebar received session update:', request.session);
        // Reload iframe with new route if needed
        if (sidebarIframe && sidebarIframe.contentWindow) {
          const session = request.session || request.sessionData;
          const newRoute = session && session.isAuthenticated ? '/extension/dashboard' : '/extension/auth';
          const currentSrc = sidebarIframe.src.split('#')[0];
          sidebarIframe.src = currentSrc + '#' + newRoute;
        }
        sendResponse({ success: true });
      }
      return false;
    });
  }

  // Handle iframe load errors (especially for CVCircle domain blocking)
  sidebarIframe.onerror = () => {
    console.error('❌ Failed to load sidebar iframe');
    sidebarContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui; background: white; color: #333;">
        <h3 style="color: #80FF00; margin-bottom: 10px;">CVCircle Extension</h3>
        <p style="margin-bottom: 15px;">Sidebar cannot be loaded on this page due to browser security restrictions.</p>
        <p style="font-size: 14px; color: #666;">Try using the extension on a job board site (LinkedIn, Indeed, etc.)</p>
      </div>
    `;
  };
  
  // Also check for blocked content
  sidebarIframe.addEventListener('load', () => {
    try {
      // Try to access iframe content to detect if it's blocked
      if (sidebarIframe.contentDocument || sidebarIframe.contentWindow) {
        console.log('✅ Sidebar iframe loaded successfully');
      }
    } catch (e) {
      // Cross-origin error is expected, but if we get other errors, log them
      if (!e.message.includes('cross-origin')) {
        console.warn('⚠️ Potential iframe loading issue:', e);
      }
    }
  });

  // Add overlay for click-outside-to-close
  createOverlay();
  
}

// Create overlay for click-outside
function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'cvcircle-sidebar-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999998;
    display: none;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  `;
  
  overlay.addEventListener('click', () => {
    toggleSidebar(false);
  });
  
  document.body.appendChild(overlay);
}

// Toggle sidebar visibility
function toggleSidebar(show) {
  // On cvcircle.io domain, iframe is blocked - use side panel instead
  if (isCvCircleDomain()) {
    if (show) {
      // Try to open side panel (requires background script to handle)
      chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
        if (chrome.runtime.lastError) {
          // If side panel API not available, show fallback
          if (!hasHandledCvCircleDomain) {
            showFallbackOpenPanelButton();
          }
        }
      });
    }
    return;
  }
  
  if (!sidebarContainer) {
    createSidebar();
    // Wait for sidebar to be created before showing
    setTimeout(() => {
      toggleSidebar(show);
    }, 100);
    return;
  }

  isSidebarVisible = show;
  const overlay = document.getElementById('cvcircle-sidebar-overlay');

  if (show) {
    sidebarContainer.style.transform = 'translateX(0)';
    sidebarContainer.style.display = 'block';
    if (overlay) {
      overlay.style.display = 'block';
      setTimeout(() => {
        overlay.style.opacity = '1';
      }, 10);
    }
    
    // Automatically extract job data when sidebar opens on a job board
    if (isJobBoardPage()) {
      console.log('🔍 Sidebar opened on job board, extracting job data...');
      extractJobData().then(jobData => {
        if (jobData && (jobData.title || jobData.company)) {
          console.log('✅ Job data extracted:', jobData);
          // Send job data to sidebar iframe
          if (sidebarIframe && sidebarIframe.contentWindow) {
            sidebarIframe.contentWindow.postMessage({
              type: 'JOB_DATA_EXTRACTED',
              jobData: jobData
            }, '*');
          }
        } else {
          console.log('⚠️ No job data found on page');
        }
      }).catch(error => {
        console.error('❌ Error extracting job data:', error);
      });
    }
    
    console.log('✅ Sidebar opened');
  } else {
    sidebarContainer.style.transform = 'translateX(100%)';
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }
    console.log('✅ Sidebar closed');
  }
}

// Handle messages from iframe
function handleIframeMessage(event) {
  // Only accept messages from our extension
  if (event.origin !== window.location.origin && !event.data.type?.startsWith('EXTENSION_')) {
    return;
  }

  if (event.data.type === 'EXTENSION_SIDEBAR_CLOSE') {
    toggleSidebar(false);
  } else if (event.data.type === 'REQUEST_JOB_DATA') {
    // Force fresh extraction when forceRefresh is true
    const forceRefresh = event.data.forceRefresh === true;
    console.log(forceRefresh ? '🔄 Force refreshing job data...' : '📊 Extracting job data...');
    
    extractJobData().then(data => {
      if (sidebarIframe && sidebarIframe.contentWindow) {
        sidebarIframe.contentWindow.postMessage({
          type: 'JOB_DATA_EXTRACTED',
          jobData: data,
          forceRefresh: forceRefresh
        }, '*');
      }
    }).catch(error => {
      console.error('❌ Error extracting job data:', error);
      if (sidebarIframe && sidebarIframe.contentWindow) {
        sidebarIframe.contentWindow.postMessage({
          type: 'JOB_DATA_EXTRACTED',
          jobData: null,
          error: error.message
        }, '*');
      }
    });
  }
}

// Extract job data from current page with enhanced selectors
async function extractJobData() {
  const hostname = window.location.hostname.toLowerCase();
  const data = {
    title: '',
    jobTitle: '',
    company: '',
    location: '',
    description: '',
    jobDescription: '',
    url: window.location.href,
    jobUrl: window.location.href,
    source: hostname,
    extractedAt: new Date().toISOString(),
  };

  // Helper function to try multiple selectors
  const trySelectors = (selectors) => {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && el.textContent && el.textContent.trim()) {
          return el.textContent.trim();
        }
      } catch (e) {
        // Selector might be invalid, continue
      }
    }
    return '';
  };

  // LinkedIn - Most comprehensive selectors
  if (hostname.includes('linkedin')) {
    const titleSelectors = [
      'h1.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      'h1[data-test-id="job-title"]',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title-link',
      'h1.t-24',
      'h2.t-24'
    ];
    
    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      'a.job-details-jobs-unified-top-card__company-name',
      '.topcard__org-name-link',
      '.topcard__flavor--black-link'
    ];
    
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__subtitle-item',
      '.topcard__flavor--bullet',
      'span.topcard__flavor'
    ];
    
    const descriptionSelectors = [
      '.jobs-description-content__text',
      '.jobs-description',
      '.jobs-box__html-content',
      '#job-details',
      '.description__text'
    ];

    data.title = trySelectors(titleSelectors);
    data.jobTitle = data.title;
    data.company = trySelectors(companySelectors);
    data.location = trySelectors(locationSelectors);
    data.description = trySelectors(descriptionSelectors);
    data.jobDescription = data.description;
  }
  // Indeed - Updated selectors for current Indeed structure
  else if (hostname.includes('indeed')) {
    const titleSelectors = [
      'h1.jobsearch-JobInfoHeader-title',
      'h1[class*="jobsearch-JobInfoHeader"]',
      'h2.jobsearch-JobInfoHeader-title',
      'h1[data-testid="job-title"]',
      '.jobsearch-JobInfoHeader-title span',
      'h1.icl-u-xs-mb--xs'
    ];
    
    const companySelectors = [
      '[data-company-name="true"]',
      '[data-testid="company-name"]',
      '.jobsearch-InlineCompanyRating div',
      '.jobsearch-CompanyReview--heading',
      'div[data-testid="inlineHeader-companyName"]',
      'a[data-tn-element="companyName"]'
    ];
    
    const locationSelectors = [
      '[data-testid="job-location"]',
      '[data-testid="inlineHeader-companyLocation"]',
      '.jobsearch-JobInfoHeader-subtitle div',
      '.jobsearch-DesktopStickyContainer-subtitle div',
      'div[class*="JobInfoHeader"] div[class*="location"]'
    ];
    
    const descriptionSelectors = [
      '#jobDescriptionText',
      '[data-testid="job-description"]',
      '.jobsearch-jobDescriptionText',
      '#job-description',
      '.jobsearch-JobComponent-description'
    ];

    data.title = trySelectors(titleSelectors);
    data.jobTitle = data.title;
    data.company = trySelectors(companySelectors);
    data.location = trySelectors(locationSelectors);
    data.description = trySelectors(descriptionSelectors);
    data.jobDescription = data.description;
  }
  // Glassdoor
  else if (hostname.includes('glassdoor')) {
    const titleSelectors = [
      '[data-test="job-title"]',
      'h1[data-test="job-title"]',
      '.JobDetails_jobTitle__Rw_gn',
      'h1.heading_Heading__BqX5J'
    ];
    
    const companySelectors = [
      '[data-test="employer-name"]',
      '[data-test="company-name"]',
      '.EmployerProfile_employerName__Xemli',
      'span.EmployerProfile_compactEmployerName__LE'
    ];
    
    const locationSelectors = [
      '[data-test="location"]',
      '[data-test="job-location"]',
      '.JobDetails_location__mSg5h',
      'span[class*="location"]'
    ];
    
    const descriptionSelectors = [
      '[data-test="job-description"]',
      '#JobDescriptionContainer',
      '.JobDetails_jobDescription__uW_fK',
      'div[class*="description"]'
    ];

    data.title = trySelectors(titleSelectors);
    data.jobTitle = data.title;
    data.company = trySelectors(companySelectors);
    data.location = trySelectors(locationSelectors);
    data.description = trySelectors(descriptionSelectors);
    data.jobDescription = data.description;
  }
  // Generic fallback for other job boards
  else {
    const titleSelectors = [
      'h1',
      '[data-testid="job-title"]',
      '[data-test="job-title"]',
      '.job-title',
      'h1[class*="title"]',
      'h2[class*="title"]'
    ];
    
    const companySelectors = [
      '[data-testid="company-name"]',
      '[data-test="company-name"]',
      '.company-name',
      '[class*="company"]',
      'a[class*="company"]'
    ];
    
    const locationSelectors = [
      '[data-testid="job-location"]',
      '[data-test="job-location"]',
      '.job-location',
      '[class*="location"]'
    ];
    
    const descriptionSelectors = [
      '[data-testid="job-description"]',
      '[data-test="job-description"]',
      '.job-description',
      '[class*="description"]',
      '#job-description'
    ];

    data.title = trySelectors(titleSelectors);
    data.jobTitle = data.title;
    data.company = trySelectors(companySelectors);
    data.location = trySelectors(locationSelectors);
    data.description = trySelectors(descriptionSelectors);
    data.jobDescription = data.description;
  }

  // No truncation - allow full description to be saved

  console.log('📊 Extracted job data:', {
    title: data.title,
    company: data.company,
    location: data.location,
    descriptionLength: data.description ? data.description.length : 0,
    source: data.source
  });

  return data;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebar);
} else {
  initSidebar();
}
