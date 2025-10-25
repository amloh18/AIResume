# 📧 Email Campaign Feature - Complete Documentation

## Overview
A comprehensive email campaign management system for the admin panel that allows targeting users based on multiple criteria, creating draft campaigns, and managing email templates.

## Features Implemented

### ✅ 1. Database Schema
**Admin Database (`cvcircle_admin`):**
- `EmailCampaign` - Stores campaign details, targeting filters, and analytics
- `AdminUser` - Synced user data from main DB for campaign targeting

**Key Features:**
- Campaign status tracking (draft, scheduled, sent, cancelled)
- Detailed targeting filters
- Campaign analytics (sent, delivered, opened, clicked, bounced, unsubscribed)
- Template management
- Scheduling support

### ✅ 2. User Sync Service
**Location:** `src/lib/services/userSyncService.ts`

**Functions:**
- `syncUsersToAdmin()` - Syncs all users from main DB to admin DB
- `syncSingleUser(userId)` - Syncs a single user
- `getTargetedUsers(filters)` - Gets users matching campaign filters

**Synced Data:**
- Core user info (name, email, auth provider)
- Subscription details (plan, status, dates)
- Usage metrics (CVs created, journeys, exports, ATS checks)
- Activity tracking (last active, registration date)
- Email campaign history
- Deletion status

### ✅ 3. API Routes

**Campaign Management:**
- `GET /api/admin/email-campaigns` - List campaigns
- `POST /api/admin/email-campaigns` - Create campaign
- `GET /api/admin/email-campaigns/[id]` - Get single campaign
- `PUT /api/admin/email-campaigns/[id]` - Update campaign
- `DELETE /api/admin/email-campaigns/[id]` - Delete campaign
- `POST /api/admin/email-campaigns/preview-targets` - Preview targeted users

**User Sync:**
- `POST /api/admin/users/sync` - Trigger manual sync
- `GET /api/admin/users/sync` - Get sync status

### ✅ 4. UI Components

**EmailCampaignManager** (`src/components/admin/EmailCampaignManager.tsx`)
- Campaign list with search and filtering
- Status badges and performance metrics
- Sync user button with status display
- Create/edit/delete campaign actions
- Beautiful table layout matching the design

**CampaignEditor** (`src/components/admin/CampaignEditor.tsx`)
- Three-tab interface: Details, Content, Targeting
- Campaign name, subject, HTML content editor
- Schedule send functionality
- Live HTML preview mode
- Tag and notes support
- Target user count display

**CampaignFilters** (`src/components/admin/CampaignFilters.tsx`)
- Membership plan selection
- User age filters (new users by days)
- Registration date range
- Last active date range
- Usage metrics (CVs, journeys)
- Email verification status
- Include deleted users option
- Active filter summary

### ✅ 5. Targeting Filters

**Membership Plans:**
- Free, Basic, Premium, Enterprise
- Multi-select support

**User Age:**
- New users (last 7, 15, 30, 60, 90 days)
- Existing users (older than X days)

**Date Ranges:**
- Registration date range
- Last active date range

**Usage Metrics:**
- Min/Max CVs created
- Min/Max journeys completed

**Status Filters:**
- Email verified/not verified
- Include deleted users
- Active users only

**Special Rules:**
- Never targets unsubscribed users (built-in protection)
- Compound filtering (AND logic across filter types)

---

## Database Structure

### EmailCampaign Schema
```typescript
{
  campaignName: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  
  targetFilters: {
    membershipPlans?: string[];
    userAge?: { type: string, days: number };
    registrationDateRange?: { startDate, endDate };
    lastActiveRange?: { startDate, endDate };
    usageMetrics?: { minCVsCreated, maxCVsCreated, minJourneysCompleted, maxJourneysCompleted };
    emailVerified?: boolean;
    isDeleted?: boolean;
  };
  
  targetedUserCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  
  scheduledAt?: Date;
  sentAt?: Date;
  
  createdBy: ObjectId;
  createdByName: string;
  createdByEmail: string;
  
  tags?: string[];
  notes?: string;
}
```

### AdminUser Schema
```typescript
{
  mainUserId: ObjectId; // Reference to cvcircle.users._id
  email: string;
  firstName: string;
  lastName: string;
  
  authProvider: 'google' | 'firebase' | 'credentials';
  isEmailVerified: boolean;
  
  currentPlanKey: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'past_due';
  
  usage: {
    cvJourneyCount: number;
    cvCreatedCount: number;
    journeysCreated: number;
    exportCount: number;
    atsCheckCount: number;
  };
  
  lastActiveAt?: Date;
  registrationDate: Date;
  
  emailCampaigns: {
    received: number;
    opened: number;
    clicked: number;
    unsubscribed: boolean;
    unsubscribedAt?: Date;
  };
  
  isDeleted: boolean;
  lastSyncedAt: Date;
  syncVersion: number;
}
```

---

## Usage Guide

### 1. Initial Setup

**Sync Users:**
```bash
# Navigate to admin panel
http://localhost:3000/admin/email-campaigns

# Click "Sync Users" button
# This copies users from cvcircle.users to cvcircle_admin.users
```

**Verify Sync:**
- Check "Total Users" counter in UI
- Should match your user count from main database

### 2. Create Campaign

**Step 1: Details Tab**
1. Enter campaign name (e.g., "Summer Promotion 2024")
2. Enter email subject
3. Add tags (optional)
4. Add internal notes (optional)
5. Set schedule date (optional)

**Step 2: Content Tab**
1. Write HTML email content
2. Add plain text version (optional)
3. Click "Preview" to see rendered HTML
4. Use standard HTML email templates

**Step 3: Targeting Tab**
1. Select membership plans
2. Choose user age filter
3. Set date ranges
4. Configure usage metrics
5. Set verification/deletion filters
6. Click "Preview Users" to see count and sample

**Step 4: Save**
- "Save as Draft" - Save for later editing
- "Schedule" - Mark as ready to send (if date set)

### 3. Manage Campaigns

**View Campaigns:**
- Search by name or subject
- Filter by status (draft, scheduled, sent, cancelled)
- View performance metrics (for sent campaigns)

**Edit Campaign:**
- Click "Edit" icon
- Cannot edit sent campaigns (safety feature)
- Can edit drafts and scheduled campaigns

**Delete Campaign:**
- Click "Delete" icon
- Cannot delete sent campaigns
- Confirmation required

---

## Filter Examples

### Example 1: Target New Free Users
```json
{
  "membershipPlans": ["free"],
  "userAge": {
    "type": "new_users",
    "days": 7
  }
}
```
**Result:** Users who signed up in last 7 days on free plan

### Example 2: Target Inactive Premium Users
```json
{
  "membershipPlans": ["premium"],
  "lastActiveRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-06-01"
  }
}
```
**Result:** Premium users who haven't been active since June 2024

### Example 3: Target Power Users
```json
{
  "usageMetrics": {
    "minCVsCreated": 5,
    "minJourneysCompleted": 10
  }
}
```
**Result:** Users who created 5+ CVs and completed 10+ journeys

### Example 4: Target Win-Back (Deleted Users)
```json
{
  "isDeleted": true,
  "registrationDateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```
**Result:** Users who deleted their account in 2024

---

## Email Template Best Practices

### 1. HTML Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
  <style>
    /* Inline CSS for email clients */
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { background: #84cc16; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Hi {{firstName}}!</h1>
    <p>Your personalized message here...</p>
    <a href="{{actionLink}}" class="button">Take Action</a>
  </div>
</body>
</html>
```

### 2. Available Variables
- `{{firstName}}` - User's first name
- `{{lastName}}` - User's last name
- `{{email}}` - User's email
- `{{planKey}}` - Current plan
- `{{actionLink}}` - Link to app
- `{{unsubscribeLink}}` - Unsubscribe link (auto-added)

### 3. Design Tips
- Keep width under 600px
- Use inline CSS (not external stylesheets)
- Include plain text version
- Test in multiple email clients
- Always include unsubscribe link
- Use responsive images

---

## API Reference

### Create Campaign
```typescript
POST /api/admin/email-campaigns

Body: {
  campaignName: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  targetFilters: FilterObject;
  scheduledAt?: string; // ISO date
  tags?: string[];
  notes?: string;
}

Response: {
  success: boolean;
  campaign: Campaign;
  message: string;
}
```

### Preview Targets
```typescript
POST /api/admin/email-campaigns/preview-targets

Body: {
  targetFilters: FilterObject;
  limit?: number; // default 100
}

Response: {
  success: boolean;
  totalCount: number;
  previewCount: number;
  users: Array<{
    id, email, firstName, lastName, currentPlanKey, registrationDate
  }>;
}
```

### Sync Users
```typescript
POST /api/admin/users/sync

Response: {
  success: boolean;
  message: string;
  stats: {
    syncedCount: number;
    newUsers: number;
    updatedUsers: number;
    errors: number;
  };
  errors: string[];
}
```

---

## Performance Considerations

### Indexes
All critical fields are indexed for fast queries:
- `currentPlanKey`
- `registrationDate`
- `lastActiveAt`
- `isDeleted`
- `emailCampaigns.unsubscribed`
- Compound indexes for common filter combinations

### Sync Strategy
**Manual Sync:**
- Admins trigger via UI button
- Runs in background
- Updates existing users, creates new ones
- Preserves campaign tracking data

**Recommended Schedule:**
- Sync before creating campaigns
- Sync daily (can automate with cron)
- Sync after major user imports

### Query Optimization
- Uses `lean()` for read-only queries
- Pagination support (50 items per page)
- Targeted field projection
- Compound index support

---

## Security Features

### Authentication
- Admin role required for all endpoints
- Session validation via NextAuth
- CSRF protection

### Data Protection
- Never targets unsubscribed users
- Cannot edit sent campaigns
- Cannot delete sent campaigns
- Audit trail (createdBy tracking)

### Validation
- Required fields enforced
- Status transitions validated
- Filter sanitization
- XSS protection in HTML content

---

## Future Enhancements (Optional)

### 1. Email Sending Integration
- Integrate with SendGrid, Mailgun, or AWS SES
- Batch sending with rate limiting
- Delivery status tracking
- Bounce handling

### 2. Advanced Analytics
- Open rate tracking
- Click tracking
- Heat maps
- A/B testing

### 3. Template Library
- Pre-built email templates
- Template versioning
- Template marketplace
- Drag-and-drop editor

### 4. Automation
- Triggered campaigns (e.g., welcome emails)
- Drip campaigns
- Behavioral triggers
- Auto-sync scheduling

### 5. Segmentation
- Save filter presets
- User segments
- Dynamic segments
- Segment analytics

---

## Troubleshooting

### Issue: Users not syncing
**Solution:**
1. Check admin database connection
2. Verify MONGODB_ADMIN_URI in .env
3. Check console for errors
4. Ensure users exist in main DB

### Issue: Targeted user count is 0
**Solution:**
1. Click "Preview Users" to verify filters
2. Check if filters are too restrictive
3. Ensure users are synced (click Sync Users)
4. Verify unsubscribed users aren't being excluded

### Issue: Cannot edit campaign
**Solution:**
- Sent campaigns cannot be edited (by design)
- Create a duplicate campaign instead
- Check campaign status

### Issue: HTML preview not working
**Solution:**
1. Check for malformed HTML
2. Use inline CSS only
3. Test HTML separately
4. Check browser console for errors

---

## Testing Checklist

- [ ] Create draft campaign
- [ ] Preview targeted users
- [ ] Edit draft campaign
- [ ] Delete draft campaign
- [ ] Schedule campaign
- [ ] View campaign list
- [ ] Search campaigns
- [ ] Filter by status
- [ ] Sync users manually
- [ ] Test all filter combinations
- [ ] Preview HTML content
- [ ] Check mobile responsiveness

---

## Files Created

### Models
- `src/models/admin/EmailCampaign.ts`
- `src/models/admin/AdminUser.ts`
- `src/models/admin-models.ts` (updated)

### Services
- `src/lib/services/userSyncService.ts`

### API Routes
- `src/app/api/admin/email-campaigns/route.ts`
- `src/app/api/admin/email-campaigns/[id]/route.ts`
- `src/app/api/admin/email-campaigns/preview-targets/route.ts`
- `src/app/api/admin/users/sync/route.ts`

### Components
- `src/components/admin/EmailCampaignManager.tsx`
- `src/components/admin/CampaignEditor.tsx`
- `src/components/admin/CampaignFilters.tsx`

### Pages
- `src/app/admin/email-campaigns/page.tsx`

---

## Summary

✅ **Complete email campaign system with:**
- User syncing from main DB to admin DB
- Comprehensive targeting filters
- Draft campaign support
- HTML email editor with preview
- Beautiful UI matching design
- Performance optimized with indexes
- Security features (admin-only, can't edit sent)
- Extensible architecture

**Ready to use!** Navigate to `/admin/email-campaigns` to start creating campaigns.

