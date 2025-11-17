#!/usr/bin/env ts-node

/**
 * Update Guide Script
 * 
 * This script analyzes the codebase and updates the guide.md file
 * with current function logic and working organized by sitemap structure.
 * 
 * Usage: npm run update-guide
 * Or: ts-node scripts/update-guide.ts
 */

import fs from 'fs';
import path from 'path';

const GUIDE_PATH = path.join(process.cwd(), 'public', '.guide', 'guide.md');
const SITEMAP_PATH = path.join(process.cwd(), 'src', 'app', 'sitemap.ts');

interface RouteInfo {
  url: string;
  priority: number;
  tier: string;
  description?: string;
}

function extractRoutesFromSitemap(): RouteInfo[] {
  try {
    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    const routes: RouteInfo[] = [];
    
    // Extract routes from sitemap.ts
    const urlMatches = sitemapContent.matchAll(/url:\s*`?\$\{baseUrl\}([^`}]+)`?/g);
    const priorityMatches = sitemapContent.matchAll(/priority:\s*([\d.]+)/g);
    
    const urls: string[] = [];
    const priorities: number[] = [];
    
    for (const match of urlMatches) {
      urls.push(match[1] || '/');
    }
    
    for (const match of priorityMatches) {
      priorities.push(parseFloat(match[1]));
    }
    
    // Map URLs to priorities and determine tiers
    urls.forEach((url, index) => {
      const priority = priorities[index] || 0.5;
      let tier = 'Tier 4';
      
      if (priority >= 1.0) tier = 'Tier 1';
      else if (priority >= 0.9) tier = 'Tier 2';
      else if (priority >= 0.8) tier = 'Tier 3';
      
      routes.push({
        url: url || '/',
        priority,
        tier,
      });
    });
    
    return routes;
  } catch (error) {
    console.error('Error reading sitemap:', error);
    return [];
  }
}

function getPageFiles(): string[] {
  const appDir = path.join(process.cwd(), 'src', 'app');
  const pageFiles: string[] = [];
  
  function walkDir(dir: string, basePath: string = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath, relativePath);
        } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
          pageFiles.push(relativePath);
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  walkDir(appDir);
  return pageFiles;
}

function generateGuideContent(): string {
  const routes = extractRoutesFromSitemap();
  const pageFiles = getPageFiles();
  const now = new Date().toISOString();
  
  let content = `# CVCircle.io - Application Guide

**Last Updated**: ${now}  
**Purpose**: Comprehensive documentation of application logic and functions organized by sitemap structure

---

## 📋 Table of Contents

1. [Tier 1: Main Landing Page](#tier-1-main-landing-page)
2. [Tier 2: Core Product Pages](#tier-2-core-product-pages)
3. [Tier 3: Conversion Pages](#tier-3-conversion-pages)
4. [Tier 4: Legal/Support Pages](#tier-4-legalsupport-pages)
5. [Protected Routes: Dashboard](#protected-routes-dashboard)
6. [Protected Routes: Studio](#protected-routes-studio)
7. [Core Functions & Services](#core-functions--services)

---

## Tier 1: Main Landing Page

### Route: \`/\` (Root)

**File**: \`src/app/page.tsx\`

**Purpose**: Main landing page for marketing and user acquisition

**Key Functions**:
- \`LandingPageContent()\`: Main component that renders all landing sections
- Handles logout cleanup via \`useEffect\` hook
- Renders structured data (JSON-LD) for SEO

**Components Used**:
- \`Hero\`: Main hero section with CTA
- \`HowItWorks\`: Step-by-step process explanation
- \`Features\`: Product features showcase
- \`ChromeExtension\`: Browser extension promotion
- \`PremiumTemplates\`: Template showcase
- \`Testimonials\`: User testimonials
- \`Pricing\`: Pricing plans with redirect to sign-up
- \`FAQ\`: Frequently asked questions
- \`Footer\`: Site footer
- \`CardNav\`: Navigation component

**Logic Flow**:
1. Component mounts and checks for logout parameters
2. Renders structured data for search engines
3. Displays all marketing sections in sequence
4. Handles plan selection redirects to sign-up page

---

## Tier 2: Core Product Pages

`;

  // Add routes from sitemap
  routes.forEach(route => {
    if (route.priority >= 0.9 && route.priority < 1.0) {
      const routeName = route.url === '/' ? 'Root' : route.url.replace(/\//g, '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      content += `### Route: \`${route.url}\`

**File**: Check \`src/app${route.url === '/' ? '' : route.url}/page.tsx\`

**Purpose**: ${route.description || 'Core product page'}

**Key Functions**:
- [To be documented - run code analysis]

---

`;
    }
  });

  content += `## Tier 3: Conversion Pages

### Route: \`/sign-up\`

**File**: \`src/app/sign-up/[[...sign-up]]/page.tsx\`

**Purpose**: User registration page

**Key Functions**:
- Handles user registration flow
- Email verification setup
- Plan selection integration

**Logic Flow**:
1. User enters registration details
2. Validates input
3. Creates user account
4. Sends verification email
5. Redirects to onboarding or dashboard

---

### Route: \`/sign-in\`

**File**: \`src/app/sign-in/page.tsx\`

**Purpose**: User authentication page

**Key Functions**:
- Handles user login
- Supports multiple auth methods (email, Google OAuth)
- Session management

**Logic Flow**:
1. User enters credentials
2. Validates authentication
3. Creates session
4. Redirects to dashboard or onboarding

---

## Tier 4: Legal/Support Pages

### Route: \`/privacy-policy\`

**File**: \`src/app/privacy-policy/page.tsx\`

**Purpose**: Privacy policy documentation

**Content**: Legal privacy policy content

---

### Route: \`/terms\`

**File**: \`src/app/terms/page.tsx\`

**Purpose**: Terms of service documentation

**Content**: Legal terms and conditions

---

### Route: \`/cookie-policy\`

**File**: \`src/app/cookie-policy/page.tsx\`

**Purpose**: Cookie policy documentation

**Content**: Cookie usage and consent information

---

## Protected Routes: Dashboard

### Route: \`/dashboard\`

**File**: \`src/app/dashboard/page.tsx\`

**Purpose**: Main dashboard with analytics

**Key Functions**:
- \`Dashboard\`: Main dashboard component
- \`Analytics\`: Analytics display (dynamically imported)

**Logic**:
- Loads user analytics data
- Displays metrics and insights
- Code-split for performance

---

### Route: \`/dashboard/canvas\`

**File**: \`src/app/dashboard/canvas/page.tsx\` → \`src/components/dashboard/Canvas.tsx\`

**Purpose**: Canvas view for managing CVs and cover letters

**Key Functions**:

#### \`loadCVs(userId?: string)\`
- **Purpose**: Loads all CVs for the authenticated user
- **Logic**:
  1. Gets user ID from unified auth
  2. Prevents re-fetching on tab switch using refs
  3. Calls \`UnifiedCVService.getCVs()\` with 'summary' projection
  4. Processes and enriches CV data
  5. Separates Master CVs from regular CVs
  6. Batch loads journeys for all CVs (performance optimization)
  7. Sets CVs and Master CVs state
- **Returns**: Promise<void>
- **Dependencies**: \`user\`, \`UnifiedCVService\`, \`CVJourneyLookupService\`

#### \`loadCoverLetters()\`
- **Purpose**: Loads all cover letters for the authenticated user
- **Logic**:
  1. Gets user ID from unified auth
  2. Calls \`/api/cover-letters?userId=\${userId}\` endpoint
  3. Enriches cover letter data with formatted dates
  4. Stores both formatted string and raw date for sorting
  5. Sets cover letters state
- **Returns**: Promise<void>
- **Dependencies**: \`user\`, \`authenticatedFetch\`, \`formatTimeAgo\`

#### \`loadJourneys()\`
- **Purpose**: Loads application journeys for the user
- **Logic**:
  1. Gets user ID from unified auth
  2. Calls \`/api/journeys?userId=\${userId}\` endpoint
  3. Sets journeys state
- **Returns**: Promise<void>
- **Dependencies**: \`user\`, \`authenticatedFetch\`

#### \`fetchAvailableJobs()\`
- **Purpose**: Loads available job applications
- **Logic**:
  1. Gets user ID from unified auth
  2. Calls \`/api/jobs?userId=\${userId}\` endpoint
  3. Sets available jobs state
- **Returns**: Promise<void>
- **Dependencies**: \`user\`, \`authenticatedFetch\`

#### Main Data Loading Flow
- **useEffect Hook**:
  1. Checks browser environment
  2. Gets user ID
  3. Prevents duplicate loading on tab switch
  4. Loads CVs first (sequential, most important)
  5. Loads cover letters, journeys, and jobs in parallel using \`Promise.allSettled\`
  6. Handles errors gracefully without blocking other loads

#### State Management
- \`cvs\`: Regular CVs array
- \`masterCVs\`: Master CVs array
- \`coverLetters\`: Cover letters array
- \`journeys\`: Application journeys array
- \`availableJobs\`: Available jobs array
- \`loading\`: Loading state
- \`hasLoadedCVsRef\`: Prevents duplicate CV loading
- \`lastUserIdRef\`: Tracks user ID changes

#### Filtering & Sorting
- \`filteredAndSortedCVs\`: Filters CVs by search query and sorts by selected criteria
- \`filteredAndSortedCoverLetters\`: Filters cover letters by search query and sorts by date/title/status

---

## Protected Routes: Studio

### Route: \`/studio\`

**File**: \`src/app/studio/page.tsx\`

**Purpose**: CV and cover letter editor

**Key Functions**:

#### \`StudioPageContent()\`
- **Purpose**: Main studio page component
- **Logic**:
  1. Gets user authentication status
  2. Parses URL parameters (journeyId, cvId, coverLetterId, type, mode)
  3. Determines document type (CV or cover letter)
  4. Validates authentication
  5. Renders \`CVStudio\` component with proper context
- **URL Parameters**:
  - \`journeyId\`: Primary journey ID for context
  - \`cvId\`: CV ID to edit
  - \`coverLetterId\`: Cover letter ID to edit
  - \`type\`: Legacy document type ('cv' or 'cover_letter')
  - \`documentType\`: New document type format
  - \`jobId\`: Job ID for context
  - \`mode\`: Edit mode ('cv-onboarding', 'ats-edit', 'cover-letter-edit', 'document-first')

**Components Used**:
- \`CVStudio\`: Main editor component
- \`RouteGuard\`: Authentication guard
- \`JobJourneyProvider\`: Journey context provider
- \`JourneyStatusBanner\`: Journey progress banner

**Logic Flow**:
1. Check authentication
2. Parse and validate URL parameters
3. Determine document type and ID
4. Load journey context if available
5. Render editor with proper context

---

## Core Functions & Services

### Authentication

#### \`useUnifiedAuth()\`
- **Location**: \`src/lib/hooks/useUnifiedAuth.ts\`
- **Purpose**: Unified authentication hook supporting multiple auth methods
- **Returns**: \`{ user, loading, isAuthenticated, ... }\`
- **Logic**: 
  - Checks NextAuth session
  - Checks Firebase auth
  - Provides unified user object

#### \`getUserIdForAPI(user)\`
- **Purpose**: Gets user ID in format suitable for API calls
- **Logic**: Extracts user ID from unified user object
- **Returns**: string | null

---

### CV Services

#### \`UnifiedCVService.getCVs(userId, filters?)\`
- **Location**: \`src/lib/services/unified-cv-service.ts\`
- **Purpose**: Fetches CVs from MongoDB
- **Parameters**:
  - \`userId\`: User ID
  - \`filters\`: Optional filters (status, isMaster, starred, projection)
- **Returns**: \`Promise<UnifiedCVDocument[]>\`
- **Logic**:
  1. Builds query parameters
  2. Calls \`/api/cvs\` endpoint
  3. Returns unified CV format
  4. Uses 'summary' projection for performance (excludes large thumbnails)

#### \`UnifiedCVService.getCV(cvId, userId?)\`
- **Purpose**: Fetches single CV by ID
- **Returns**: \`Promise<UnifiedCVDocument>\`
- **Logic**: Calls \`/api/cvs/\${cvId}\` endpoint

---

### Journey Services

#### \`CVJourneyLookupService.findJourneysByCVIds(cvIds, userId)\`
- **Location**: \`src/lib/services/cvJourneyLookupService.ts\`
- **Purpose**: Batch loads journeys for multiple CVs (performance optimization)
- **Returns**: \`Promise<Map<string, Journey>>\`
- **Logic**: 
  1. Takes array of CV IDs
  2. Queries database for all related journeys
  3. Returns map of CV ID to Journey
  4. Eliminates N+1 query problem

---

### Application Package Service

#### \`ApplicationPackageService.duplicateCV(options)\`
- **Location**: \`src/lib/services/applicationPackageService.ts\`
- **Purpose**: Duplicates a CV properly maintaining relationships
- **Parameters**:
  - \`sourceCvId\`: Source CV ID
  - \`userId\`: User ID
  - \`newTitle\`: Title for duplicated CV
- **Returns**: \`Promise<{ success, data: { cvId }, message }>\`
- **Logic**: Creates new CV copy without journey relationships

---

### API Utilities

#### \`authenticatedFetch(url, options?)\`
- **Location**: \`src/lib/utils/apiUtils.ts\`
- **Purpose**: Makes authenticated API requests
- **Logic**: 
  1. Includes authentication headers
  2. Handles errors
  3. Returns fetch response

---

### Data Loading Pattern

**Canvas Component Data Loading Strategy**:

1. **Sequential Loading**: CVs loaded first (most important)
2. **Parallel Loading**: Cover letters, journeys, and jobs loaded in parallel
3. **Error Isolation**: Uses \`Promise.allSettled\` to prevent one failure from blocking others
4. **Duplicate Prevention**: Uses refs to prevent re-fetching on tab switches
5. **User ID Tracking**: Tracks user ID changes to reset load state

**Performance Optimizations**:
- Uses 'summary' projection for CVs (excludes large Base64 thumbnails)
- Batch loads journeys instead of individual queries
- Prevents duplicate API calls on tab switches
- Code-splits heavy components

---

## Database Connection

### MongoDB Connection
- **Location**: \`src/lib/database/connection-manager.ts\`
- **Purpose**: Manages MongoDB connection
- **Logic**:
  - Uses connection pooling
  - Handles reconnection
  - Provides mongoose connection

### Models
- **CV Model**: \`src/models/CV.ts\`
- **CoverLetter Model**: \`src/models/CoverLetter.ts\`
- **JobApplication Model**: \`src/models/JobApplication.ts\`
- **ApplicationJourney Model**: \`src/models/ApplicationJourney.ts\`

---

## State Management

### React Context Providers
- \`AuthContext\`: Authentication state
- \`DashboardDataContext\`: Dashboard data
- \`JobJourneyContext\`: Journey state
- \`MobileSidebarContext\`: Mobile navigation
- \`NotificationContext\`: Notifications
- \`PaymentModalContext\`: Payment modals

### Hooks
- \`useUnifiedAuth()\`: Authentication
- \`useUserData()\`: User data
- \`useCreateCV()\`: CV creation
- \`useJobJourney()\`: Journey management
- \`useMobileSidebar()\`: Mobile navigation

---

## Error Handling

### Pattern
- Try-catch blocks in all async functions
- Error logging with context
- Graceful degradation (continues with other loads if one fails)
- User-friendly error messages

### Error Recovery
- Keeps existing data on error (doesn't clear state)
- Retries on network errors
- Fallback to cached data when available

---

## Notes

- All API calls use authenticated fetch
- User ID resolution handled by unified auth system
- MongoDB connection managed centrally
- Performance optimized with code splitting and lazy loading
- Error handling prevents cascading failures

---

*This guide is auto-generated. Run "update guide" command to regenerate.*
`;

  return content;
}

function updateGuide() {
  try {
    // Ensure directory exists
    const guideDir = path.dirname(GUIDE_PATH);
    if (!fs.existsSync(guideDir)) {
      fs.mkdirSync(guideDir, { recursive: true });
    }
    
    // Generate and write guide
    const content = generateGuideContent();
    fs.writeFileSync(GUIDE_PATH, content, 'utf-8');
    
    console.log('✅ Guide updated successfully!');
    console.log(`📄 Location: ${GUIDE_PATH}`);
  } catch (error) {
    console.error('❌ Error updating guide:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateGuide();
}

export { updateGuide, generateGuideContent };










