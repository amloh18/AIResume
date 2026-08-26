# AIResume Tracker & Integration Documentation

## Table of Contents
1. [Overview](#overview)
2. [Tracker Stage Logic & Discrepancies](#tracker-stage-logic--discrepancies)
3. [Calendar Synchronization](#calendar-synchronization)
4. [Email Synchronization](#email-synchronization)
5. [API Reference](#api-reference)
6. [Implementation Details](#implementation-details)
7. [Known Issues & Fixes](#known-issues--fixes)

---

## Overview

The AIResume tracker system manages job applications through multiple stages, integrating with external services for calendar events and email communication. This document outlines the logical flow, identified discrepancies, and the complete synchronization implementation for Google Calendar, Gmail, and Outlook.

### Stage Flow
```
DRAFT → CREATED → APPLIED/SCREENING → INTERVIEW → OFFER → ACCEPTED/REJECTED/WITHDRAWN
```

---

## Tracker Stage Logic & Discrepancies

### 1.1 Stage Definitions

| Stage | Description | Next Actions |
|-------|-------------|--------------|
| `draft` | Job created but not started | Move to Created |
| `created` | Documents being generated | Edit CV, Continue Journey |
| `applied` | Application submitted | Resume Documents, View Insights |
| `screening` | Under recruiter review | Resume Documents, View Insights |
| `interview` | Interview scheduled | Open Interview Prep |
| `offer` | Offer received | View Full Details, Open Journey |
| `accepted` | Offer accepted | Archive Job |
| `rejected` | Application rejected | Duplicate Job |
| `withdrawn` | Application withdrawn | Duplicate Job |

### 1.2 Identified Discrepancies

#### CRITICAL: Calendar Duplicate Event Bug
**File:** `src/lib/services/calendarService.ts`
**Issue:** `extractJobIdFromEvent()` looks for `Job ID: (\w+)` in event description, but `getEventDescription()` never writes a `Job ID:` line.
**Impact:** Every sync creates duplicate events instead of updating existing ones.
**Fix:** Implemented in `unifiedCalendarSync.ts` using `extendedProperties.private.cvcircleJobId`.

#### HIGH: Calendar Sync Excludes `created` Status
**File:** `src/app/api/calendar/sync/route.ts`
**Issue:** `status: { $ne: 'created' }` excludes jobs at the `created` stage from calendar sync.
**Impact:** Users with draft jobs that have deadlines miss calendar reminders.
**Fix:** Added `syncSettings.includeCreated` flag to `unifiedCalendarSync.ts`.

#### MEDIUM: Email Send Reply Not Actually Sending
**File:** `src/app/api/tracker/emails/route.ts`
**Issue:** `send_reply` only logs to `EmailMessage` without calling SMTP/API to deliver email.
**Fix:** Implemented actual sending in `unifiedEmailSync.ts` with Gmail API, Outlook Graph, and SMTP support.

#### MEDIUM: Outlook Calendar Not Implemented
**File:** `src/models/UserSettings.ts`
**Issue:** `calendar.provider` supports `'outlook'` but no Microsoft Graph Calendar code exists.
**Fix:** Added full Outlook Calendar sync in `unifiedCalendarSync.ts`.

#### MEDIUM: Stage Classification Mismatch
**Issue:** `EmailMessage.stageClassification` uses enum values like `INTERVIEW_SCHEDULED` but stage update sends raw strings like `interview`.
**Fix:** Normalized mapping added in `unifiedEmailSync.ts`.

#### MEDIUM: Mock Emails Bypass Connection State
**File:** `src/app/api/tracker/emails/route.ts`
**Issue:** Mock emails seeded on first visit regardless of connection state.
**Fix:** Mock seeding now respects `syncStatus === 'connected'` and only runs for demo accounts.

---

## Calendar Synchronization

### 2.1 Unified Calendar Sync Service

**File:** `src/lib/services/unifiedCalendarSync.ts`

Supports both Google Calendar and Outlook Calendar via Microsoft Graph.

```typescript
interface CalendarSyncEvent {
  jobId: string;
  title: string;
  company: string;
  status: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  colorId?: string;
  reminders?: { method: 'email' | 'popup'; minutes: number }[];
}

interface CalendarSyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
  provider: 'google' | 'outlook';
}
```

### 2.2 Google Calendar Implementation

- Uses `googleapis` library with OAuth2
- Events tagged with `extendedProperties.private.cvcircleJobId` for deduplication
- Color-coded by job status
- Supports custom reminders

### 2.3 Outlook Calendar Implementation

- Uses Microsoft Graph API (`https://graph.microsoft.com/v1.0`)
- Events created with `categories: ['CVCircle-{colorId}']` for identification
- Supports reminders via Graph API
- Full CRUD operations

### 2.4 Sync Logic

1. Fetch existing events with AIResume markers
2. Build map of `jobId → event`
3. For each job:
   - If event exists → UPDATE
   - If not → CREATE
4. Delete events for jobs no longer in system
5. Update `lastSync` timestamp

---

## Email Synchronization

### 3.1 Unified Email Sync Service

**File:** `src/lib/services/unifiedEmailSync.ts`

Supports Gmail API, Outlook Graph API, and IMAP/SMTP.

```typescript
interface EmailSyncMessage {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  from: { email: string; name?: string };
  to: { email: string; name?: string }[];
  receivedAt: Date;
  direction: 'inbound' | 'outbound';
  hasAttachments: boolean;
  stageClassification?: string;
  isRead: boolean;
}

interface EmailSyncResult {
  success: boolean;
  provider: 'gmail' | 'outlook' | 'imap';
  emailAddress: string;
  syncedCount: number;
  errors: string[];
  messages: EmailSyncMessage[];
}
```

### 3.2 Gmail Implementation

- Uses Gmail REST API (`gmail/v1/users/me/messages`)
- Fetches messages with query: `subject:"Job Application" OR subject:"Interview"`
- Supports sending via `messages.send` endpoint
- Thread support via `threadId`

### 3.3 Outlook Implementation

- Uses Microsoft Graph API (`/me/mailFolders/inbox/messages`)
- Fetches with `$select` and `$orderby`
- Sends via `/me/sendMail`
- Conversation threading via `conversationId`

### 3.4 Sending Flow

1. Validate connected account exists
2. Call provider-specific send method
3. Log outbound message to `EmailMessage`
4. Update `EmailThread` metadata
5. Return message ID

---

## API Reference

### 4.1 Calendar Sync

#### `POST /api/sync/calendar`
Sync job applications to connected calendar.

**Headers:** `Authorization: Bearer {session}`

**Request Body:**
```json
{
  // Optional - uses stored tokens if omitted
  "accessToken": "string",
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "success": true,
  "provider": "google",
  "syncedCount": 5,
  "created": 2,
  "updated": 3,
  "deleted": 0,
  "errors": []
}
```

#### `GET /api/sync/calendar`
Get calendar connection status.

**Response:**
```json
{
  "success": true,
  "connected": true,
  "provider": "google",
  "lastSync": "2024-01-01T00:00:00.000Z",
  "syncEnabled": true,
  "syncSettings": {
    "includeCreated": true,
    "includeInterviews": true,
    "includeFollowUps": true,
    "includeDeadlines": true,
    "reminderMinutes": 60,
    "colorCoding": true
  }
}
```

#### `DELETE /api/sync/calendar`
Disconnect calendar integration.

---

### 4.2 Email Sync

#### `POST /api/sync/email`

**Actions:**

##### `connect`
```json
{
  "action": "connect",
  "provider": "gmail",
  "emailAddress": "user@gmail.com",
  "accessToken": "string",
  "refreshToken": "string",
  "expiresAt": "2024-01-01T00:00:00.000Z"
}
```

For IMAP:
```json
{
  "action": "connect",
  "provider": "imap",
  "emailAddress": "user@domain.com",
  "imapHost": "imap.domain.com",
  "imapPort": 993,
  "smtpHost": "smtp.domain.com",
  "smtpPort": 465,
  "password": "app-password"
}
```

##### `sync`
```json
{
  "action": "sync",
  "jobId": "string"
}
```

##### `send`
```json
{
  "action": "send",
  "jobId": "string",
  "threadId": "string",
  "subject": "Re: Interview",
  "bodyText": "Thank you...",
  "recipientEmail": "recruiter@company.com",
  "recipientName": "Jane Smith"
}
```

##### `disconnect`
```json
{
  "action": "disconnect"
}
```

---

## Implementation Details

### 5.1 Environment Variables

```env
# Google Calendar
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/calendar/callback

# Microsoft Graph (Outlook)
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_REDIRECT_URI=https://your-domain.com/api/tracker/emails/auth/callback

# SMTP (for transactional emails)
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-sendgrid-api-key
```

### 5.2 Database Models

#### `UserSettings.calendar` (in `UserSettings` model)
```typescript
calendar: {
  connected: boolean;
  provider: 'google' | 'outlook' | 'apple';
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  lastSync?: Date;
  syncEnabled: boolean;
  syncSettings: {
    includeCreated?: boolean;
    includeInterviews: boolean;
    includeFollowUps: boolean;
    includeDeadlines: boolean;
    reminderMinutes: number;
    colorCoding: boolean;
  };
}
```

#### `EmailAccount` (in `TrackerEmail` model)
```typescript
{
  userId: ObjectId;
  provider: 'gmail' | 'outlook' | 'imap';
  emailAddress: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  tokenExpiresAt?: Date;
  lastSyncedAt?: Date;
  syncStatus: 'connected' | 'expired' | 'error' | 'disconnected';
  imapHost?: string;
  imapPort?: number;
  smtpHost?: string;
  smtpPort?: number;
  password?: string;
}
```

### 5.3 Frontend Integration

#### Calendar Sync Settings
**File:** `src/components/settings/CalendarSyncSettings.tsx`

- Connect/Disconnect button
- Sync Now button
- Enable/disable auto-sync
- Include/exclude job stages
- Reminder time slider
- Color coding toggle

#### Email Connect Modal
**File:** `src/components/dashboard/jobs/EmailConnectModal.tsx`

- Tab switcher: Email / Calendar
- Provider selection: Gmail, Outlook, IMAP
- OAuth popup flow
- Success/error states
- Connection status display

### 5.4 Stage-to-Calendar Mapping

| Stage | Color (Google) | Color (Outlook Category) |
|-------|---------------|-------------------------|
| `created` | Blue (1) | CVCircle-1 |
| `applied` | Green (2) | CVCircle-2 |
| `screening` | Purple (3) | CVCircle-3 |
| `interview` | Orange (4) | CVCircle-4 |
| `offer` | Red (5) | CVCircle-5 |
| `rejected` | Yellow (6) | CVCircle-6 |
| `accepted` | Turquoise (7) | CVCircle-7 |
| `withdrawn` | Gray (8) | CVCircle-8 |

---

## Known Issues & Fixes

### 6.1 Fixed Issues

| Issue | Status | Fix |
|-------|--------|-----|
| Calendar duplicate events | ✅ Fixed | Used `extendedProperties.private.cvcircleJobId` |
| Created jobs excluded from sync | ✅ Fixed | Added `syncSettings.includeCreated` flag |
| Email send not delivering | ✅ Fixed | Implemented provider-specific send methods |
| Outlook Calendar missing | ✅ Fixed | Added Microsoft Graph sync in `unifiedCalendarSync.ts` |
| Mock emails shown when disconnected | ✅ Fixed | Mock seeding respects connection state |
| Stage classification mismatch | ✅ Fixed | Normalized enum mapping |

### 6.2 Pending Improvements

| Issue | Priority | Description |
|-------|----------|-------------|
| Background auto-sync | Medium | No cron job for automatic calendar/email sync |
| IMAP real-time fetch | Low | IMAP polling not implemented (requires server-side IMAP library) |
| Token refresh handling | Medium | Access token expiry not automatically refreshed |
| Multi-calendar support | Low | Only `primary` calendar is synced |
| Push notifications | Low | No webhook/push for new emails or calendar changes |

---

## Usage Examples

### 7.1 Sync Calendar from Frontend

```typescript
const response = await fetch('/api/sync/calendar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accessToken: userSettings.calendar.accessToken,
    refreshToken: userSettings.calendar.refreshToken,
  }),
});

const result = await response.json();
console.log(`Synced ${result.created} created, ${result.updated} updated`);
```

### 7.2 Connect Gmail

```typescript
// 1. Get auth URL
const authResponse = await fetch('/api/tracker/emails/auth?provider=gmail');
const { authUrl } = await authResponse.json();

// 2. Open popup
const popup = window.open(authUrl, 'gmail-auth', 'width=500,height=600');

// 3. Listen for success
window.addEventListener('message', (event) => {
  if (event.data.type === 'email-sync-success') {
    console.log('Connected:', event.data.emailAddress);
  }
});
```

### 7.3 Send Email via Tracker

```typescript
const response = await fetch('/api/sync/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send',
    jobId: 'job123',
    threadId: 'thread456',
    subject: 'Re: Interview Invitation',
    bodyText: 'Thank you for the opportunity...',
    recipientEmail: 'recruiter@company.com',
    recipientName: 'Jane Smith',
  }),
});
```

---

## Security Considerations

1. **OAuth Tokens**: Stored encrypted in database (encryption recommended for production)
2. **Scope Minimization**: Gmail uses `gmail.readonly` + `userinfo.email`; Calendar uses `calendar` + `calendar.events`
3. **Token Refresh**: Implement automatic refresh before expiry
4. **Rate Limiting**: Respect provider rate limits (Gmail: 250 queries/100s per user)
5. **Data Privacy**: Email content stored only for logged-in user, linked to jobId
6. **Environment Variables**: Never expose client secrets in frontend code

---

## Testing

### 8.1 Calendar Sync Test
```bash
# Trigger sync
curl -X POST https://your-domain.com/api/sync/calendar \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json"
```

### 8.2 Email Sync Test
```bash
# Sync messages
curl -X POST https://your-domain.com/api/sync/email \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{"action":"sync","jobId":"job123"}'

# Send email
curl -X POST https://your-domain.com/api/sync/email \
  -H "Authorization: Bearer {session_token}" \
  -H "Content-Type: application/json" \
  -d '{"action":"send","recipientEmail":"test@example.com","subject":"Test","bodyText":"Hello"}'
```

---

*Document generated for AIResume Tracker Integration v2.0*
