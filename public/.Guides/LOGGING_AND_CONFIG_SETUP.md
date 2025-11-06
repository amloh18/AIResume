# Logging and Configuration System Setup

## Overview
This document describes the logging and configuration system that has been implemented for the admin panel.

## Configuration System

### Files Created
- `src/lib/config/adminConfig.ts` - Centralized admin configuration
- `src/app/api/admin/config/plans/route.ts` - API endpoint for plan configuration
- `src/app/api/admin/config/statuses/route.ts` - API endpoint for status/role configuration

### Features
- **Dynamic Plan Loading**: Plans are fetched from the database instead of being hardcoded
- **Config Caching**: 5-minute TTL cache for performance
- **Plan Display Names**: Automatically synced from database
- **Status/Role Enums**: Centralized constants for subscription statuses, user roles, template tiers, etc.

### Usage
```typescript
// In components
const response = await fetch('/api/admin/config/plans');
const { plans, planDisplayNames } = await response.json();

// In server-side code
import { getPlanConfig, invalidateConfigCache } from '@/lib/config/adminConfig';
const { plans, planDisplayNames } = await getPlanConfig();
```

### Cache Invalidation
Call `invalidateConfigCache()` after updating plans in the database to refresh the cache.

## Logging System

### Files Created
- `src/models/ActivityLog.ts` - MongoDB model for activity logs
- `src/lib/services/activityLogService.ts` - Service for logging activities
- `src/lib/utils/adminAuth.ts` - Helper for extracting admin context
- `src/lib/utils/apiLogger.ts` - API logging utilities
- `src/app/api/admin/logs/route.ts` - API endpoint for querying logs
- `src/app/api/admin/logs/metrics/route.ts` - API endpoint for log metrics
- `src/components/admin/LogsViewer.tsx` - Admin UI for viewing logs

### Log Types
The system supports the following log types:
- `api` - API requests
- `ai` - AI usage (tokens, costs)
- `user_action` - User actions (CV creation, exports, etc.)
- `admin_action` - Admin panel actions
- `payment` - Payment transactions
- `export` - File exports
- `system` - System events

### Logging Methods

#### Admin Actions
```typescript
import { ActivityLogService } from '@/lib/services/activityLogService';

await ActivityLogService.logAdminAction({
  adminUserId: 'admin_id',
  adminEmail: 'admin@example.com',
  action: 'granted_plan_pro_monthly',
  targetUserId: 'user_id',
  actionType: 'subscription_upgrade',
  resourceType: 'user',
  resourceId: 'user_id',
  status: 'success',
  metadata: { planKey: 'pro_monthly', interval: 'monthly' }
});
```

#### API Requests
```typescript
import { logAPIRequest } from '@/lib/utils/apiLogger';

await logAPIRequest(request, {
  userId: 'user_id',
  userEmail: 'user@example.com',
  ipAddress: '127.0.0.1'
}, {
  status: 200,
  responseTime: 150,
  requestSize: 1024,
  responseSize: 2048
});
```

#### AI Usage
```typescript
await ActivityLogService.logAI({
  userId: 'user_id',
  model: 'gpt-4',
  tokensUsed: 1500,
  cost: 0.045,
  action: 'generate_cv_summary',
  status: 'success'
});
```

### Log Retention
- **TTL Index**: Logs are automatically deleted after 90 days
- **Indexes**: Optimized for common queries (timestamp, logType, userId, status)

### Admin Logs Viewer
The LogsViewer component is accessible at:
- **Location**: Admin Dashboard → Analytics → System → Activity Logs
- **Features**:
  - Filter by log type, status, time range
  - Search by action
  - Expandable log details
  - Real-time metrics dashboard
  - Pagination

## Integrated Routes

The following admin API routes now have logging integrated:

1. **Admin Login** (`/api/admin/login`)
   - Logs successful logins
   - Logs failed login attempts (with reason)

2. **User Subscription Upgrade** (`/api/admin/users/[id]/subscription/upgrade`)
   - Logs when admin grants plans to users
   - Includes plan details and previous plan

3. **Campaign Management** (`/api/admin/email-campaigns/[id]`)
   - Logs campaign updates
   - Logs campaign deletions

## Next Steps (Optional)

1. **Add Logging to More Routes**:
   - Pricing plan updates
   - User management actions
   - Template management
   - Testimonial management

2. **Add API Request Logging Middleware**:
   - Automatically log all admin API requests
   - Track response times and errors

3. **Add User Action Logging**:
   - CV creation/updates
   - Export actions
   - AI feature usage

4. **Add Payment Logging**:
   - Payment success/failure
   - Subscription changes

5. **Real-time Log Streaming**:
   - WebSocket support for live log updates
   - Real-time alerts for critical errors

6. **Log Export**:
   - CSV/JSON export for audit trails
   - Scheduled reports

7. **Alert System**:
   - Notify admins of critical errors
   - Threshold-based alerts

## Configuration Updates

### Components Updated
- `UserManagement.tsx` - Now uses dynamic plan config
- `CampaignFilters.tsx` - Fetches plans from API
- `DiscountCodeManager.tsx` - Uses config for currencies
- `AdminKPIs.tsx` - Removed hardcoded fallback data

All components now fetch configuration dynamically, making the admin panel more maintainable and flexible.

