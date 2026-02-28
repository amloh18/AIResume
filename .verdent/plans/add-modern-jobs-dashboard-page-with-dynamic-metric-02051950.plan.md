# Jobs Dashboard Page Implementation Plan

## Objective
Create a new **Jobs** dashboard page (currently in beta) that displays job matching and application metrics with a modern, fully interactive UI. The page will be dark/light theme compatible, integrated into the dashboard sidebar below Analytics, and will use all available candidate and job data to derive dynamic metrics without hardcoded sections.

---

## Architecture Overview

```
Dashboard Navigation
├── Analytics (existing)
└── Jobs (NEW) ← Add here in sidebar
    ├── Metrics Grid (KPIs)
    ├── Interactive Filters & Sorting
    ├── Jobs Table/List View with Actions
    └── Detailed Job Card Modal
```

---

## Implementation Tasks

### Phase 1: Setup & Navigation

#### Task 1.1: Update Sidebar Navigation
**File:** `src/components/dashboard/OptimizedNavigation.tsx`

**Changes:**
- Add new menu item for "Jobs" dashboard page with Briefcase2 or Zap icon
- Route: `/dashboard/jobs`
- Position: Below Analytics, above Tracker
- Add beta badge/indicator
- Implement dark/light mode styling consistency

**Verification:**
- Sidebar renders new Jobs link
- Link navigates to `/dashboard/jobs`
- Icon/styling matches existing nav items

---

#### Task 1.2: Create Route & Layout
**Files to Create:**
- `src/app/dashboard/jobs/page.tsx` (Main page component)

**File to Modify:**
- `src/app/dashboard/layout.tsx` (if needed for nested routing)

**Changes:**
- Create page component that wraps new `JobsDashboard` component
- Ensure theme context is available
- Add suspense boundary for async data

**Verification:**
- `/dashboard/jobs` route is accessible
- Page renders without errors
- Theme context is properly consumed

---

### Phase 2: Data Models & API Endpoints

#### Task 2.1: Define Jobs Dashboard Types
**File to Create:** `src/types/jobs-dashboard.ts`

**Schema:**
```typescript
// Job listing with match score
type JobListing = {
  _id: string;
  title: string;
  company: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  salary_currency?: string;
  matchScore: number; // 0-100
  source: string; // "Google Jobs", "SerpApi", etc.
  atsType?: string; // "Greenhouse", "Lever", "Workable"
  url: string;
  postedDate: Date;
  appliedStatus?: 'pending' | 'applied' | 'rejected' | 'interview' | 'offer';
  userId: string;
};

// Aggregated metrics
type JobsMetrics = {
  totalJobsMatched: number;
  averageMatchScore: number;
  applicationSuccessRate: number; // %
  pendingApplications: number;
  appliedThisWeek: number;
  companiesCount: number;
  locationsCount: number;
  sourceDistribution: Record<string, number>;
  salaryStats: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
  matchDistribution: {
    excellent: number; // 80-100
    good: number; // 60-79
    moderate: number; // 40-59
    fair: number; // 20-39
    low: number; // 0-19
  };
  topCompanies: Array<{ company: string; count: number; avgMatch: number }>;
  topLocations: Array<{ location: string; count: number }>;
  trendData: Array<{ date: Date; applications: number; matches: number }>;
};

// Filter state
type JobsFilter = {
  searchText?: string;
  matchScoreMin?: number;
  matchScoreMax?: number;
  companies?: string[];
  locations?: string[];
  sources?: string[];
  salaryMin?: number;
  salaryMax?: number;
  atsTypes?: string[];
  appliedStatus?: string[];
  sortBy?: 'matchScore' | 'postedDate' | 'salary' | 'company';
  sortOrder?: 'asc' | 'desc';
};
```

**Verification:**
- Types compile without errors
- Used in subsequent API endpoints

---

#### Task 2.2: Create API Endpoint for Jobs Metrics
**File to Create:** `src/app/api/jobs/metrics/route.ts`

**Endpoint:** `GET /api/jobs/metrics`

**Logic:**
- Fetch all jobs for authenticated user
- Fetch all applications linked to those jobs
- Calculate aggregated metrics:
  - Total matched jobs
  - Average match score
  - Application success rate (applied vs interviews vs offers)
  - Pending applications count
  - Applications in last 7 days
  - Unique companies and locations
  - Distribution by source and ATS type
  - Salary statistics (min, max, avg, median)
  - Match distribution buckets (excellent/good/moderate/fair/low)
  - Top 5 companies by job count & average match
  - Top 5 locations by job count
  - Trend data: daily applications/matches (last 30 days)
- Return `JobsMetrics` object

**Response:**
```json
{
  "totalJobsMatched": 342,
  "averageMatchScore": 72.5,
  "applicationSuccessRate": 18.5,
  "pendingApplications": 24,
  "appliedThisWeek": 12,
  "companiesCount": 89,
  "locationsCount": 34,
  "sourceDistribution": { "Google Jobs": 180, "SerpApi": 162 },
  "salaryStats": { "min": 35000, "max": 120000, "average": 65000, "median": 62000 },
  "matchDistribution": { "excellent": 45, "good": 120, "moderate": 98, "fair": 56, "low": 23 },
  "topCompanies": [...],
  "topLocations": [...],
  "trendData": [...]
}
```

**Verification:**
- Endpoint returns 200 with valid metrics
- Metrics aggregate correctly from database
- Handles empty data gracefully

---

#### Task 2.3: Create API Endpoint for Jobs List
**File to Create:** `src/app/api/jobs/list/route.ts`

**Endpoint:** `GET /api/jobs/list?filters=...&page=1&limit=50`

**Query Parameters:**
- `filters` (JSON stringified `JobsFilter`)
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Logic:**
- Apply filters to job collection
- Sort by specified field
- Paginate results
- Include application status for each job

**Response:**
```json
{
  "jobs": [JobListing[], ...],
  "total": 342,
  "page": 1,
  "pageSize": 50,
  "hasMore": true
}
```

**Verification:**
- Filters work correctly
- Pagination works
- Sorting is applied
- Application status is accurate

---

### Phase 3: Component Structure

#### Task 3.1: Main JobsDashboard Component
**File to Create:** `src/components/dashboard/JobsDashboard.tsx`

**Structure:**
```typescript
export function JobsDashboard() {
  // State
  const [metrics, setMetrics] = useState<JobsMetrics | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [filters, setFilters] = useState<JobsFilter>({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  
  // Fetch metrics on mount
  useEffect(() => { fetchMetrics(); }, []);
  
  // Fetch jobs when filters/page changes
  useEffect(() => { fetchJobs(); }, [filters, page]);
  
  return (
    <div className="space-y-6 p-6">
      {/* Header with Beta Badge */}
      {/* Metrics Grid */}
      <MetricsGrid metrics={metrics} loading={loading} />
      
      {/* Charts Row */}
      <ChartsRow metrics={metrics} loading={loading} />
      
      {/* Filters & Controls */}
      <FiltersBar filters={filters} onChange={setFilters} metrics={metrics} />
      
      {/* Jobs Table/List */}
      <JobsTable 
        jobs={jobs} 
        loading={loading} 
        onJobSelect={setSelectedJob}
        page={page}
        onPageChange={setPage}
      />
      
      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
```

**Key Features:**
- Responsive layout (mobile-first)
- Suspense/skeleton loading states
- Dark/light theme integration
- Error boundaries

**Verification:**
- Component renders without errors
- Data flows correctly
- Theme switching works

---

#### Task 3.2: Metrics Grid Component
**File to Create:** `src/components/dashboard/JobsDashboard/MetricsGrid.tsx`

**Display KPIs:**
- Total Jobs Matched (with sparkline trend)
- Average Match Score (with radial progress)
- Application Success Rate (%)
- Pending Applications
- Applications This Week
- Companies Count
- Unique Locations
- Average Salary

**Design:**
- 4-column grid (responsive: 1 col mobile, 2 col tablet, 4 col desktop)
- Each card: number + label + trend indicator (up/down/stable)
- Color coding: green (good), yellow (warning), neutral (info)
- Dark mode: `bg-gray-800/30`, light mode: `bg-white/5`
- Rounded corners, subtle borders, smooth animations

**Verification:**
- All KPIs display correctly
- Calculations are accurate
- Responsive layout works on all screen sizes
- Dark/light mode styling is correct

---

#### Task 3.3: Charts Row Component
**File to Create:** `src/components/dashboard/JobsDashboard/ChartsRow.tsx`

**Charts:**
1. **Match Score Distribution** (Bar chart)
   - X: match buckets (0-20, 20-40, 40-60, 60-80, 80-100)
   - Y: job count
   - Color: gradient from red to green

2. **Source Breakdown** (Pie/Donut chart)
   - Show job distribution by source (Google Jobs, SerpApi, etc.)
   - Clickable for filtering

3. **Top Companies** (Horizontal bar chart)
   - Top 8 companies by job count
   - Colored bars with job count labels
   - Clickable for filtering

4. **Applications Trend** (Area chart)
   - Last 30 days
   - X: date
   - Y: applications count
   - Smooth curve with gradient fill

**Design:**
- Uses Recharts (existing library in project)
- Dynamic colors based on theme
- Responsive containers
- Custom tooltips

**Verification:**
- Charts render with correct data
- Responsive sizing works
- Theme colors apply correctly
- Clicking chart elements triggers filters

---

#### Task 3.4: Filters Bar Component
**File to Create:** `src/components/dashboard/JobsDashboard/FiltersBar.tsx`

**Filter Controls:**
- Search text input (title/company)
- Match score range slider (0-100)
- Multi-select: Companies (populated from metrics)
- Multi-select: Locations (populated from metrics)
- Multi-select: Sources (Google Jobs, SerpApi, etc.)
- Multi-select: ATS Types (Greenhouse, Lever, Workable, etc.)
- Salary range slider
- Multi-select: Application Status (pending, applied, rejected, interview, offer)
- Sort dropdown (matchScore, postedDate, salary, company)
- Sort order toggle (asc/desc)
- Reset filters button

**Design:**
- Collapsible/expandable on mobile
- Clean tag-based UI for multi-selects
- Responsive grid layout
- Dark mode: `bg-gray-800/20` containers
- Light mode: `bg-white/5` containers

**Verification:**
- All filters apply correctly
- Multi-selects populate from data
- Reset clears all filters
- Responsive layout works

---

#### Task 3.5: Jobs Table Component
**File to Create:** `src/components/dashboard/JobsDashboard/JobsTable.tsx`

**Columns:**
- Checkbox (multi-select jobs)
- Job Title
- Company
- Location
- Match Score (with visual bar)
- Salary Range
- Source
- Posted Date (relative time: "2d ago")
- Application Status (badge)
- Actions (View, Apply, Remove)

**Features:**
- Sortable columns
- Pagination (25, 50, 100 items per page)
- Sticky header on scroll
- Hover row highlighting
- Mobile: collapsible/swipeable cards
- Desktop: traditional table

**Design:**
- Striped rows for readability
- Color-coded match score bars (red/yellow/green)
- Status badges with appropriate colors
- Dark mode: alternating `gray-800/30` and `gray-800/50`
- Light mode: alternating `white/5` and `white/10`

**Verification:**
- Columns display correctly
- Sorting works
- Pagination works
- Mobile responsive
- Theme styling correct

---

#### Task 3.6: Job Detail Modal Component
**File to Create:** `src/components/dashboard/JobsDashboard/JobDetailModal.tsx`

**Content:**
- Job title, company, location
- Full salary range
- Match score (large display with breakdown)
- Job description (if available)
- ATS type and link
- Posted date and source
- Application history (if any)
- Quick actions: Apply, Add to Tracker, Share, Save

**Design:**
- Slide-in modal from right (desktop) or bottom (mobile)
- Full height on mobile, centered on desktop
- Smooth animations
- Dark mode: `bg-gray-900/95` backdrop, `bg-gray-800` content
- Light mode: `bg-black/20` backdrop, `bg-white` content

**Verification:**
- Modal opens/closes correctly
- Content displays fully
- Responsive layout works
- Theme styling correct

---

#### Task 3.7: Utility Components
**Files to Create:**
- `src/components/dashboard/JobsDashboard/MatchScoreBar.tsx` - Inline progress bar with color coding
- `src/components/dashboard/JobsDashboard/StatusBadge.tsx` - Status indicator badge
- `src/components/dashboard/JobsDashboard/SalaryDisplay.tsx` - Formatted salary range
- `src/components/dashboard/JobsDashboard/JobCard.tsx` - Card layout for mobile view

**Verification:**
- Each component renders correctly
- Reusable across pages
- Styling consistent

---

### Phase 4: Styling & Theme Integration

#### Task 4.1: Add Custom CSS for Glass Morphism (if needed)
**File:** `src/styles/globals.css` or `src/styles/cv-editor-print-styles.css`

**Classes to add/verify:**
```css
.glass-widget-premium {
  @apply backdrop-blur-xl bg-white/5 dark:bg-gray-800/30 border border-white/10 dark:border-gray-700/50;
}

.glass-card-premium {
  @apply backdrop-blur-xl bg-white/5 dark:bg-gray-800/30 border border-white/10 dark:border-gray-700/50;
}

.metric-card {
  @apply p-4 rounded-lg transition-all duration-200 hover:shadow-lg;
}

/* Match score bar gradient */
.match-score-bar {
  @apply h-1 rounded-full overflow-hidden;
}

.match-score-bar.excellent {
  @apply bg-gradient-to-r from-green-400 to-emerald-500;
}

.match-score-bar.good {
  @apply bg-gradient-to-r from-green-400 to-lime-500;
}

.match-score-bar.moderate {
  @apply bg-gradient-to-r from-yellow-400 to-orange-500;
}

.match-score-bar.fair {
  @apply bg-gradient-to-r from-orange-400 to-red-500;
}

.match-score-bar.low {
  @apply bg-gradient-to-r from-red-400 to-red-600;
}
```

**Verification:**
- Classes apply correctly in components
- Dark/light transitions work
- Animations are smooth

---

#### Task 4.2: Verify Theme Context Integration
**File:** `src/lib/contexts/ThemeContext.tsx`

**Verification:**
- Components access theme via `useTheme()`
- Dark class is properly applied to html element
- Tailwind `dark:` prefix works throughout

---

### Phase 5: Integration & Polish

#### Task 5.1: Connect Data Services
**File to Modify:** `src/lib/services/jobService.ts` (if exists, or enhance)

**Ensure:**
- Job querying filters work with new filter format
- Match score calculation is correct
- Application status tracking is accurate
- Aggregation functions for metrics

**Verification:**
- Data service returns correct results
- Queries are optimized
- No N+1 query problems

---

#### Task 5.2: Add Loading & Error States
**Files to Create:**
- `src/components/dashboard/JobsDashboard/JobsLoadingState.tsx` - Skeleton loaders
- `src/components/dashboard/JobsDashboard/JobsErrorState.tsx` - Error message UI

**Features:**
- Skeleton screens for metrics grid and charts
- Graceful error messages with retry button
- Loading spinners for lazy-loaded content

**Verification:**
- Loading states appear while fetching
- Error states show with appropriate messages
- Retry functionality works

---

#### Task 5.3: Add Analytics Events (Optional)
**Enhancements:**
- Track job filter usage
- Track job views
- Track apply clicks
- Track chart/table interactions

**Verification:**
- Events fire correctly
- Analytics dashboard reflects usage

---

### Phase 6: Testing & Validation

#### Task 6.1: Unit Tests
**Files to Create:**
- `src/components/dashboard/JobsDashboard/__tests__/JobsDashboard.test.tsx`
- `src/components/dashboard/JobsDashboard/__tests__/MetricsGrid.test.tsx`
- `src/components/dashboard/JobsDashboard/__tests__/FiltersBar.test.tsx`
- `src/app/api/jobs/metrics/__tests__/route.test.ts`
- `src/app/api/jobs/list/__tests__/route.test.ts`

**Coverage:**
- Component rendering
- Filter logic
- API response format
- Edge cases (empty data, null values)

**Verification:**
- All tests pass
- Coverage > 80%

---

#### Task 6.2: Integration Tests
**Features to test:**
- End-to-end filter + sort + paginate flow
- Modal open/close
- Theme toggle while viewing page
- Responsive layout on various screen sizes

**Verification:**
- All flows work correctly
- No console errors or warnings

---

#### Task 6.3: Visual Regression Testing
**Tools:** Visual snapshot tests or manual review

**Verification:**
- Dark mode looks professional
- Light mode looks professional
- Mobile layout is clean
- Desktop layout is spacious

---

## Files Summary

### New Files to Create (26 total):
**Types:**
- `src/types/jobs-dashboard.ts`

**API:**
- `src/app/api/jobs/metrics/route.ts`
- `src/app/api/jobs/list/route.ts`

**Pages:**
- `src/app/dashboard/jobs/page.tsx`

**Components:**
- `src/components/dashboard/JobsDashboard.tsx` (main)
- `src/components/dashboard/JobsDashboard/MetricsGrid.tsx`
- `src/components/dashboard/JobsDashboard/ChartsRow.tsx`
- `src/components/dashboard/JobsDashboard/FiltersBar.tsx`
- `src/components/dashboard/JobsDashboard/JobsTable.tsx`
- `src/components/dashboard/JobsDashboard/JobDetailModal.tsx`
- `src/components/dashboard/JobsDashboard/MatchScoreBar.tsx`
- `src/components/dashboard/JobsDashboard/StatusBadge.tsx`
- `src/components/dashboard/JobsDashboard/SalaryDisplay.tsx`
- `src/components/dashboard/JobsDashboard/JobCard.tsx`
- `src/components/dashboard/JobsDashboard/JobsLoadingState.tsx`
- `src/components/dashboard/JobsDashboard/JobsErrorState.tsx`

**Tests:**
- `src/components/dashboard/JobsDashboard/__tests__/JobsDashboard.test.tsx`
- `src/components/dashboard/JobsDashboard/__tests__/MetricsGrid.test.tsx`
- `src/components/dashboard/JobsDashboard/__tests__/FiltersBar.test.tsx`
- `src/app/api/jobs/metrics/__tests__/route.test.ts`
- `src/app/api/jobs/list/__tests__/route.test.ts`

**Styles:**
- CSS additions to existing `src/styles/globals.css` or `src/styles/cv-editor-print-styles.css`

### Files to Modify (3 total):
- `src/components/dashboard/OptimizedNavigation.tsx` - Add Jobs menu item
- `src/lib/services/jobService.ts` - Enhance querying/aggregation (if needed)
- `src/styles/globals.css` or `src/styles/cv-editor-print-styles.css` - Add custom CSS

---

## Verification & Definition of Done

### Per-Component DoD:
1. ✅ Component renders without errors
2. ✅ Dark/light theme styling correct
3. ✅ Responsive on mobile/tablet/desktop
4. ✅ Accessibility (ARIA labels, keyboard navigation)
5. ✅ Performance (no unnecessary re-renders, optimized queries)
6. ✅ Unit tests pass (if applicable)

### End-to-End DoD:
1. ✅ `/dashboard/jobs` route accessible
2. ✅ Jobs sidebar item visible and clickable
3. ✅ Page loads metrics within 2 seconds
4. ✅ All filters work and update results
5. ✅ Sorting and pagination work
6. ✅ Modal opens/closes smoothly
7. ✅ Theme toggle works while on page
8. ✅ No console errors or warnings
9. ✅ All tests pass (unit + integration + visual)
10. ✅ Performance audit: Lighthouse score > 90

---

## Task Dependency Graph

```
1.1 (Sidebar Nav) ──┐
                     ├─→ 1.2 (Route/Page) ──┐
                                             ├─→ 3.1 (Main Component)
2.1 (Types) ─────────┤                       │
                     ├─→ 2.2 (Metrics API)  ─┤
                                             ├─→ 3.2 (Metrics Grid)
2.3 (Jobs List API)──┴─→ 3.5 (Jobs Table)───┤
                                             └─→ 3.3 (Charts), 3.4 (Filters)
3.1 (Main) ────→ 3.6 (Job Modal), 3.7 (Utils), 4.x (Styling)
All 3.x ────→ 5.x (Integration) ────→ 6.x (Testing)
```

---

## Tech Stack & Dependencies

- **React Hooks:** `useState`, `useEffect`, `useCallback`
- **Data Fetching:** Existing `fetch` or SWR/React Query pattern in project
- **UI Charts:** Recharts (already in use per Analytics component)
- **Styling:** Tailwind CSS with dark mode support
- **Theme:** Existing `ThemeContext` from project
- **API:** Next.js API routes with middleware for auth
- **Database:** Existing MongoDB connection (jobs, applications collections)

---

## Open Questions / Decisions Confirmed

✅ **Confirmed:**
- Interactive UI with filters, sorting, apply buttons
- Use all available candidate and job data for metrics
- Dark/light theme compatible
- Modern glass morphism design
- No hardcoded sections
- Add to sidebar below Analytics

