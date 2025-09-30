# CV Journey KPIs Documentation

This document provides comprehensive information about the CV Journey KPIs implemented in the admin dashboard, based on the robust CV Journey management system architecture.

## Overview

The CV Journey KPIs provide a 360-degree view of your platform's performance, user behavior, and overall impact on users' job-seeking journeys. These metrics are organized into three main categories:

1. **User Engagement & Adoption KPIs**
2. **Application Funnel & Effectiveness KPIs** 
3. **Content & System Health KPIs**

## 1. User Engagement & Adoption KPIs

### 1.1 Core Activity Metrics

#### **CV Journeys Initiated**
- **What it Measures**: The number of new `CV Journey` records created over a period (daily, weekly, monthly)
- **How to Calculate**: Count of new `CV Journey` records created in the given timeframe
- **Why it's Important**: This is your primary top-of-the-funnel metric. It shows how many job applications users are starting to manage through your system. A steady increase indicates healthy platform adoption
- **API Field**: `userEngagement.cvJourneysInitiated`

#### **CV Journey Completion Rate**
- **What it Measures**: The percentage of initiated `CV Journeys` that have both a tailored `CV` and a `Cover Letter` linked
- **How to Calculate**: 
  ```
  (Number of Journeys with both CV and Cover Letter links / Total Number of CV Journeys Initiated) × 100
  ```
- **Why it's Important**: This crucial metric reveals if users are completing the main workflow. A low rate might indicate friction in the `Studio` editor or that users are abandoning the process
- **API Field**: `userEngagement.cvJourneyCompletionRate`
- **Target**: >70% (Green), 50-70% (Yellow), <50% (Red)

#### **Average Documents per Journey**
- **What it Measures**: The average number of tailored documents (`CVs`, `Cover Letters`) created per user
- **How to Calculate**: 
  ```
  (Total number of tailored CVs + Total Cover Letters) / Total number of unique users
  ```
- **Why it's Important**: It shows the depth of engagement. A high number suggests users are tailoring applications for many jobs, which is the intended use of the platform
- **API Field**: `userEngagement.averageDocumentsPerJourney`

### 1.2 Feature Adoption Metrics

#### **Master CV Onboarding Completion**
- **What it Measures**: The percentage of signed-up users who have successfully created their `Master CV`
- **How to Calculate**: 
  ```
  (Number of users with a created Master CV / Total number of registered users) × 100
  ```
- **Why it's Important**: The `Master CV` is foundational. A low completion rate here is a major red flag, indicating a problem in your onboarding flow
- **API Field**: `userEngagement.masterCVOnboardingCompletion`
- **Target**: >80% (Green), 60-80% (Yellow), <60% (Red)

#### **Studio Usage Frequency**
- **What it Measures**: How often the document editor (`Studio`) is used
- **How to Calculate**: Track the number of "save" events for `CVs` and `Cover Letters` per day/week
- **Why it's Important**: This indicates whether users are actively creating and refining their documents within your ecosystem
- **API Field**: `userEngagement.studioUsageFrequency`

#### **User Retention Rate**
- **What it Measures**: The percentage of users who created journeys in both the current and previous periods
- **How to Calculate**: 
  ```
  (Users active in both periods / Users active in previous period) × 100
  ```
- **Why it's Important**: Measures user stickiness and platform value
- **API Field**: `userEngagement.userRetentionRate`
- **Target**: >60% (Green), 40-60% (Yellow), <40% (Red)

## 2. Application Funnel & Effectiveness KPIs

### **Application Status Funnel**
- **What it Measures**: The distribution of jobs across different stages of the application process
- **How to Calculate**: A visualization showing the count of `Jobs` with statuses like:
  - Tracked (Journey initiated)
  - Applied
  - Interviewing
  - Offer Received
  - Rejected
- **Why it's Important**: This is the most direct indicator of user success. It helps you understand how far users are getting in their application processes and demonstrates the value of your tool
- **API Field**: `applicationFunnel.applicationStatusFunnel`

### **Tracked-to-Applied Conversion Rate**
- **What it Measures**: The percentage of tracked jobs for which users actually mark as "Applied"
- **How to Calculate**: 
  ```
  (Number of Jobs with status 'Applied' / Total number of Jobs tracked (CV Journeys initiated)) × 100
  ```
- **Why it's Important**: This measures the conversion from interest to action. A low rate might mean users track many jobs but don't follow through with creating documents and applying
- **API Field**: `applicationFunnel.trackedToAppliedConversionRate`
- **Target**: >40% (Green), 20-40% (Yellow), <20% (Red)

### **Average ATS Score**
- **What it Measures**: The average calculated ATS score across all tailored `CVs`
- **How to Calculate**: Average of the `ATS-Score` field for all `CV Journeys` where a score exists
- **Why it's Important**: It quantifies the quality and optimization level of the CVs being produced on your platform. You can track if this average improves over time as you enhance the `Studio`'s features
- **API Field**: `applicationFunnel.averageATSScore`

## 3. Content & System Health KPIs

### **Orphaned or Stale Journeys**
- **What it Measures**: The number of `CV Journeys` that were initiated but have not had a `CV` or `Cover Letter` linked after a certain period (14+ days)
- **How to Calculate**: Count of `CV Journeys` where `created_date` is older than 14 days AND `cv_link` is empty
- **Why it's Important**: This helps identify user drop-off points. A high number of stale journeys could signal that users find the document creation step too difficult or time-consuming
- **API Field**: `contentHealth.orphanedJourneys`
- **Target**: <10% of total journeys (Green), 10-20% (Yellow), >20% (Red)

### **Asset Growth Rate**
- **What it Measures**: The rate at which new documents are being created in the system
- **How to Calculate**: Line charts showing the cumulative count of `CVs` and `Cover Letters` created over time
- **Why it's Important**: This provides a high-level view of database growth and overall platform activity
- **API Field**: `contentHealth.assetGrowthData`

### **Master CV to Tailored CV Ratio**
- **What it Measures**: The average number of tailored `CVs` that stem from a single `Master CV`
- **How to Calculate**: 
  ```
  Total number of tailored CVs created / Total number of Master CVs created
  ```
- **Why it's Important**: A ratio significantly greater than 1 is a strong signal that users understand and are using the core value proposition: creating multiple, tailored versions from a single master source
- **API Field**: `contentHealth.masterCVToTailoredCVRatio`
- **Target**: >3:1 (Green), 2-3:1 (Yellow), <2:1 (Red)

### **Average Completion Time**
- **What it Measures**: The average time it takes for users to complete a CV Journey (from initiation to completion)
- **How to Calculate**: Average of completion time for all completed journeys
- **Why it's Important**: Helps identify friction points and user experience issues
- **API Field**: `contentHealth.averageCompletionTime`
- **Target**: <7 days (Green), 7-14 days (Yellow), >14 days (Red)

## API Usage

### Endpoint
```
GET /api/admin/cv-journey-kpis?range={timeRange}
```

### Parameters
- `range`: Time range for the metrics
  - `today`: Today only
  - `7d`: Last 7 days
  - `30d`: Last 30 days (default)
  - `90d`: Last 90 days
  - `1y`: Last year

### Response Structure
```json
{
  "success": true,
  "data": {
    "timeRange": "30d",
    "period": {
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-01-31T23:59:59.999Z"
    },
    "userEngagement": {
      "cvJourneysInitiated": 150,
      "cvJourneyCompletionRate": 75.5,
      "averageDocumentsPerJourney": 2.3,
      "masterCVOnboardingCompletion": 85.2,
      "studioUsageFrequency": 450,
      "userRetentionRate": 65.8
    },
    "applicationFunnel": {
      "applicationStatusFunnel": [
        { "_id": "applied", "count": 60 },
        { "_id": "interview", "count": 25 },
        { "_id": "offer", "count": 8 }
      ],
      "trackedToAppliedConversionRate": 40.0,
      "averageATSScore": 78.5,
      "atsScoreCount": 120,
      "totalTrackedJobs": 150,
      "appliedJobs": 60
    },
    "contentHealth": {
      "orphanedJourneys": 12,
      "assetGrowthData": {
        "cvs": [...],
        "coverLetters": [...]
      },
      "masterCVToTailoredCVRatio": 3.2,
      "journeyStatusDistribution": [...],
      "averageCompletionTime": 5.8
    },
    "summary": {
      "totalUsers": 500,
      "totalMasterCVs": 450,
      "totalTailoredCVs": 1200,
      "totalCoverLetters": 800,
      "totalJourneys": 150,
      "completedJourneys": 95
    }
  }
}
```

## Dashboard Access

The CV Journey KPIs are accessible through the admin dashboard:

1. Navigate to `/admin`
2. Click on "CV Journey KPIs" in the sidebar
3. Select your desired time range
4. View comprehensive metrics and charts

## Key Insights to Monitor

### Healthy Platform Indicators
- **High CV Journey Completion Rate** (>70%)
- **Strong Master CV Onboarding** (>80%)
- **Good Tracked-to-Applied Conversion** (>40%)
- **Low Orphaned Journeys** (<10%)
- **High Master CV to Tailored CV Ratio** (>3:1)

### Warning Signs
- **Low completion rates** - indicates UX issues
- **High orphaned journeys** - suggests friction in document creation
- **Low retention rates** - users not finding value
- **Low conversion rates** - users not following through

## Implementation Notes

- All metrics are calculated in real-time from the database
- Data is cached for performance but refreshes automatically
- Color coding provides immediate visual feedback on metric health
- Charts are responsive and work on all device sizes
- Export functionality can be added for detailed analysis

This comprehensive KPI system provides the insights needed to optimize the CV Journey management platform and ensure users are successfully completing their job application workflows.
