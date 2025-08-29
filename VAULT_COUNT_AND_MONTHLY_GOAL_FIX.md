# Vault Count and Monthly Goal Fix

## Issues Fixed

### 1. Vault Job Count Issue
**Problem**: The vault was showing incorrect number of jobs saved because rejected jobs were being included in the count.

**Solution**: 
- Updated vault count calculation to exclude jobs with status 'rejected'
- Modified both the Analytics component and the analytics API
- Updated the useDashboardData hook to filter out rejected jobs

**Files Modified**:
- `src/components/dashboard/Analytics.tsx` - Fixed vault count calculation
- `src/app/api/analytics/route.ts` - Updated vaultCounts to exclude rejected jobs
- `src/lib/hooks/useDashboardData.ts` - Updated loadVaultCounts to filter rejected jobs

### 2. Monthly Goal Progress Enhancement
**Problem**: Career predictions showed a hardcoded monthly goal of 20 jobs without allowing users to set their own goal.

**Solution**:
- Added `monthlyGoal` field to User model with default value of 20
- Created API endpoint `/api/user/update-monthly-goal` for updating goals
- Enhanced PredictiveAnalyticsWidget with goal editing functionality
- Updated analytics API to use user's actual monthly goal

**Files Modified**:
- `src/models/User.ts` - Added monthlyGoal field to schema
- `src/app/api/user/update-monthly-goal/route.ts` - New API endpoint
- `src/app/api/analytics/route.ts` - Updated to use user's actual goal
- `src/components/dashboard/Analytics.tsx` - Enhanced PredictiveAnalyticsWidget

## New Features

### 1. Monthly Goal Setting
- Users can now set their own monthly job application goal (1-100 jobs)
- Goal is displayed in the Career Predictions widget
- Progress is calculated based on current month's job applications
- Real-time goal editing with save/cancel functionality

### 2. Enhanced Career Predictions
- Shows actual monthly goal instead of hardcoded value
- Displays current progress: "X / Y jobs" format
- Shows goal percentage completion
- Allows inline editing of monthly goal

### 3. Accurate Vault Counts
- Vault now shows only active jobs (excludes rejected ones)
- More accurate representation of user's job tracking
- Consistent across all dashboard components

## Technical Implementation

### User Model Changes
```typescript
// Added to User interface
monthlyGoal?: number; // Monthly job application goal

// Added to schema
monthlyGoal: {
  type: Number,
  default: 20, // Default goal of 20 jobs per month
  min: 1,
  max: 100
}
```

### API Endpoint
```typescript
// PUT /api/user/update-monthly-goal
{
  monthlyGoal: number // 1-100
}
```

### Analytics API Updates
```typescript
// Updated vaultCounts calculation
vaultCounts: {
  cvs: cvs.length,
  jobDescriptions: jobs.filter(job => job.status !== 'rejected').length,
  notes: Math.floor((cvs.length + jobs.filter(job => job.status !== 'rejected').length) * 0.3)
}

// Updated predictions with actual user goal
predictions: {
  monthlyGoalProgress: Math.min(100, (jobsThisMonth / user.monthlyGoal) * 100),
  monthlyGoal: user.monthlyGoal || 20,
  jobsThisMonth: jobsThisMonth
}
```

## Testing

Created test script `test-monthly-goal.js` to verify:
1. Monthly goal update functionality
2. Analytics data with updated goals
3. Vault counts excluding rejected jobs

## Benefits

1. **Better User Experience**: Users can set realistic goals based on their situation
2. **Accurate Tracking**: Vault shows only relevant jobs, not rejected ones
3. **Motivation**: Clear progress tracking toward personal goals
4. **Flexibility**: Goals can be adjusted as user's situation changes

## Migration Notes

- Existing users will have the default monthly goal of 20 jobs
- No data migration required for vault counts (filtering is applied at query time)
- All existing functionality remains intact
