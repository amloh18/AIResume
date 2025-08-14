# Data Wiring Implementation Summary

This document outlines the comprehensive data wiring implementation that connects each visible widget and component in the live app to the correct data sources, services, and update triggers.

## Service Layer Architecture

### 1. CVService (`src/lib/services/cvService.ts`)
**Purpose**: Handles all CV-related operations with comprehensive filtering and projection support.

**Key Methods**:
- `getCVs(filters)`: Get CVs with filtering, sorting, and projection options
- `getRecentCVs(userId, limit)`: Get recent CVs for dashboard
- `getCVCounts(userId)`: Get CV statistics for dashboard
- `createCV(cvData)`: Create new CV with activity logging
- `updateCV(cvId, partial)`: Update CV with partial data
- `linkJobToCV(cvId, jobId)`: Link CV to specific job for AI context

**Dashboard Integration**:
- **Continue Where You Left Off**: Uses `getCVs({ status: 'draft', sort: 'updatedAt', limit: 4 })`
- **CV Health Score**: Uses `getRecentCVs(userId, 1)` + `CVAnalyticsService.calculateHealthScore()`
- **My Vault**: Uses `getCVCounts(userId)` for CV and cover letter counts

### 2. JobService (`src/lib/services/jobService.ts`)
**Purpose**: Handles job tracking with status management and interview scheduling.

**Key Methods**:
- `getJobs(filters)`: Get jobs with comprehensive filtering
- `getJobCounts(userId, period)`: Get job statistics by period
- `getUpcomingInterviews(userId, within)`: Get upcoming interviews
- `updateJobStatus(jobId, status)`: Update job status with activity logging
- `addInterview(jobId, interview)`: Schedule interviews

**Dashboard Integration**:
- **Activity Trends**: Uses `getJobCounts(userId, period)` for KPI metrics
- **This Week's Schedule**: Uses `getUpcomingInterviews(userId, 'week')`
- **AI Job Whisperer**: Uses `getJobCounts(userId, 'week')` for metrics

### 3. ActivityService (`src/lib/services/activityService.ts`)
**Purpose**: Tracks user activity across all operations.

**Key Methods**:
- `getRecent(userId, filters)`: Get recent activities with filtering
- `logCVCreated(userId, cvId, title)`: Log CV creation
- `logJobStatusChange(userId, jobId, title, company, oldStatus, newStatus)`: Log job updates
- `getDashboardActivity(userId, limit)`: Get dashboard-specific activities

**Dashboard Integration**:
- **Recent Activity**: Uses `getDashboardActivity(userId, 10)` for activity feed

### 4. CVAnalyticsService (`src/lib/services/cvAnalyticsService.ts`)
**Purpose**: Handles CV analytics, health scoring, and ATS compliance.

**Key Methods**:
- `calculateHealthScore(cvId)`: Calculate CV health score
- `getKeywordsAnalysis(cvId, jobId?)`: Get keyword strengths/gaps
- `getRealTimeATSScore(cvId, jobId?)`: Get real-time ATS scoring
- `getViewsTotal(userId)`: Get total CV views

**Dashboard Integration**:
- **CV Health Score**: Uses `calculateHealthScore(cvId)` for health metrics
- **AI Job Whisperer**: Uses `getKeywordsAnalysis(cvId)` for strengths/gaps

## API Endpoints

### 1. CVs API (`src/app/api/cvs/route.ts`)
**Enhanced Features**:
- Comprehensive filtering: `type`, `status`, `sort`, `limit`, `projection`
- Support for CV vs Cover Letter distinction
- Activity logging on creation
- Job linking support

**Query Parameters**:
- `userId`: Required user ID
- `type`: 'cv' or 'cover' for CV vs Cover Letter
- `status`: 'draft', 'published', 'archived'
- `sort`: 'updatedAt', 'createdAt', 'title'
- `projection`: 'list' (minimal fields) or 'full'

### 2. Jobs API (`src/app/api/jobs/route.ts`)
**Enhanced Features**:
- Period-based filtering: 'day', 'week', 'month', 'all'
- Interview scheduling and filtering
- Status-based counts and deltas
- Activity logging on status changes

**Query Parameters**:
- `userId`: Required user ID
- `status`: Job status filter
- `period`: Time period for filtering
- `hasInterviewWithin`: 'week' or 'month' for interview filtering
- `sort`: Sorting options

### 3. Activity API (`src/app/api/activity/route.ts`)
**Features**:
- Activity logging and retrieval
- Type-based filtering
- Date-based filtering
- Limit support for pagination

## Dashboard Data Hook

### useDashboardData (`src/lib/hooks/useDashboardData.ts`)
**Purpose**: Centralized data management for dashboard widgets.

**Data Structure**:
```typescript
interface DashboardData {
  user: { name: string; email: string; greeting: string };
  drafts: Draft[];
  trends: { period: string; kpis: KPIMetrics };
  interviews: Interview[];
  activities: Activity[];
  cvHealthScore: number;
  aiData: { jobTips: Tip[]; goal: string; metrics: Metrics; strengths: string[]; gaps: string[] };
  vaultCounts: { cvs: number; coverLetters: number; jobDescriptions: number; notes: number };
  loading: { drafts: boolean; trends: boolean; interviews: boolean; activities: boolean; aiData: boolean };
}
```

**Widget Data Mapping**:

#### Header and Greeting
- **Data Source**: Session context + local time
- **Service**: None (client-side calculation)
- **Update Trigger**: Page load

#### Continue Where You Left Off
- **Data Source**: `CVService.getCVs({ status: 'draft', sort: 'updatedAt', limit: 4 })`
- **Service**: CVService
- **Update Trigger**: CV creation/update, page focus

#### Activity Trends
- **Data Source**: `JobService.getJobCounts(userId, period)` + `CVService.getCVCounts(userId)`
- **Service**: JobService, CVService
- **Update Trigger**: Period change, job/CV creation

#### This Week's Schedule
- **Data Source**: `JobService.getUpcomingInterviews(userId, 'week')`
- **Service**: JobService
- **Update Trigger**: Interview scheduling, job status changes

#### Recent Activity
- **Data Source**: `ActivityService.getDashboardActivity(userId, 10)`
- **Service**: ActivityService
- **Update Trigger**: Any user action, page focus

#### CV Health Score
- **Data Source**: `CVAnalyticsService.calculateHealthScore(latestCV.id)`
- **Service**: CVAnalyticsService
- **Update Trigger**: CV updates, periodic refresh

#### AI Job Whisperer
- **Data Source**: Multiple services for metrics and analysis
- **Service**: CVService, JobService, CVAnalyticsService
- **Update Trigger**: Data changes, job selection

#### My Vault
- **Data Source**: `CVService.getCVCounts(userId)` + `JobService.getJobCounts(userId, 'all')`
- **Service**: CVService, JobService
- **Update Trigger**: Document creation/deletion

## Update Triggers and Caching

### Page Load Triggers
1. **Parallel Data Loading**: All dashboard data loads in parallel
2. **Skeleton States**: Loading states for each widget
3. **Error Handling**: Graceful fallbacks for failed requests

### Mutation Triggers
1. **Optimistic Updates**: Immediate UI updates followed by server confirmation
2. **Activity Logging**: All mutations log activities automatically
3. **Cache Invalidation**: Relevant data refreshes after mutations

### Focus Triggers
1. **Route Focus**: Data refreshes when returning to dashboard
2. **Period Changes**: Trends data refreshes on period selection
3. **Background Updates**: Non-critical data updates in background

## Performance Optimizations

### Caching Strategy
- **Session Caching**: Data cached in memory during session
- **Debounced Refreshes**: Prevents excessive API calls
- **Selective Updates**: Only affected widgets refresh

### Data Projection
- **List Projection**: Minimal fields for dashboard lists
- **Full Projection**: Complete data for detailed views
- **Count Queries**: Optimized count queries for statistics

### Background Processing
- **ATS Scoring**: Background calculation of CV health scores
- **Activity Logging**: Non-blocking activity logging
- **Periodic Updates**: Scheduled background data refreshes

## Error Handling

### Graceful Degradation
- **Fallback Values**: Default values when data unavailable
- **Retry Logic**: Automatic retry for failed requests
- **User Feedback**: Clear error messages and retry options

### Data Validation
- **Input Sanitization**: All user inputs sanitized
- **Type Safety**: TypeScript interfaces for all data structures
- **Schema Validation**: MongoDB schema validation

## Security Considerations

### Authentication
- **User Isolation**: All queries filtered by userId
- **Session Validation**: Authentication checks on all endpoints
- **Permission Checks**: Role-based access control

### Data Protection
- **Input Validation**: All inputs validated and sanitized
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: Output encoding and sanitization

## Future Enhancements

### Real-time Updates
- **WebSocket Integration**: Real-time dashboard updates
- **Push Notifications**: Interview reminders and updates
- **Live Collaboration**: Real-time CV editing

### Advanced Analytics
- **Predictive Analytics**: Job success predictions
- **Trend Analysis**: Historical performance trends
- **AI Insights**: Advanced AI-powered recommendations

### Performance Monitoring
- **Metrics Collection**: Performance metrics tracking
- **Error Monitoring**: Comprehensive error tracking
- **User Analytics**: User behavior analytics

This implementation ensures that each widget and component in the dashboard is properly connected to its data source, with appropriate caching, error handling, and update triggers for a smooth user experience.
