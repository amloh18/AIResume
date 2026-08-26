# Notification & SSE Subsystem Analysis Report

This document outlines the root causes of the Server-Sent Events (SSE) blocking error, toast notification delivery failures, and missed/snoozed notifications saving issues inside the AIResume application, along with architectural fixes to fully resolve them.

---

## 1. Root Causes of SSE and Notification Failures

### Cause A: Authentication Context Discrepancy & Route Blocking
In `NotificationContext.tsx`, the `isAuthenticated` flag is evaluated as:
```typescript
const isAuthenticated = isMounted &&
  !isAdminRoute &&
  !isPublicRoute &&
  status === 'authenticated' &&
  !!session?.user;
```
* **The Bug:** If a user navigates to `/dashboard/canvas` or other deep workspace views that are marked or treated in route config as static public landing parameters, or if the initialization checks fail before full hydration, `isAuthenticated` falls back to `false` even though Next-Auth session exists. This immediately triggers the SSE block:
  ```
  🚫 NotificationContext - SSE setup blocked: { isAuthenticated: false, status: 'authenticated' ... }
  ```

### Cause B: SSE Stream Blocking by Reverse Proxies & Hosting Platforms (Vercel / Cloudflare)
In `src/app/api/stream-notifications/route.ts`, standard Response streaming is used:
```typescript
return new Response(stream, {
    headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    },
});
```
* **The Bug (Vercel / Serverless Environments):** Vercel Serverless Functions have a maximum execution timeout (10-15s on Free, 60s on Pro) and buffering behaviors. Standard `ReadableStream` over a serverless function gets buffered or terminated, throwing connection resets and blocking SSE entirely (`EventSource failed`).
* **The Bug (Cloudflare/Nginx buffering):** If the response is not sent with `X-Accel-Buffering: no` or appropriate streaming headers, proxies buffer the chunked outputs, preventing real-time arrival of messages until the connection times out.

### Cause C: Absence of Local SQLite/IndexedDB or Persistent Synced Status for Missed Notifications
When a user is offline or closes their browser, notifications enqueued via `NotificationService.createNotification()` are sent via SSE. 
* **The Bug:** If SSE is closed (offline/snoozed), `notificationService` logs the skip but doesn't store state transitions for "In-App Drawer Pending" synchronization, causing missed notifications to never populate the slide-over notification panel.

---

## 2. Dynamic Architectural Fixes

### Fix A: Repair the Authentication Condition in `NotificationContext.tsx`
Decouple `isAuthenticated` from route flags so that SSE connects anytime a valid Next-Auth session exists, regardless of page-level route pathnames:
```typescript
const isAuthenticated = isMounted &&
  status === 'authenticated' &&
  !!session?.user;
```

### Fix B: Add Anti-Buffering Headers in `stream-notifications/route.ts`
Inject headers to instruct upstream CDNs and reverse proxies (like Cloudflare and Nginx) to bypass stream caching:
```typescript
return new Response(stream, {
    headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disables Nginx output buffering
        'Content-Encoding': 'none', // Prevents Gzip compression on stream
    },
});
```

### Fix C: Establish Database State Synchronization for Missed/Snoozed Notifications
When a notification fails delivery over active SSE streams, ensure the `Notification` model status in MongoDB transitions from `pending` to `snoozed` or `unread` with explicit tracking of delivery states, populating the notification drawer on the next page mount.

