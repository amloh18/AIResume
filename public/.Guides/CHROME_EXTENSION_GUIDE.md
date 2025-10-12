# Circle CV - Chrome Extension Guide

This comprehensive guide covers the Chrome extension development, features, and integration with the Circle CV platform.

## 📋 Table of Contents

1. [Extension Overview](#extension-overview)
2. [Extension Architecture](#extension-architecture)
3. [Core Features](#core-features)
4. [Development Setup](#development-setup)
5. [Content Scripts](#content-scripts)
6. [Background Scripts](#background-scripts)
7. [Popup Interface](#popup-interface)
8. [API Integration](#api-integration)
9. [Testing and Debugging](#testing-and-debugging)
10. [Deployment](#deployment)

## 🔧 Extension Overview

The Circle CV Chrome Extension enhances the job application process by providing seamless integration between job boards and the Circle CV platform.

### Key Features
- **Job Data Extraction**: Automatically extract job information from job boards
- **CV Optimization**: Optimize CVs for specific job requirements
- **Quick Apply**: Streamlined application process
- **Job Tracking**: Track applications directly from job boards
- **ATS Analysis**: Real-time ATS compatibility analysis

### Supported Job Boards
- LinkedIn Jobs
- Indeed
- Glassdoor
- AngelList
- Company career pages
- Generic job posting sites

## 🏗️ Extension Architecture

### Manifest Structure
```json
{
  "manifest_version": 3,
  "name": "Circle CV Extension",
  "version": "2.0.0",
  "description": "Enhance your job application process with Circle CV",
  "permissions": [
    "activeTab",
    "storage",
    "tabs",
    "scripting"
  ],
  "host_permissions": [
    "https://*.linkedin.com/*",
    "https://*.indeed.com/*",
    "https://*.glassdoor.com/*",
    "https://*.angel.co/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "Circle CV"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### File Structure
```
chrome-extension/
├── manifest.json           # Extension manifest
├── background.js           # Background service worker
├── content.js              # Content script
├── content.css             # Content script styles
├── popup.html              # Popup interface
├── popup.js                # Popup functionality
├── popup.css               # Popup styles
├── icons/                  # Extension icons
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md               # Extension documentation
```

## 🎯 Core Features

### Job Data Extraction
The extension automatically detects and extracts job information from various job boards.

#### LinkedIn Jobs Integration
```javascript
// LinkedIn job data extraction
function extractLinkedInJobData() {
  const jobData = {
    title: document.querySelector('.job-details-jobs-unified-top-card__job-title')?.textContent?.trim(),
    company: document.querySelector('.job-details-jobs-unified-top-card__company-name')?.textContent?.trim(),
    location: document.querySelector('.job-details-jobs-unified-top-card__bullet')?.textContent?.trim(),
    description: document.querySelector('.jobs-description-content__text')?.textContent?.trim(),
    url: window.location.href,
    source: 'linkedin'
  };
  
  return jobData;
}
```

#### Indeed Jobs Integration
```javascript
// Indeed job data extraction
function extractIndeedJobData() {
  const jobData = {
    title: document.querySelector('[data-testid="job-title"]')?.textContent?.trim(),
    company: document.querySelector('[data-testid="company-name"]')?.textContent?.trim(),
    location: document.querySelector('[data-testid="job-location"]')?.textContent?.trim(),
    description: document.querySelector('#jobDescriptionText')?.textContent?.trim(),
    url: window.location.href,
    source: 'indeed'
  };
  
  return jobData;
}
```

### CV Optimization
The extension provides real-time CV optimization based on job requirements.

#### ATS Analysis
```javascript
// ATS analysis integration
async function analyzeATS(cvData, jobData) {
  try {
    const response = await fetch('https://api.circlecv.com/ats/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        cvData,
        jobData
      })
    });
    
    const analysis = await response.json();
    return analysis;
  } catch (error) {
    console.error('ATS Analysis failed:', error);
    return null;
  }
}
```

#### Keyword Optimization
```javascript
// Keyword extraction and optimization
function extractKeywords(jobDescription) {
  const keywords = [];
  const commonSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'MongoDB',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'Agile', 'Scrum'
  ];
  
  commonSkills.forEach(skill => {
    if (jobDescription.toLowerCase().includes(skill.toLowerCase())) {
      keywords.push(skill);
    }
  });
  
  return keywords;
}
```

### Quick Apply Feature
Streamlined application process with one-click CV optimization.

#### Application Flow
```javascript
// Quick apply workflow
async function quickApply(jobData) {
  try {
    // 1. Extract job data
    const jobInfo = extractJobData();
    
    // 2. Get user's CVs
    const cvs = await getUserCVs();
    
    // 3. Analyze ATS compatibility
    const analysis = await analyzeATS(cvs[0], jobInfo);
    
    // 4. Optimize CV if needed
    if (analysis.score < 70) {
      const optimizedCV = await optimizeCV(cvs[0], jobInfo);
      await saveCV(optimizedCV);
    }
    
    // 5. Open application page
    openApplicationPage(jobInfo.url);
    
  } catch (error) {
    console.error('Quick apply failed:', error);
    showError('Failed to process application');
  }
}
```

## 🛠️ Development Setup

### Prerequisites
- Chrome browser with developer mode enabled
- Node.js and npm
- Circle CV API access

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd Circle_CV_app/chrome-extension

# Install dependencies
npm install

# Build the extension
npm run build
```

### Development Workflow
```bash
# Watch for changes
npm run watch

# Test the extension
npm run test

# Package for distribution
npm run package
```

## 📜 Content Scripts

### Content Script Architecture
```javascript
// content.js - Main content script
class CircleCVContentScript {
  constructor() {
    this.isJobPage = this.detectJobPage();
    this.jobData = null;
    this.init();
  }
  
  init() {
    if (this.isJobPage) {
      this.injectJobOverlay();
      this.extractJobData();
      this.setupEventListeners();
    }
  }
  
  detectJobPage() {
    const url = window.location.href;
    return url.includes('/jobs/') || 
           url.includes('/job/') || 
           url.includes('/careers/');
  }
  
  injectJobOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'circle-cv-overlay';
    overlay.innerHTML = this.getOverlayHTML();
    document.body.appendChild(overlay);
  }
  
  getOverlayHTML() {
    return `
      <div class="circle-cv-overlay">
        <div class="circle-cv-button" id="circle-cv-analyze">
          <span class="icon">📊</span>
          <span class="text">Analyze with Circle CV</span>
        </div>
        <div class="circle-cv-button" id="circle-cv-optimize">
          <span class="icon">⚡</span>
          <span class="text">Optimize CV</span>
        </div>
        <div class="circle-cv-button" id="circle-cv-apply">
          <span class="icon">🚀</span>
          <span class="text">Quick Apply</span>
        </div>
      </div>
    `;
  }
}

// Initialize content script
new CircleCVContentScript();
```

### Job Data Extraction
```javascript
// Job data extraction methods
class JobDataExtractor {
  static extractLinkedInJob() {
    return {
      title: this.getTextContent('.job-details-jobs-unified-top-card__job-title'),
      company: this.getTextContent('.job-details-jobs-unified-top-card__company-name'),
      location: this.getTextContent('.job-details-jobs-unified-top-card__bullet'),
      description: this.getTextContent('.jobs-description-content__text'),
      url: window.location.href,
      source: 'linkedin'
    };
  }
  
  static extractIndeedJob() {
    return {
      title: this.getTextContent('[data-testid="job-title"]'),
      company: this.getTextContent('[data-testid="company-name"]'),
      location: this.getTextContent('[data-testid="job-location"]'),
      description: this.getTextContent('#jobDescriptionText'),
      url: window.location.href,
      source: 'indeed'
    };
  }
  
  static getTextContent(selector) {
    const element = document.querySelector(selector);
    return element ? element.textContent.trim() : '';
  }
}
```

## 🔄 Background Scripts

### Background Service Worker
```javascript
// background.js - Background service worker
class CircleCVBackground {
  constructor() {
    this.setupEventListeners();
    this.initializeStorage();
  }
  
  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.handleInstall();
      }
    });
    
    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.isJobPage(tab.url)) {
        this.injectContentScript(tabId);
      }
    });
    
    // Handle messages from content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open
    });
  }
  
  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'extractJobData':
        const jobData = await this.extractJobData(request.url);
        sendResponse({ success: true, data: jobData });
        break;
        
      case 'analyzeATS':
        const analysis = await this.analyzeATS(request.cvData, request.jobData);
        sendResponse({ success: true, data: analysis });
        break;
        
      case 'saveJob':
        const saved = await this.saveJob(request.jobData);
        sendResponse({ success: true, data: saved });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  }
  
  async extractJobData(url) {
    try {
      const response = await fetch(`https://api.circlecv.com/jobs/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify({ url })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Job data extraction failed:', error);
      return null;
    }
  }
}

// Initialize background script
new CircleCVBackground();
```

## 🎨 Popup Interface

### Popup HTML Structure
```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Circle CV</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <header class="popup-header">
      <img src="icons/icon-48.png" alt="Circle CV" class="logo">
      <h1>Circle CV</h1>
    </header>
    
    <main class="popup-main">
      <div class="job-info" id="job-info">
        <h3>Current Job</h3>
        <div class="job-details" id="job-details">
          <!-- Job details will be populated here -->
        </div>
      </div>
      
      <div class="actions">
        <button id="analyze-btn" class="action-btn">
          <span class="icon">📊</span>
          Analyze ATS
        </button>
        <button id="optimize-btn" class="action-btn">
          <span class="icon">⚡</span>
          Optimize CV
        </button>
        <button id="apply-btn" class="action-btn primary">
          <span class="icon">🚀</span>
          Quick Apply
        </button>
      </div>
      
      <div class="status" id="status">
        <!-- Status messages will be shown here -->
      </div>
    </main>
    
    <footer class="popup-footer">
      <a href="https://circlecv.com/dashboard" target="_blank">Open Dashboard</a>
    </footer>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### Popup JavaScript
```javascript
// popup.js - Popup functionality
class CircleCVPopup {
  constructor() {
    this.currentTab = null;
    this.jobData = null;
    this.init();
  }
  
  async init() {
    await this.getCurrentTab();
    await this.loadJobData();
    this.setupEventListeners();
    this.updateUI();
  }
  
  async getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }
  
  async loadJobData() {
    if (this.isJobPage(this.currentTab.url)) {
      try {
        const response = await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'extractJobData'
        });
        
        if (response.success) {
          this.jobData = response.data;
        }
      } catch (error) {
        console.error('Failed to load job data:', error);
      }
    }
  }
  
  setupEventListeners() {
    document.getElementById('analyze-btn').addEventListener('click', () => {
      this.analyzeATS();
    });
    
    document.getElementById('optimize-btn').addEventListener('click', () => {
      this.optimizeCV();
    });
    
    document.getElementById('apply-btn').addEventListener('click', () => {
      this.quickApply();
    });
  }
  
  async analyzeATS() {
    if (!this.jobData) {
      this.showStatus('No job data available', 'error');
      return;
    }
    
    this.showStatus('Analyzing ATS compatibility...', 'loading');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeATS',
        jobData: this.jobData
      });
      
      if (response.success) {
        this.showATSResults(response.data);
      } else {
        this.showStatus('Analysis failed', 'error');
      }
    } catch (error) {
      console.error('ATS analysis failed:', error);
      this.showStatus('Analysis failed', 'error');
    }
  }
  
  showATSResults(analysis) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = `
      <div class="ats-results">
        <h4>ATS Analysis Results</h4>
        <div class="score">Score: ${analysis.score}%</div>
        <div class="recommendations">
          ${analysis.recommendations.map(rec => `<div class="rec">${rec}</div>`).join('')}
        </div>
      </div>
    `;
  }
  
  updateUI() {
    const jobDetailsEl = document.getElementById('job-details');
    
    if (this.jobData) {
      jobDetailsEl.innerHTML = `
        <div class="job-title">${this.jobData.title}</div>
        <div class="job-company">${this.jobData.company}</div>
        <div class="job-location">${this.jobData.location}</div>
      `;
    } else {
      jobDetailsEl.innerHTML = '<div class="no-job">No job detected on this page</div>';
    }
  }
}

// Initialize popup
new CircleCVPopup();
```

## 🔌 API Integration

### API Service
```javascript
// API service for extension
class CircleCVAPI {
  constructor() {
    this.baseURL = 'https://api.circlecv.com';
    this.authToken = null;
  }
  
  async getAuthToken() {
    if (!this.authToken) {
      const result = await chrome.storage.local.get(['authToken']);
      this.authToken = result.authToken;
    }
    return this.authToken;
  }
  
  async request(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return await response.json();
  }
  
  async analyzeATS(cvData, jobData) {
    return await this.request('/ats/analyze', {
      method: 'POST',
      body: JSON.stringify({ cvData, jobData })
    });
  }
  
  async optimizeCV(cvData, jobData) {
    return await this.request('/ats/optimize', {
      method: 'POST',
      body: JSON.stringify({ cvData, jobData })
    });
  }
  
  async saveJob(jobData) {
    return await this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  }
}
```

## 🧪 Testing and Debugging

### Testing Framework
```javascript
// Test suite for extension
class ExtensionTests {
  static async testJobDataExtraction() {
    const testCases = [
      {
        url: 'https://linkedin.com/jobs/view/123456',
        expected: {
          source: 'linkedin',
          hasTitle: true,
          hasCompany: true
        }
      },
      {
        url: 'https://indeed.com/viewjob?jk=123456',
        expected: {
          source: 'indeed',
          hasTitle: true,
          hasCompany: true
        }
      }
    ];
    
    for (const testCase of testCases) {
      const result = await this.extractJobData(testCase.url);
      console.assert(result.source === testCase.expected.source);
      console.assert(!!result.title === testCase.expected.hasTitle);
      console.assert(!!result.company === testCase.expected.hasCompany);
    }
  }
  
  static async testATSAnalysis() {
    const mockCVData = { /* mock CV data */ };
    const mockJobData = { /* mock job data */ };
    
    const analysis = await this.analyzeATS(mockCVData, mockJobData);
    console.assert(analysis.score >= 0 && analysis.score <= 100);
    console.assert(Array.isArray(analysis.recommendations));
  }
}

// Run tests
ExtensionTests.testJobDataExtraction();
ExtensionTests.testATSAnalysis();
```

### Debugging Tools
```javascript
// Debug utilities
class ExtensionDebugger {
  static log(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Circle CV Extension] ${message}`, data);
    }
  }
  
  static error(message, error = null) {
    console.error(`[Circle CV Extension] ${message}`, error);
  }
  
  static async getStorageData() {
    const data = await chrome.storage.local.get();
    console.log('Extension storage:', data);
    return data;
  }
  
  static async clearStorage() {
    await chrome.storage.local.clear();
    console.log('Extension storage cleared');
  }
}
```

## 📦 Deployment

### Build Process
```bash
# Build the extension
npm run build

# Package for Chrome Web Store
npm run package

# Test the packaged extension
npm run test:packaged
```

### Chrome Web Store Submission
1. **Prepare Assets**
   - Extension icons (16x16, 32x32, 48x48, 128x128)
   - Screenshots for store listing
   - Description and metadata

2. **Upload Package**
   - Create developer account
   - Upload packaged extension
   - Fill out store listing details

3. **Review Process**
   - Wait for Google review
   - Address any feedback
   - Publish when approved

### Version Management
```json
{
  "version": "2.0.0",
  "version_name": "2.0.0",
  "minimum_chrome_version": "88",
  "update_url": "https://circlecv.com/extension/updates.xml"
}
```

## 🔒 Security Considerations

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Data Protection
```javascript
// Secure data handling
class SecureDataHandler {
  static encrypt(data) {
    // Implement encryption for sensitive data
    return btoa(JSON.stringify(data));
  }
  
  static decrypt(encryptedData) {
    // Implement decryption for sensitive data
    return JSON.parse(atob(encryptedData));
  }
  
  static sanitizeInput(input) {
    // Sanitize user input to prevent XSS
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
}
```

## 📊 Analytics and Monitoring

### Usage Tracking
```javascript
// Analytics integration
class ExtensionAnalytics {
  static trackEvent(eventName, properties = {}) {
    // Send analytics data to server
    fetch('https://api.circlecv.com/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        event: eventName,
        properties,
        timestamp: Date.now()
      })
    });
  }
  
  static trackJobExtraction(source) {
    this.trackEvent('job_extraction', { source });
  }
  
  static trackATSAnalysis(score) {
    this.trackEvent('ats_analysis', { score });
  }
}
```

---

This comprehensive Chrome extension guide provides everything needed to develop, test, and deploy the Circle CV Chrome extension, ensuring seamless integration with the main platform.
